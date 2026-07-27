import { NextFunction, Request, RequestHandler, Response } from "express";
import { addJobToQueue, asyncHandler, BaseAuth, getLocation, token_PASETO } from "../../../gen-import";
import { generateUUID } from "../../../utils/uuid";

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
          const token = await token_PASETO(
               { data: { user_id: result.id }, access_device: req.useragent?.browser, nonce: generate_uuid },
               "forget_password",
          )
          const email_body = {
               type: "forgatePassword",
               subject: "Reset your SRVJ password",
               email,
               emailBody: {
                    resetUrl: `${process.env.NODE_ENV == "development" ? process.env.SITE_URL_TEST : process.env.SITE_URL_LIVE}/app/reset-password/${token}`,
                    expiresIn: '15 Min',
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
