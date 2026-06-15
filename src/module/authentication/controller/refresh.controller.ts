import { NextFunction, Request, Response, RequestHandler } from "express"
import { asyncHandler } from "../../../utils/api-requesthandler"
import { AppError } from "../../../utils/errors/app-error"
import { loadPubliceKey } from "../../../utils/loadKey"
import { V4 } from "paseto"
import prisma from "../../../config/prisma"
import { token_PASETO } from "../utils/paseto.utils"

export const refreshController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const reftoken: string = req.cookies.refresh_token

          if (!reftoken) {
               next(AppError.badRequest("Refresh token not found"))
               return
          }
          const publicKey = loadPubliceKey("REFRESH_PUBLIC_KEY")
          await V4.verify(reftoken, publicKey).then(async (payload: any) => {
               const user = await prisma.user.findFirst({
                    where: {
                         id: payload.data.user_id,
                    },
                    select: {
                         id: true,
                    }
               })
               if (!user) {
                    throw AppError.notFound("User not found")
               }

               // calculate remaining time for the refresh token
               const expireDate: Date = new Date(payload.exp)
               const remainingMs: number = expireDate.getTime() - Date.now()
               const remainingDays: number = Math.floor(remainingMs / (1000 * 60 * 60 * 24))

               const token: string = await token_PASETO({ data: { user_id: user.id } }, "access")
               const tokenRefresh: string = await token_PASETO({ data: { user_id: user.id } }, "refresh", `${remainingDays}d`)
               res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: remainingMs })
               res.cookie("refresh_token", tokenRefresh, { httpOnly: true, secure: true, sameSite: "strict", maxAge: remainingMs })
               res.status(200).json({ code: 200, status: "OK", message: "Refresh token successful" })
          }).catch((err) => {
               throw AppError.unauthorized(`Invalid refresh token: ${err}`)
          })


     }
)
