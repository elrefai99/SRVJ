import { V4 } from "paseto";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import type { IncomingMessage } from "node:http";
import type { KeyObject } from "node:crypto";
import prisma from "../config/prisma";
import { diagramModel } from "../module/diagram/schema/diagram.schema";
import { loadPubliceKey } from "../utils/loadKey";
import { tableStatus, ProjectRole } from "../generated/prisma";
import { COOKIE_NAME_ACCESS } from "./env";

const siteIdSchema = z.string().uuid();

export interface CollabIdentity {
     userId: number;
}

export interface CollabContext {
     userId: number;
     diagramId: string;
     siteId: string;
     projectId: number;
     role: ProjectRole;
}

let cachedAccessKey: KeyObject | null = null;
const accessPublicKey = (): KeyObject => (cachedAccessKey ??= loadPubliceKey("ACCESS_PUBLICE_KEY"));

async function verifyAccessToken(token: string): Promise<CollabIdentity> {
     const payload = (await V4.verify(token, accessPublicKey())) as {
          data?: { user_id?: number };
          site?: string;
     };
     const userId = payload?.data?.user_id;
     if (payload?.site !== "SRVJ" || typeof userId !== "number") {
          throw new Error("invalid access token");
     }
     return { userId };
}

function tokenFromRequest(request: IncomingMessage): string | undefined {
     const cookieHeader = request.headers.cookie;
     if (cookieHeader) {
          const token = parseCookie(cookieHeader)[COOKIE_NAME_ACCESS];
          if (token) return token;
     }
     const authHeader = request.headers.authorization;
     if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.slice(7);
     return undefined;
}

export async function authenticateFromRequest(request: IncomingMessage): Promise<CollabIdentity> {
     const token = tokenFromRequest(request);
     if (!token) throw new Error("missing access token");
     return verifyAccessToken(token);
}

export function siteIdFromUrl(url?: string): string {
     const pathname = new URL(url ?? "", "http://internal").pathname;
     const last = pathname.split("/").filter(Boolean).pop() ?? "";
     return siteIdSchema.parse(last);
}

export async function authorizeDiagramAccess(userId: number, siteId: string): Promise<CollabContext> {
     const diagram = await diagramModel.findOne({ site_id: siteId }).select({ _id: 1, projectId: 1 }).lean();
     if (!diagram) throw new Error("not found");

     const project = await prisma.project.findFirst({
          where: { site_id: diagram.projectId, status: tableStatus.active },
          select: {
               id: true,
               ownerId: true,
               members: {
                    where: { userId, status: tableStatus.active },
                    select: { role: true },
               },
          },
     });
     if (!project) throw new Error("not found");

     const base = { userId, diagramId: String(diagram._id), siteId, projectId: project.id };

     if (project.ownerId === userId) return { ...base, role: ProjectRole.OWNER };

     const member = project.members[0];
     if (!member) throw new Error("forbidden");
     return { ...base, role: member.role };
}
