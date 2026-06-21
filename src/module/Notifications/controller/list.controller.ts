import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";

export const listController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const page = Number(req.query.page) || 1;
          const limit = Number(req.query.limit) || 10;

          const skip = (page - 1) * limit;
          const [data, total, count] = await Promise.all([
               prisma.notification.findMany({
                    where: {
                         toUserId: req.user?.id,
                    },
                    include: {
                         fromUser: true,
                    },
                    skip,
                    take: limit,
                    orderBy: {
                         createdAt: "desc",
                    },
               }),
               prisma.notification.count({
                    where: {
                         toUserId: req.user?.id,
                    },
               }),
               prisma.notification.count({
                    where: {
                         isRead: false,
                         toUserId: req.user?.id,
                    },
               }),
          ]);

          res.json({
               data,
               pagination: {
                    page,
                    limit,
                    total,
                    count,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1,
               },
          });
     }
)
