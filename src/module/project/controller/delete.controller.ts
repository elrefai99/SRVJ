import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";

export const deleteController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const basedProject = new BasedProject();
          const result = await basedProject.deleteService({ project: req.params.id as string, user: req.user?.id as number });
          if (!result.success) {
               return res.status(404).json({ code: 404, status: "Not Found", message: "Project not found or access denied" });
          }
          return res.status(200).json({ code: 200, status: "OK", message: "Project deleted successfully" });
     }
)
