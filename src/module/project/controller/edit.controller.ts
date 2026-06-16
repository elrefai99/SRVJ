import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { editProjectDTO } from "../DTO";
import { BasedProject } from "../service/base.project.service";

export const editController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const data = req.body as editProjectDTO
          const based_project: BasedProject = new BasedProject()

          const result = await based_project.editService({ ...data, project: String(req.params.id), user: req.user.id })
          if (!result.success) {
               res.status(400).json({ code: 400, status: "Bad Request", message: "Failed create project" })
               return
          }
          res.status(200).json({ code: 200, status: "OK", message: "Success Create new project" })
     }
)
