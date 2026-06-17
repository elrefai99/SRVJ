import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BaseUser } from "../Service/base.user.service";

export const deleteController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const based_user = new BaseUser()

          const result = await based_user.delete_profile(req.user.id)
          if (!result) {
               res.status(400).json({
                    code: 400, status: "Bad Request", timestamp: new Date(), success: false, error: true, message: "Faild update user data", data: null
               })
               return
          }
          res.status(200).json({
               code: 200, status: "OK", timestamp: new Date(), success: true, error: false, message: "Success update user data", data: null
          })
          return
     }
)
