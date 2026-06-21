import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";
import { tableStatus } from "../../../generated/prisma";
import { addNotificationJobToQueue } from "../../../MessageQueue/notifications/Queue/queue.notification";
import { v4 as uuidv4 } from 'uuid'
import { NotificationPayload } from "../../Notifications/@types";

export const acceptInvitesController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { status } = req.query

          const project = await prisma.inviteProjects.update({
               where: {
                    site_id: req.params.id as string,
                    email: req.user?.email,
                    status: tableStatus.inactive
               },
               data: {
                    status: status === "accept" ? tableStatus.active : tableStatus.delete
               }
          })
          if (status !== "accept") {
               res.status(200).json({ code: 200, status: "OK", message: "User reject invite" })
               return
          }
          await prisma.projectMember.create({
               data: {
                    projectId: project.projectId,
                    userId: req.user?.id as number,
               }
          })
          const payload: NotificationPayload = {
               id: uuidv4(),
               sender: String(req.user?.id),
               userId: project.snederInvite,
               type: "User accept invite",
               title: "User accept invite",
               message: "User accept invite",
               createdAt: new Date().toISOString(),
          }
          await addNotificationJobToQueue("notificationQueue", payload)
          res.status(200).json({ code: 200, status: "OK", message: "User accept invite" })
          return
     }
)
