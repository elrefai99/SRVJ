import { NextFunction, Request, Response, RequestHandler } from "express"
import { asyncHandler } from "../../../utils/api-requesthandler"
import { AppError } from "../../../utils/errors/app-error"
import { BaseAuth } from "../service/base.auth.service"

export const refreshController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const reftoken: string = req.cookies.refresh_token

          if (!reftoken) {
               next(AppError.badRequest("Refresh token not found"))
               return
          }
          const based_auth = new BaseAuth()
          const result = await based_auth.refresh_service({ token: reftoken })

          res.cookie("access_token", result?.token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: result?.remainingMs })
          res.cookie("refresh_token", result?.tokenRefresh, { httpOnly: true, secure: true, sameSite: "strict", maxAge: result?.remainingMs })
          res.status(200).json({ code: 200, status: "OK", message: "Refresh token successful" })
     }
)
