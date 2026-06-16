import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { createProjectDTO } from "../DTO";
import { BasedProject } from "../service/base.project.service";

export const createController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const { title, description, visibility } = req.body as createProjectDTO

          const based_project: BasedProject = new BasedProject()

          const result = await based_project.createService({ title, description, visibility, user: req.user.id })

          if (!result.success) {
               res.status(400).json({ code: 400, status: "Bad Request", message: "Failed create project" })
               return
          }
          res.status(200).json({ code: 200, status: "OK", message: "Success Create new project" })
     }
)
