import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";
import { AppError } from "../../../utils/errors/app-error";
import { V4 } from "paseto";
import { loadPubliceKey } from "../../../utils/loadKey";
import { tableStatus } from "../../../generated/prisma";
import { cacheService } from "../../../functions/redis/cache.service.fun";

export const meMiddleware: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const authHeader = req.headers.authorization;
          const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

          if (!token) {
               res.status(401).json({ code: 401, status: "Unauthorized", timestamp: new Date(), success: false, error: true, message: "Please login first" });
               return
          }
          const redis = new cacheService()

          const publicKey = loadPubliceKey("ACCESS_PUBLICE_KEY")
          await V4.verify(token, publicKey).then(async (payload: any) => {
               const cacheKey = `user:${payload.data.user_id}`
               const cachedData = await redis.getData(cacheKey)
               if (cachedData) {
                    req.user = cachedData
                    next()
                    return
               }
               const user = await prisma.user.findFirst({
                    where: {
                         id: payload.data.user_id,
                         status: tableStatus.active
                    },
                    select: {
                         id: true,
                         fullname: true,
                         email: true,
                         username: true,
                         avatar: true
                    }
               })
               if (!user) {
                    next(new AppError("User not found", 404))
                    return
               }
               await redis.setData(cacheKey, user)
               req.user = user
               next()

          }).catch((err) => {
               throw AppError.unauthorized(`Invalid refresh token: ${err}`)
          })
     }
)
