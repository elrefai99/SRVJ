import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedEmails } from "../service/based.emails.service";

export const clickController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const based_emails = new BasedEmails()
          const result = await based_emails.clickService(req.params.id as string)

          if (result.click) {
               res.status(200).json({ code: 200, status: "OK", timestamp: Date.now(), success: true, error: false, message: "Success click on emails", data: null })
               return
          }
     }
)
