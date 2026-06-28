import { V4 } from "paseto";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import type { IncomingMessage } from "node:http";
import type { KeyObject } from "node:crypto";
import { loadPubliceKey } from "../utils/loadKey";
import { ProjectRole, ProjectVisibility } from "../generated/prisma";
import { resolveDiagramAccess } from "../module/diagram/service/resolve.access";
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
     const access = await resolveDiagramAccess({ diagramSiteId: siteId }, userId);
     if (!access) throw new Error("not found");
     if (!access.role && access.visibility !== ProjectVisibility.PUBLIC) throw new Error("forbidden");

     return {
          userId: access.userId,
          diagramId: access.diagramId,
          siteId: access.siteId,
          projectId: access.projectId,
          role: access.role ?? ProjectRole.VIEWER,
     };
}
