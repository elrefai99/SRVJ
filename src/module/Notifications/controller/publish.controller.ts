import type { Request, RequestHandler, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { NotificationPayload } from '../@types';
import { addNotificationJobToQueue } from '../../../MessageQueue/Queue/queue.notification';
import { AppError } from '../../../utils/errors/app-error';
import prisma from '../../../config/prisma';
import { tableStatus } from '../../../generated/prisma';
import { publishNotificationDTO } from '../DTO';

export const publishController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const { type, title, message, targetUserId } = req.body as publishNotificationDTO
          const senderId = req.user?.id as number

          if (targetUserId === senderId) {
               throw AppError.badRequest("Cannot send a notification to yourself")
          }

          const sharedProject = await prisma.project.findFirst({
               where: {
                    status: tableStatus.active,
                    AND: [
                         { members: { some: { userId: senderId, status: tableStatus.active } } },
                         { members: { some: { userId: targetUserId, status: tableStatus.active } } },
                    ],
               },
               select: { id: true },
          })
          if (!sharedProject) {
               throw AppError.forbidden("You do not share a project with this user")
          }

          const payload: NotificationPayload = {
               id: uuidv4(),
               sender: String(senderId),
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
