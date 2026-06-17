import type { Request, RequestHandler, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { NotificationPayload } from '../@types';
import { addNotificationJobToQueue } from '../../../MessageQueue/notifications/Queue/queue.notification';
// import { connectRedis, redis } from '../shared/redis';


export const publishController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const { type, title, message, targetUserId } = req.body

          const payload: NotificationPayload = {
               id: uuidv4(),
               sender: String(req.user?.id),
               userId: targetUserId,
               type,
               title,
               message,
               createdAt: new Date().toISOString(),
          }
          await addNotificationJobToQueue("notificationQueue", payload)
          res.json({ success: true, data: payload });
     }
)
