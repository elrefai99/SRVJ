import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { generateUUID } from "../../../utils/uuid";
import { forgetPasswordToken } from "../utils/jwt";
import { addJobToQueue } from "../../../MessageQueue/emails/Queue/queue.email";
import { BaseAuth } from "../service/base.auth.service";
import { getLocation } from "../../../utils/getLocation";

export const forgetPasswordController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { email } = req.body
          const based_auth = new BaseAuth()

          const result = await based_auth.forgetPasswordService(email)

          if (result?.error) {
               res.status(400).json({ code: 400, status: "Bad Request", message: result?.message })
               return
          }
          const generate_uuid = generateUUID()
          const token = forgetPasswordToken({
               email,
               expiresIn: '5 Min',
               device: req.useragent?.browser as string,
               uuid: generate_uuid as string
          })
          const email_body = {
               type: "forgatePassword",
               subject: "Reset your SRVJ password",
               email,
               emailBody: {
                    resetUrl: `${process.env.NODE_ENV == "development" ? process.env.SITE_URL_TEST : process.env.SITE_URL_LIVE}/app/reset-password/${token}`,
                    expiresIn: '5 Min',
                    firstName: result?.fullname,
                    ipAddress: req.clientIP,
                    location: getLocation(req),
                    device: req.useragent?.browser,
                    uuid: generate_uuid as string
               }
          }

          await addJobToQueue("forgatePassword", email_body)
          res.status(200).json({
               code: 200, status: "OK", timestamp: Date.now(), success: true, error: false, message: "Success send email", data: null
          })
     }
)
