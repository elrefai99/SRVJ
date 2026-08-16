import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { addNotificationJobToQueue } from "../../../MessageQueue/Queue/queue.notification";
import { NotificationPayload } from "../../Notifications/@types";
import { BasedProject } from "../service/base.project.service";

export const acceptInvitesController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { status } = req.query
          if (status !== "accept") {
               res.status(200).json({ code: 200, status: "OK", message: "User reject invite" })
               return
          }

          const payload = {
               site_id: req.params.id as string,
               email: req.user?.email,
               user: req.user?.id as number,
               status
          }

          const based_project = new BasedProject()
          const result = await based_project.acceptInviteService(payload)

          const payload_notification: NotificationPayload = {
               sender: String(req.user?.id),
               userId: result.project.snederInvite,
               type: "INVITE_ACCEPTED",
               title: "Invitation accepted",
               message: `${req.user?.fullname ?? "A user"} accepted your project invitation`,
          }
          await addNotificationJobToQueue("notificationQueue", payload_notification)
          res.status(200).json({ code: 200, status: "OK", message: "User accept invite" })
          return
     }
)
