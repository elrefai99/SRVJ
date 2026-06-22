import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";
import { addJobToQueue } from "../../../MessageQueue/emails/Queue/queue.email";
import { inviteToken } from "../utils/token";

export const invitesController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { email, project } = req.body;
          const based_projects = new BasedProject()

          const result = await based_projects.inviteService({ email, project, fullname: req.user?.fullname, id: req.user?.id })
          const token = inviteToken({ id: result.data.site_id, email })
          const emailBody = {
               type: "invite",
               subject: `${req.user?.fullname} invited you to a whiteboard`,
               email: email,
               emailBody: {
                    firstName: email,
                    inviterName: req.user?.fullname,
                    boardName: "EBI",
                    workspaceName: "SRVJ",
                    role: "All",
                    expiresIn: "6h",
                    acceptUrl: `${process.env.NODE_ENV == "development" ? process.env.SITE_URL_TEST : process.env.SITE_URL_LIVE}/app/invite/${token}`
               }
          }
          await addJobToQueue("invite", emailBody)
          res.status(200).json({ code: 200, status: "OK", message: "Success send invite" })
          return
     }
)
