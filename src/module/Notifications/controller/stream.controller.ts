import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { clients } from "../utils/client";
import { SSEClient } from "../@types";

export const streamController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const userId = String(req.user?.id)
          // SSE headers
          res.writeHead(200, {
               'Content-Type': 'text/event-stream',
               'Cache-Control': 'no-cache',
               'Connection': 'keep-alive',
               'X-Accel-Buffering': 'no',
          })
          res.flushHeaders?.()

          // This tab/device gets its own connection entry.
          const client: SSEClient = { userId, res };

          let connections = clients.get(userId);
          if (!connections) {
               connections = new Set<SSEClient>();
               clients.set(userId, connections);
          }
          connections.add(client);

          // open the stream so the client's onopen fires immediately
          res.write(`: connected\n\n`);

          req.on("close", () => {
               connections!.delete(client);
               if (connections!.size === 0) clients.delete(userId);
          });
     }
)
