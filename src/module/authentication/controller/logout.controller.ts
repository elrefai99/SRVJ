import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const logoutConrtoller: RequestHandler = asyncHandler(
     async (_req: Request, res: Response, _next: NextFunction) => {
          res.clearCookie("access_token", { httpOnly: true, secure: true, sameSite: "none", });
          res.clearCookie("refresh_token", { httpOnly: true, secure: true, sameSite: "none", });
          res.status(200).json({ code: 200, status: 'OK', message: "Cookie is deleted" });
     }
)
