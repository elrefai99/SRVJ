import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import WS from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

vi.mock("./auth", () => ({
     authenticateFromRequest: vi.fn(async () => ({ userId: 1 })),
     siteIdFromUrl: (url: string) => url.split("/").filter(Boolean).pop() as string,
     authorizeDiagramAccess: vi.fn(async (userId: number, siteId: string) => ({
          userId,
          diagramId: `diag-${siteId}`,
          siteId,
          projectId: 1,
          role: "OWNER",
     })),
}));

const stored: { diagramId: string; siteId: string; nodes: unknown }[] = [];
vi.mock("./persistence", () => ({
     loadDocument: vi.fn(async () => {}),
     storeDocument: vi.fn(async (diagramId: string, siteId: string, doc: Y.Doc) => {
          stored.push({ diagramId, siteId, nodes: doc.getArray("nodes").toJSON() });
     }),
}));

vi.mock("../app.config", () => ({ allowedOrigins: [] }));

vi.mock("./env", () => ({
     COOKIE_NAME_ACCESS: "access_token",
     COLLAB_PATH_PREFIX: "/collab",
     COLLAB_DEBOUNCE: 100,
     COLLAB_MAX_DEBOUNCE: 500,
}));

import { attachCollab } from "./index";

let server: http.Server;
let port: number;

beforeAll(async () => {
     server = http.createServer();
     attachCollab(server);
     await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
     port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
     await new Promise<void>((resolve) => server.close(() => resolve()));
});

function connect(room: string) {
     const doc = new Y.Doc();
     const provider = new WebsocketProvider(`ws://127.0.0.1:${port}/collab`, room, doc, {
          WebSocketPolyfill: WS as unknown as typeof WebSocket,
          connect: true,
     });
     return { doc, provider };
}

function waitFor(check: () => boolean, timeout = 5000): Promise<void> {
     return new Promise((resolve, reject) => {
          const started = Date.now();
          const tick = () => {
               if (check()) return resolve();
               if (Date.now() - started > timeout) return reject(new Error("timeout"));
               setTimeout(tick, 25);
          };
          tick();
     });
}

describe("collab CRDT sync", () => {
     it("propagates a node edit to other users in the same board and persists it", async () => {
          const a = connect("3f0c1f7a-9b3a-4f2e-8b1d-2a1c4e5f6a7b");
          const b = connect("3f0c1f7a-9b3a-4f2e-8b1d-2a1c4e5f6a7b");

          await waitFor(() => a.provider.synced && b.provider.synced);

          a.doc.getArray("nodes").push([{ id: "n1", label: "from-A" }]);

          await waitFor(() => b.doc.getArray("nodes").length === 1);
          expect(b.doc.getArray("nodes").toJSON()).toEqual([{ id: "n1", label: "from-A" }]);

          await waitFor(() => stored.some((s) => Array.isArray(s.nodes) && (s.nodes as unknown[]).length === 1));
          const persisted = stored.find((s) => Array.isArray(s.nodes) && (s.nodes as unknown[]).length === 1)!;
          expect(persisted.siteId).toBe("3f0c1f7a-9b3a-4f2e-8b1d-2a1c4e5f6a7b");

          a.provider.destroy();
          b.provider.destroy();
     });

     it("isolates boards: edits do not leak across diagrams", async () => {
          const a = connect("11111111-1111-4111-8111-111111111111");
          const b = connect("22222222-2222-4222-8222-222222222222");

          await waitFor(() => a.provider.synced && b.provider.synced);

          a.doc.getArray("nodes").push([{ id: "only-A" }]);
          await waitFor(() => a.doc.getArray("nodes").length === 1);
          await new Promise((r) => setTimeout(r, 300));

          expect(b.doc.getArray("nodes").length).toBe(0);

          a.provider.destroy();
          b.provider.destroy();
     });
});
