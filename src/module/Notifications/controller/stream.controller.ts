import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const streamController: RequestHandler = asyncHandler(
     async (_req: Request, res: Response, _next: NextFunction) => {
          // const userId = req.user?._id as string
          // const lastEventId = req.headers['last-event-id'] as string | undefined

          // SSE headers
          res.writeHead(200, {
               'Content-Type': 'text/event-stream',
               'Cache-Control': 'no-cache',
               'Connection': 'keep-alive',
               'X-Accel-Buffering': 'no',
          })

          // Flush initial connection
          res.write(': connected\n\n')
     }
)
