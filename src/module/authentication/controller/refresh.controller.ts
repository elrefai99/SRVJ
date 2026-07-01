import { NextFunction, Request, Response, RequestHandler } from "express"
import { asyncHandler } from "../../../utils/api-requesthandler"
import { AppError } from "../../../utils/errors/app-error"
import { loadPubliceKey } from "../../../utils/loadKey"
import { V4 } from "paseto"
import prisma from "../../../config/prisma"
import { token_PASETO, TOKEN_VERSION } from "../utils/paseto.utils"
import { allowedOrigins } from "../../../app.config"
import { tableStatus } from "../../../generated/prisma"

export const refreshController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const origin = req.headers?.origin
          if (origin && !allowedOrigins.includes(origin)) {
               next(AppError.unauthorized("Origin not allowed"))
               return
          }

          const reftoken: string = req.cookies.refresh_token

          if (!reftoken) {
               next(AppError.badRequest("Refresh token not found"))
               return
          }
          const publicKey = loadPubliceKey("REFRESH_PUBLIC_KEY")
          await V4.verify(reftoken, publicKey).then(async (payload: any) => {
               if (payload.token_version !== TOKEN_VERSION) {
                    throw AppError.unauthorized("Invalid or expired token")
               }
               const user = await prisma.user.findFirst({
                    where: {
                         id: payload.data.user_id,
                         status: tableStatus.active,
                    },
                    select: {
                         id: true,
                         sessionVersion: true,
                    }
               })
               if (!user) {
                    throw AppError.notFound("User not found")
               }
               if (payload.session_version !== undefined && payload.session_version !== user.sessionVersion) {
                    throw AppError.unauthorized("Session has been revoked, please login again")
               }

               const token_data = { data: { user_id: user.id, session_version: user.sessionVersion }, access_device: req.useragent?.browser }
               const token: string = await token_PASETO(token_data, "access")
               const refresh_token: string = await token_PASETO(token_data, "refresh")
               res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 2 });
               res.cookie("refresh_token", refresh_token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 30 });
               res.status(200).json({ code: 200, status: "OK", message: "Refresh token successful" })
          }).catch(() => {
               throw AppError.unauthorized("Invalid or expired token")
          })


     }
)
