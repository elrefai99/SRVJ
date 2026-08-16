import type { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { RegisterDTO } from "../DTO/index.dto";
import { BaseAuth } from "../service/base.auth.service";
import { token_PASETO } from "../utils/paseto.utils";
import { addJobToQueue } from "../../../MessageQueue/Queue/queue.email";

export const registerController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const body = req.body as RegisterDTO

          const base_auth = new BaseAuth()

          const result = await base_auth.create_user(body)

          if (result.error) {
               res.status(400).json({ code: 400, status: "Bad Request", timestamp: Date.now(), success: false, error: true, message: result.message, data: null })
               return
          }

          const token_data = {
               data: {
                    user_id: result.data?.id,
                    status: "active",
                    account: "normal"
               },
               access_device: req.useragent?.browser,
          }
          const token = await token_PASETO(token_data, "access")
          const refresh_token = await token_PASETO(token_data, "refresh")
          res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 2 });
          res.cookie("refresh_token", refresh_token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 30, });
          const emailBody = {
               type: "register",
               subject: "Welcome to SRVJ",
               email: body.email,
               emailBody: {
                    supportEmail: process.env.EMAIL,
                    dashboardUrl: `${process.env.NODE_ENV === 'development' ? process.env.SITE_URL_TEST : process.env.SITE_URL_LIVE}/app/dashboard/projects`,
                    firstName: body.fullname
               }
          }
          await addJobToQueue("register", emailBody)
          res.status(201).json({
               code: 201, status: "Created", timestamp: Date.now(), success: true, error: false, message: result.message, data: {
                    token
               }
          })
          return
     }
);
