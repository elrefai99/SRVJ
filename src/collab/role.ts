import { ProjectRole } from "../generated/prisma";

const ROLE_RANK: Record<ProjectRole, number> = {
     VIEWER: 1,
     EDITOR: 2,
     OWNER: 3,
};

export const canWriteDiagram = (role: ProjectRole): boolean =>
     ROLE_RANK[role] >= ROLE_RANK.EDITOR;
