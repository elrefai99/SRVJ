import { NextFunction, Request, RequestHandler, Response } from "express";
import { V4 } from "paseto";
import { asyncHandler } from "../../utils/api-requesthandler";
import { loadPubliceKey } from "../../utils/loadKey";
import prisma from "../../config/prisma";
import { AppError } from "../../utils/errors/app-error";
import { tableStatus } from "../../generated/prisma";
import { TOKEN_VERSION } from "../../module/authentication/utils/paseto.utils";
import { cacheService } from "../../functions/redis/cache.service.fun";

const USER_CACHE_TTL = 300

export const userMiddleware: RequestHandler = asyncHandler(
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
               if (payload.token_version !== TOKEN_VERSION) {
                    throw AppError.unauthorized("Invalid or expired token")
               }
               const cacheKey = `user:${payload.data.user_id}`
               const cachedData = await redis.getData(cacheKey)
               if (cachedData) {
                    if (payload.session_version !== undefined && payload.session_version !== cachedData.sessionVersion) {
                         throw AppError.unauthorized("Session has been revoked, please login again")
                    }
                    req.user = cachedData
                    next()
                    return
               }
               const user = await prisma.user.findFirst({
                    where: {
                         id: payload.data.user_id,
                         status: tableStatus.active,
                    },
                    select: {
                         id: true,
                         fullname: true,
                         email: true,
                         username: true,
                         avatar: true,
                         sessionVersion: true
                    }
               })
               if (!user) {
                    next(new AppError("User not found", 404))
                    return
               }
               if (payload.session_version !== undefined && payload.session_version !== user.sessionVersion) {
                    throw AppError.unauthorized("Session has been revoked, please login again")
               }
               await redis.setExData(cacheKey, user, USER_CACHE_TTL)
               req.user = user
               next()

          }).catch(() => {
               throw AppError.unauthorized("Invalid or expired token")
          })
     }
)
