import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { V4 } from "paseto";
import prisma from "../../../config/prisma";
import { tableStatus } from "../../../generated/prisma";
import bcrypt from "bcryptjs"
import { AppError } from "../../../utils/errors/app-error";
import { derivePublicKeyFromPrivate } from "../../../utils/loadKey";
import { TOKEN_VERSION } from "../utils/paseto.utils";
import { cacheService } from "../../../functions/redis/cache.service.fun";

export const resetPasswordController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { token, password } = req.body

          if (!token || !password) {
               throw AppError.badRequest("Token and password are required")
          }

          const publicKey = derivePublicKeyFromPrivate("PRIVATE_FORGET_PASSWORD_SECRET_KY")
          const payload: any = await V4.verify(token, publicKey).catch(() => {
               throw AppError.forbidden("This link has expired. Please request a new one")
          })

          if (payload.token_version !== TOKEN_VERSION || typeof payload.data?.user_id !== "number") {
               throw AppError.forbidden("This link has expired. Please request a new one")
          }

          const redis = new cacheService()
          const nonceKey = `reset-password:used:${payload.nonce}`
          const alreadyUsed = await redis.getData(nonceKey)
          if (!payload.nonce || alreadyUsed) {
               throw AppError.forbidden("This link has already been used")
          }

          const user = await prisma.user.findFirst({
               where: {
                    id: payload.data.user_id,
                    status: tableStatus.active
               },
               select: {
                    id: true,
               }
          })

          if (!user) {
               throw AppError.forbidden("This link has expired. Please request a new one")
          }

          const salt = await bcrypt.genSalt(Number(process.env.API_KEY_SALT))
          const newPassword = await bcrypt.hash(password, salt)

          await prisma.user.update({
               where: {
                    id: user.id
               },
               data: {
                    password: newPassword,
                    sessionVersion: { increment: 1 },
               }
          })
          await redis.setExData(nonceKey, true, 15 * 60)
          await redis.deleteData(`user:${user.id}`)
          res.status(200).json({ code: 200, status: "OK", message: "Success update password" })

     }
)
