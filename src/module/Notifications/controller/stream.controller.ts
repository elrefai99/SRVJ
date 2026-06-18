import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { clients } from "../utils/client";
import { formatHeartbeat } from "../utils/sseFormat";

export const streamController: RequestHandler = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = String(req.user?.id);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const client = {
      userId,
      res,
    };

    const userClients = clients.get(userId) ?? new Set();

    userClients.add(client);

    clients.set(userId, userClients);

    res.write(
      "event: connected\n" +
      `data: ${JSON.stringify({ userId })}\n\n`
    );

    const heartbeat = setInterval(() => {
      res.write(formatHeartbeat());
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);

      const userClients = clients.get(userId);

      if (!userClients) return;

      userClients.delete(client);

      if (userClients.size === 0) {
        clients.delete(userId);
      }

      res.end();
    });
  }
);
