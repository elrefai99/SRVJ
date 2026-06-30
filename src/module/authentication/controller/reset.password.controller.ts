import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import jwt from "jsonwebtoken"
import prisma from "../../../config/prisma";
import { tableStatus } from "../../../generated/prisma";
import bcrypt from "bcryptjs"

export const resetPasswordController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { token, password } = req.body

          const SECRET_KEY = process.env.PENDING_PUBLIC_KEY as string;
          const getUserByToken: any = jwt.verify(token, SECRET_KEY)
          if (getUserByToken?.err) {
               res.status(403).json({ message: "Forbidden", status: 403 });
               return
          }

          const user: any = await prisma.user.findFirst({
               where: {
                    email: getUserByToken.email.toLowerCase(),
                    status: tableStatus.active
               },
               select: {
                    id: true,
               }
          })

          if (!user) {
               res.status(403).json({ message: "Forbidden", status: 403 });
               return
          }

          const salt = await bcrypt.genSalt(Number(process.env.API_KEY_SALT))
          const newPassword = await bcrypt.hash(password, salt)

          await prisma.user.update({
               where: {
                    id: user?.id
               },
               data: {
                    password: newPassword
               }
          })
          res.status(200).json({ message: "Success update password" })

     }
)
