import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";

export const listController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const data = await prisma.notification.findMany({
               where: {
                    toUserId: req.user?.id
               },
               include: {
                    fromUser: true
               }
          })

          res.status(200).json({ code: 200, status: "OK", data })
     }
)
