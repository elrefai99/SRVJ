import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedDiagram } from "../service/base.diagram.service";

export const getVersionController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const based_diagram: BasedDiagram = new BasedDiagram()

          const result = await based_diagram.getVersionService({
               projectId: String(req.params.projectId),
               versionId: String(req.params.versionId),
          })

          if (!result.success) {
               res.status(404).json({ code: 404, status: "Not Found", message: result.message })
               return
          }
          res.status(200).json({ code: 200, status: "OK", message: result.message, data: result.data })
     }
)
