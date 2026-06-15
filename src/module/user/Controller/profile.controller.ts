import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const profileController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          res.status(200).json({
               code: 200, status: "OK", timestamp: new Date(), success: true, error: false, message: "Success fetch user profile data", data: req.user
          })
     }
)
