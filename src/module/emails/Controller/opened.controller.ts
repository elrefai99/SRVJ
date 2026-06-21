import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const openedController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {

     }
)
