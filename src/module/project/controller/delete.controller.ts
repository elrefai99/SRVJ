import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";

export const deleteController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const basedProject = new BasedProject();
          await basedProject.deleteService(req.params.id as string);
          return res.status(200).json({ code: 200, status: "OK", message: "Project deleted successfully" });
     }
)
