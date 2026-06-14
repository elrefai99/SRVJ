import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { LoginDTO } from "../DTO/index.dto";
import { BaseAuth } from "../service/base.auth.service";
import { token_PASETO } from "../utils/paseto.utils";
import { formatLoginTime } from "../utils/formatLoginTime";
import { getLocation } from "../../../utils/getLocation";
import { addJobToQueue } from "../../../MessageQueue/emails/Queue/queue.email";

export const loginController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const body = req.body as LoginDTO

          const base_auth = new BaseAuth()

          const result = await base_auth.login_service(body)

          if (result.error) {
               res.status(400).json({ code: 400, status: "Bad Request", timestamp: Date.now(), success: false, error: true, message: result.message, data: null })
               return
          }

          const token_data = {
               data: {
                    user_id: result?.data.id,
                    status: "active",
                    account: "normal"
               },
               access_device: req.useragent?.browser,
          }
          const token = await token_PASETO(token_data, "access")
          const refresh_token = await token_PASETO(token_data, "refresh")
          res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 2 });
          res.cookie("refresh_token", refresh_token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 24 * 30, });
          const emailBody = {
               type: "login",
               subject: "New sign-in to your SRVJ account",
               email: body.email,
               emailBody: {
                    supportEmail: process.env.EMAIL as string,
                    dashboardUrl: "https://srvj.elrefai.me/",
                    secureAccountUrl: "https://srvj.elrefai.me/",
                    ipAddress: req.clientIP,
                    location: getLocation(req),
                    device: req.useragent?.source,
                    loginTime: formatLoginTime(Date.now()),
                    firstName: result.data.fullname,
               }
          }
          await addJobToQueue("login", emailBody)
          res.status(200).json({
               code: 200, status: "OK", timestamp: Date.now(), success: true, error: false, message: result.message, data: {
                    token
               }
          })
          return
     }
);
