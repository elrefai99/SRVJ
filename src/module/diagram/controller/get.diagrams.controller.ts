import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedDiagram } from "../service/base.diagram.service";

export const getDiagramController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const based_diagram: BasedDiagram = new BasedDiagram()

          const result = await based_diagram.getDiagramService({ siteId: String(req.params.siteId) })

          if (!result.success) {
               res.status(404).json({ success: false, message: result.message })
               return
          }
          res.status(200).json({ success: true, message: result.message, data: result.data })
     }
)
