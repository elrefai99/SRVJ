import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";

export const seenController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          await prisma.notification.updateMany({
               where: {
                    toUserId: req.user?.id,
                    isRead: false,
               },
               data: {
                    isRead: true
               }
          })
          res.status(200).json({ code: 200, status: "OK", timestamp: Date.now(), success: true, error: false, message: "Success seen notification", data: null })
          return
     }
)
