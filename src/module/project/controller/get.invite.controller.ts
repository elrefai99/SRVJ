import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";
import { getInviteDTO } from "../DTO";

export const getInvitesController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { token } = req.body as getInviteDTO

          const based_project = new BasedProject()
          const result = await based_project.getInvitesService(token)
          if (result?.token) {
               res.status(403).json({ code: 403, status: "Forbidden", message: "This token has expired. Please request a new one", });
               return
          }
          console.log(result);

          res.status(200).json({ code: 200, status: "OK", data: result?.invite })
          return
     }
)
