import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const resolveDiagramAccess = vi.fn();
vi.mock("../../../module/diagram/service/resolve.access", () => ({
     resolveDiagramAccess: (...args: unknown[]) => resolveDiagramAccess(...args),
}));

import { authorizeDiagram } from "../authorize.diagram";

const baseAccess = {
     userId: 1,
     diagramId: "d1",
     siteId: "s1",
     projectId: 10,
     ownerId: 99,
     visibility: "PRIVATE",
     role: null as string | null,
};

function run(action: Parameters<typeof authorizeDiagram>[0], req: Partial<Request>) {
     const res = {} as Response;
     const next = vi.fn() as unknown as NextFunction;
     return { promise: authorizeDiagram(action)(req as Request, res, next), req, next };
}

beforeEach(() => resolveDiagramAccess.mockReset());

describe("authorizeDiagram middleware", () => {
     it("rejects unauthenticated request with 401", async () => {
          const { promise } = run("view", { params: { siteId: "s1" } });
          await expect(promise).rejects.toMatchObject({ statusCode: 401 });
     });

     it("rejects when diagram not found with 404", async () => {
          resolveDiagramAccess.mockResolvedValue(null);
          const { promise } = run("view", { user: { id: 1 }, params: { siteId: "s1" } });
          await expect(promise).rejects.toMatchObject({ statusCode: 404 });
     });

     it("blocks a VIEWER from edit with 403", async () => {
          resolveDiagramAccess.mockResolvedValue({ ...baseAccess, role: "VIEWER" });
          const { promise } = run("edit", { user: { id: 1 }, params: { projectId: "p1" } });
          await expect(promise).rejects.toMatchObject({ statusCode: 403 });
     });

     it("allows an EDITOR to edit and sets req.projectRole", async () => {
          resolveDiagramAccess.mockResolvedValue({ ...baseAccess, role: "EDITOR" });
          const { promise, req, next } = run("edit", { user: { id: 1 }, params: { projectId: "p1" } });
          await promise;
          expect(next).toHaveBeenCalledOnce();
          expect(req.projectRole).toBe("EDITOR");
     });

     it("blocks a non-member from viewing a PRIVATE diagram with 403", async () => {
          resolveDiagramAccess.mockResolvedValue({ ...baseAccess, role: null, visibility: "PRIVATE" });
          const { promise } = run("view", { user: { id: 1 }, params: { siteId: "s1" } });
          await expect(promise).rejects.toMatchObject({ statusCode: 403 });
     });

     it("allows a non-member to view a PUBLIC diagram as VIEWER", async () => {
          resolveDiagramAccess.mockResolvedValue({ ...baseAccess, role: null, visibility: "PUBLIC" });
          const { promise, req, next } = run("view", { user: { id: 1 }, params: { siteId: "s1" } });
          await promise;
          expect(next).toHaveBeenCalledOnce();
          expect(req.projectRole).toBe("VIEWER");
     });
});
