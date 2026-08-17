import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedProject } from "../service/base.project.service";
import { IPayloadProject } from "../@types";

export const getController: RequestHandler = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const payload: IPayloadProject = {
      user: req.user?.id,
      cursor: req.query.cursor as string,
      limit: req.query.limit as string,
      search: req.query.search as string
    }
    const based_project: BasedProject = new BasedProject()
    const result = await based_project.getService(payload)

    res.status(200).json({
      code: 200,
      status: "OK",
      timestamp: Date.now(),
      success: true,
      error: false,
      message: "Success fetch data",
      data: result.data,
      pagination: {
        page: req.query.page,
        limit: req.query.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasNextPage: Number(req.query.page) * Number(req.query.limit) < result.pagination.total,
        hasPrevPage: Number(req.query.page) > 1,
      },
    })
    return
  }
)
