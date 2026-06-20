// import { NextFunction, Request, RequestHandler, Response } from "express";
// import { asyncHandler } from "../../../utils/api-requesthandler";
// import { prisma } from "../../../gen-import";
// import { tableStatus } from "../../../generated/prisma";

// export const invitesController: RequestHandler = asyncHandler(
//      async (req: Request, res: Response, next: NextFunction) => {
//           const email = req.body.email;

//           const user = await prisma.user.findFirst({
//                where: {
//                     email: email.toLowerCase(),
//                     status: tableStatus.active
//                },
//                select: {
//                     id: true,
//                }
//           })
//           if (user) {
//           }
//      }
// )
