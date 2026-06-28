import { ProjectRole } from "../../../generated/prisma";

export const ROLE_RANK: Record<ProjectRole, number> = {
     VIEWER: 1,
     EDITOR: 2,
     OWNER: 3,
};

export type DiagramAction = "view" | "edit" | "restore" | "delete" | "manage";

export const ACTION_MIN_ROLE: Record<DiagramAction, ProjectRole> = {
     view: "VIEWER",
     edit: "EDITOR",
     restore: "EDITOR",
     delete: "OWNER",
     manage: "OWNER",
};
