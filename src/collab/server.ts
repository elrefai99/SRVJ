import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { WebSocket } from "ws";
import { loadDocument, storeDocument } from "./persistence";
import { createLogger } from "../utils/logger";
import { COLLAB_DEBOUNCE, COLLAB_MAX_DEBOUNCE } from "./env";
import { canWriteDiagram } from "./role";
import type { CollabContext } from "./auth";
import { onRemoteUpdate, publishCollabUpdate, REMOTE_ORIGIN } from "./redis";

const log = createLogger("collab");

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const PING_TIMEOUT = 30000;
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_MESSAGES = 200;

const rooms = new Map<string, Room>();
const rateLimitState = new WeakMap<WebSocket, { windowStart: number; count: number }>();

onRemoteUpdate((siteId, update) => {
     const room = rooms.get(siteId);
     if (room) Y.applyUpdate(room.doc, update, REMOTE_ORIGIN);
});

function isRateLimited(conn: WebSocket): boolean {
     const now = Date.now();
     const state = rateLimitState.get(conn);
     if (!state || now - state.windowStart >= RATE_LIMIT_WINDOW_MS) {
          rateLimitState.set(conn, { windowStart: now, count: 1 });
          return false;
     }
     state.count += 1;
     return state.count > RATE_LIMIT_MAX_MESSAGES;
}

function send(room: Room, conn: WebSocket, message: Uint8Array): void {
     if (conn.readyState !== WebSocket.CONNECTING && conn.readyState !== WebSocket.OPEN) {
          closeConn(room, conn);
          return;
     }
     try {
          conn.send(message, (err) => err && closeConn(room, conn));
     } catch {
          closeConn(room, conn);
     }
}

function broadcast(room: Room, message: Uint8Array): void {
     room.conns.forEach((_ids, conn) => send(room, conn, message));
}

function closeConn(room: Room, conn: WebSocket): void {
     if (room.conns.has(conn)) {
          const controlledIds = room.conns.get(conn) as Set<number>;
          room.conns.delete(conn);
          awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null);
          if (room.conns.size === 0) {
               void room.persist().finally(() => {
                    room.doc.destroy();
                    rooms.delete(room.name);
               });
          }
     }
     try {
          conn.close();
     } catch {
          // already closed
     }
}

class Room {
     name: string;
     diagramId: string;
     siteId: string;
     doc: Y.Doc;
     awareness: awarenessProtocol.Awareness;
     conns = new Map<WebSocket, Set<number>>();
     ready: Promise<void>;
     private saveTimer: NodeJS.Timeout | null = null;
     private firstPendingEditAt = 0;

     constructor(context: CollabContext) {
          this.name = context.siteId;
          this.diagramId = context.diagramId;
          this.siteId = context.siteId;
          this.doc = new Y.Doc();
          this.awareness = new awarenessProtocol.Awareness(this.doc);
          this.awareness.setLocalState(null);
          this.ready = loadDocument(this.diagramId, this.doc).catch((err) => {
               log.error({ msg: "collab load failed", diagramId: this.diagramId, error: err instanceof Error ? err.message : String(err) });
          });

          this.doc.on("update", (update: Uint8Array, origin: unknown) => {
               const encoder = encoding.createEncoder();
               encoding.writeVarUint(encoder, MESSAGE_SYNC);
               syncProtocol.writeUpdate(encoder, update);
               broadcast(this, encoding.toUint8Array(encoder));
               this.schedulePersist();
               if (origin !== REMOTE_ORIGIN) {
                    void publishCollabUpdate(this.siteId, update);
               }
          });

          this.awareness.on(
               "update",
               ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
                    const changed = added.concat(updated, removed);
                    if (origin instanceof WebSocket) {
                         const ids = this.conns.get(origin);
                         if (ids) {
                              added.forEach((id) => ids.add(id));
                              removed.forEach((id) => ids.delete(id));
                         }
                    }
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
                    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed));
                    broadcast(this, encoding.toUint8Array(encoder));
               },
          );
     }

     private schedulePersist(): void {
          const now = Date.now();
          if (this.firstPendingEditAt === 0) this.firstPendingEditAt = now;
          if (now - this.firstPendingEditAt >= COLLAB_MAX_DEBOUNCE) {
               void this.persist();
               return;
          }
          if (this.saveTimer) clearTimeout(this.saveTimer);
          this.saveTimer = setTimeout(() => void this.persist(), COLLAB_DEBOUNCE);
     }

     async persist(): Promise<void> {
          if (this.saveTimer) {
               clearTimeout(this.saveTimer);
               this.saveTimer = null;
          }
          this.firstPendingEditAt = 0;
          try {
               await storeDocument(this.diagramId, this.siteId, this.doc);
          } catch (err) {
               log.error({ msg: "collab persist failed", diagramId: this.diagramId, error: err instanceof Error ? err.message : String(err) });
          }
     }
}

function getRoom(context: CollabContext): Room {
     let room = rooms.get(context.siteId);
     if (!room) {
          room = new Room(context);
          rooms.set(context.siteId, room);
     }
     return room;
}

function readSyncGated(
     decoder: decoding.Decoder,
     encoder: encoding.Encoder,
     doc: Y.Doc,
     conn: WebSocket,
     canWrite: boolean,
): void {
     const messageType = decoding.readVarUint(decoder);
     switch (messageType) {
          case syncProtocol.messageYjsSyncStep1:
               syncProtocol.readSyncStep1(decoder, encoder, doc);
               break;
          case syncProtocol.messageYjsSyncStep2:
          case syncProtocol.messageYjsUpdate:
               if (!canWrite) break;
               syncProtocol.readUpdate(decoder, doc, conn);
               break;
     }
}

function messageListener(room: Room, conn: WebSocket, message: Uint8Array, canWrite: boolean): void {
     try {
          const decoder = decoding.createDecoder(message);
          const messageType = decoding.readVarUint(decoder);
          switch (messageType) {
               case MESSAGE_SYNC: {
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, MESSAGE_SYNC);
                    readSyncGated(decoder, encoder, room.doc, conn, canWrite);
                    if (encoding.length(encoder) > 1) send(room, conn, encoding.toUint8Array(encoder));
                    break;
               }
               case MESSAGE_AWARENESS: {
                    awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), conn);
                    break;
               }
          }
     } catch (err) {
          log.error({ msg: "collab message error", error: err instanceof Error ? err.message : String(err) });
     }
}

async function setupConnection(conn: WebSocket, room: Room, canWrite: boolean): Promise<void> {
     conn.binaryType = "arraybuffer";
     room.conns.set(conn, new Set<number>());

     let alive = true;
     const pingInterval = setInterval(() => {
          if (!alive) {
               closeConn(room, conn);
               clearInterval(pingInterval);
               return;
          }
          if (room.conns.has(conn)) {
               alive = false;
               try {
                    conn.ping();
               } catch {
                    closeConn(room, conn);
                    clearInterval(pingInterval);
               }
          }
     }, PING_TIMEOUT);

     conn.on("pong", () => {
          alive = true;
     });
     conn.on("message", (data: ArrayBuffer) => {
          if (isRateLimited(conn)) {
               log.warn({ msg: "collab connection rate-limited", diagramId: room.diagramId });
               closeConn(room, conn);
               return;
          }
          messageListener(room, conn, new Uint8Array(data), canWrite);
     });
     conn.on("close", () => {
          rateLimitState.delete(conn);
          closeConn(room, conn);
          clearInterval(pingInterval);
     });

     await room.ready;

     const syncEncoder = encoding.createEncoder();
     encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
     syncProtocol.writeSyncStep1(syncEncoder, room.doc);
     send(room, conn, encoding.toUint8Array(syncEncoder));

     const states = room.awareness.getStates();
     if (states.size > 0) {
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())));
          send(room, conn, encoding.toUint8Array(awarenessEncoder));
     }
}

export const collab = {
     handleConnection(conn: WebSocket, context: CollabContext): void {
          void setupConnection(conn, getRoom(context), canWriteDiagram(context.role));
     },
};

export async function shutdownCollab(): Promise<void> {
     await Promise.all(Array.from(rooms.values()).map((room) => room.persist()));
}

export async function invalidateRoom(siteId: string, freshDiagram: { nodes?: unknown; edges?: unknown; metadata?: unknown }): Promise<void> {
     const room = rooms.get(siteId);
     if (!room) return;

     await room.ready;
     room.doc.transact(() => {
          const nodes = room.doc.getArray("nodes");
          const edges = room.doc.getArray("edges");
          const metadata = room.doc.getMap("metadata");
          nodes.delete(0, nodes.length);
          edges.delete(0, edges.length);
          metadata.clear();
          if (Array.isArray(freshDiagram.nodes) && freshDiagram.nodes.length) nodes.push(freshDiagram.nodes);
          if (Array.isArray(freshDiagram.edges) && freshDiagram.edges.length) edges.push(freshDiagram.edges);
          if (freshDiagram.metadata && typeof freshDiagram.metadata === "object") {
               for (const [key, value] of Object.entries(freshDiagram.metadata)) metadata.set(key, value);
          }
     });
}
