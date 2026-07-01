import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { clients } from "../utils/client";
import { SSEClient } from "../@types";

const MAX_CONNECTIONS_PER_USER = 8

export const streamController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const userId = String(req.user?.id)

          const existing = clients.get(userId)
          if (existing && existing.size >= MAX_CONNECTIONS_PER_USER) {
               res.status(429).json({ code: 429, status: "Too Many Requests", message: "Too many active notification streams for this account" })
               return
          }

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
