import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { AppError } from "../../../utils/errors/app-error";
import { ProjectRole, ProjectVisibility } from "../../../generated/prisma";
import { resolveDiagramAccess, ResolveBy } from "../service/resolve.access";
import { ACTION_MIN_ROLE, DiagramAction, ROLE_RANK } from "./role.constant";

export const authorizeDiagram = (action: DiagramAction): RequestHandler =>
     asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
          const userId = req.user?.id as number | undefined;
          if (!userId) throw AppError.unauthorized("Please login first");

          const by: ResolveBy = req.params.siteId
               ? { diagramSiteId: String(req.params.siteId) }
               : { projectSiteId: String(req.params.projectId) };

          const access = await resolveDiagramAccess(by, userId);
          if (!access) throw AppError.notFound("Diagram not found");

          const publicRead = action === "view" && access.visibility === ProjectVisibility.PUBLIC;
          if (!access.role && !publicRead) {
               throw AppError.forbidden("You do not have access to this diagram");
          }

          const effectiveRole: ProjectRole = access.role ?? ProjectRole.VIEWER;
          if (ROLE_RANK[effectiveRole] < ROLE_RANK[ACTION_MIN_ROLE[action]]) {
               throw AppError.forbidden(`Requires ${ACTION_MIN_ROLE[action]} role`);
          }

          req.diagramAccess = access;
          req.projectRole = effectiveRole;
          next();
     });
