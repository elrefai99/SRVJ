import type { Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { collab } from "./server";
import { authenticateFromRequest, siteIdFromUrl, authorizeDiagramAccess } from "./auth";
import type { CollabContext } from "./auth";
import { COLLAB_PATH_PREFIX } from "./env";
import { allowedOrigins } from "../app.config";
import { createLogger } from "../utils/logger";

const log = createLogger("collab");

const CLOSE_INVALID_ID = 4400;
const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_FORBIDDEN = 4403;
const CLOSE_NOT_FOUND = 4404;

interface Denial {
     code: number;
     reason: string;
}

function originAllowed(origin?: string): boolean {
     if (!origin || origin === "null") return true;
     return allowedOrigins.includes(origin);
}

function denialFor(message: string): Denial {
     if (message === "missing access token" || message === "invalid access token") {
          return { code: CLOSE_UNAUTHORIZED, reason: "unauthorized" };
     }
     if (message === "not found") return { code: CLOSE_NOT_FOUND, reason: "diagram not found" };
     return { code: CLOSE_FORBIDDEN, reason: "forbidden" };
}

function rejectHandshake(socket: Duplex, status: number, message: string): void {
     socket.write(`HTTP/1.1 ${status} ${message}\r\n\r\n`);
     socket.destroy();
}

export function attachCollab(server: HttpServer): void {
     const wss = new WebSocketServer({ noServer: true });

     server.on("upgrade", (request, socket, head) => {
          if (!request.url || !request.url.startsWith(COLLAB_PATH_PREFIX)) return;

          const path = new URL(request.url, "http://internal").pathname;

          const finalize = (context: CollabContext | null, denial: Denial | null): void => {
               wss.handleUpgrade(request, socket, head, (ws) => {
                    if (context) {
                         collab.handleConnection(ws, context);
                         return;
                    }
                    ws.close(denial?.code ?? CLOSE_FORBIDDEN, denial?.reason ?? "forbidden");
               });
          };

          void (async () => {
               if (!originAllowed(request.headers.origin)) {
                    log.warn({ msg: "collab upgrade rejected", path, reason: "origin not allowed" });
                    rejectHandshake(socket, 403, "Forbidden");
                    return;
               }

               let siteId: string;
               try {
                    siteId = siteIdFromUrl(request.url);
               } catch {
                    log.warn({ msg: "collab upgrade denied", path, reason: "invalid diagram id" });
                    finalize(null, { code: CLOSE_INVALID_ID, reason: "invalid diagram id" });
                    return;
               }

               try {
                    const { userId } = await authenticateFromRequest(request);
                    const context = await authorizeDiagramAccess(userId, siteId);
                    finalize(context, null);
               } catch (err) {
                    const reason = err instanceof Error ? err.message : String(err);
                    log.warn({ msg: "collab upgrade denied", path, reason });
                    finalize(null, denialFor(reason));
               }
          })();
     });
}
