import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { updateProfileDTO } from "../DTO/index.dto";
import { BaseUser } from "../Service/base.user.service";

export const updateProfileController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const data = req.body as updateProfileDTO

          if (req.file) {
               data.image = req.file.buffer
          }
          const based_user = new BaseUser()

          const result = await based_user.update_profile(req.user?.id as number, data)
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
