import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";
import { tableStatus } from "../../../generated/prisma";
import jwt from "jsonwebtoken";

export const getInvitesController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const token = req.query.token as string

          if (!token) {
               res.status(401).json({ code: 401, status: "Unauthorized", message: "Authentication failed", });
               return
          }
          const INVITE_TOKEN = process.env.INVITE_TOKEN as string;

          jwt.verify(token, INVITE_TOKEN, { algorithms: ['HS256'] }, async (err: any, decoded: any | any) => {
               if (err) {
                    res.status(403).json({ code: 403, status: "Forbidden", message: "This token has expired. Please request a new one", });
                    return;
               }
               console.log(decoded);

               const invite = await prisma.inviteProjects.findFirst({
                    where: {
                         email: decoded.email as string,
                         status: tableStatus.inactive
                    },
                    include: {
                         snederInviteid: {
                              select: {
                                   id: true,
                                   fullname: true,
                                   username: true,
                                   avatar: true,
                              }
                         },
                         project: {
                              select: {
                                   title: true,
                              }
                         }
                    }
               })
               res.status(200).json({ code: 200, status: "OK", data: invite })
               return
          });
     }
)
