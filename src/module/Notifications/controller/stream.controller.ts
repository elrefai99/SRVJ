import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { clients } from "../utils/client";

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

          const existing = clients.get(userId);

          if (existing) {
               existing.res.end();
               clients.delete(userId);
          }

          clients.set(userId, { userId, res });

          req.on("close", () => {
               clients.delete(userId);
          });
     }
)
