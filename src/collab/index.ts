import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import { collab } from "./server";
import { authenticateFromRequest, siteIdFromUrl, authorizeDiagramAccess } from "./auth";
import { COLLAB_PATH_PREFIX } from "./env";
import { allowedOrigins } from "../app.config";
import { createLogger } from "../utils/logger";

const log = createLogger("collab");

function originAllowed(origin?: string): boolean {
     if (!origin || origin === "null") return true;
     return allowedOrigins.includes(origin);
}

export function attachCollab(server: HttpServer): void {
     const wss = new WebSocketServer({ noServer: true });

     server.on("upgrade", (request, socket, head) => {
          if (!request.url || !request.url.startsWith(COLLAB_PATH_PREFIX)) return;

          void (async () => {
               try {
                    if (!originAllowed(request.headers.origin)) throw new Error("origin not allowed");

                    const siteId = siteIdFromUrl(request.url);
                    const { userId } = await authenticateFromRequest(request);
                    const context = await authorizeDiagramAccess(userId, siteId);

                    wss.handleUpgrade(request, socket, head, (ws) => {
                         collab.handleConnection(ws, context);
                    });
               } catch (err) {
                    const path = new URL(request.url ?? "", "http://internal").pathname;
                    log.warn({ msg: "collab upgrade rejected", path, reason: err instanceof Error ? err.message : String(err) });
                    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                    socket.destroy();
               }
          })();
     });
}
