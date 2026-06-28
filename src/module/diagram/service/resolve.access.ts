import prisma from "../../../config/prisma";
import { diagramModel } from "../schema/diagram.schema";
import { tableStatus, ProjectRole, ProjectVisibility } from "../../../generated/prisma";

export interface DiagramAccess {
     userId: number;
     diagramId: string;
     siteId: string;
     projectId: number;
     ownerId: number;
     visibility: ProjectVisibility;
     role: ProjectRole | null;
}

export type ResolveBy = { diagramSiteId: string } | { projectSiteId: string };

export async function resolveDiagramAccess(
     by: ResolveBy,
     userId: number,
): Promise<DiagramAccess | null> {
     const diagramQuery =
          "diagramSiteId" in by ? { site_id: by.diagramSiteId } : { projectId: by.projectSiteId };

     const diagram = await diagramModel
          .findOne(diagramQuery)
          .select({ _id: 1, site_id: 1, projectId: 1 })
          .lean();
     if (!diagram) return null;

     const project = await prisma.project.findFirst({
          where: { site_id: diagram.projectId, status: tableStatus.active },
          select: {
               id: true,
               ownerId: true,
               visibility: true,
               members: {
                    where: { userId, status: tableStatus.active },
                    select: { role: true },
                    take: 1,
               },
          },
     });
     if (!project) return null;

     const base = {
          userId,
          diagramId: String(diagram._id),
          siteId: String(diagram.site_id),
          projectId: project.id,
          ownerId: project.ownerId,
          visibility: project.visibility,
     };

     if (project.ownerId === userId) return { ...base, role: ProjectRole.OWNER };

     return { ...base, role: project.members[0]?.role ?? null };
}
