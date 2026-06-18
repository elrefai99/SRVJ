import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";

export const getController: RequestHandler = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const based_project: BasedProject = new BasedProject()
    const result = await based_project.getService({ user: req.user?.id })

    res.status(200).json({ code: 200, status: "OK", timestamp: Date.now(), success: true, error: false, message: "Success fetch data", data: result })
    return
  }
)
