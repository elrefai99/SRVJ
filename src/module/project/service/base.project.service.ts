import prisma from "../../../config/prisma";
import { cacheService } from "../../../functions/redis/cache.service.fun";
import { invalidateUserProjectsCache } from "../../../functions/redis/cache.invalidation";
import { tableStatus } from "../../../generated/prisma";
import { IPayloadProject } from "../@types";
import { AppError } from "../../../gen-import";
import jwt from "jsonwebtoken";
import { diagramModel } from "../../diagram/schema/diagram.schema";
import { diagramVersionModel } from "../../diagram/schema/diagram.version.schema";

export class BasedProject {
     private redis: cacheService
     private INVITE_TOKEN: string;
     constructor() {
          this.redis = new cacheService()
          this.INVITE_TOKEN = process.env.INVITE_TOKEN as string
     }

     public async createService(payload: IPayloadProject): Promise<any> {
          const project = await this.createProject({
               title: payload.title,
               description: payload.description,
               visibility: payload.visibility,
               user: payload.user
          })
          const diagram = await this.createDiagram({
               project: project.project.site_id,
               user: payload.user,
          })
          if (project.success && diagram.success) {
               await invalidateUserProjectsCache(payload.user as number)
               return { success: true, diagram: diagram }
          }
     }

     public async getService(payload: any) {
          const cacheKey = `projects:${payload.user}:${payload.page || 1}:${payload.limit || 10}:${payload.search || ""}`
          const cachedData = await this.redis.getData(cacheKey)
          if (cachedData) {
               return cachedData
          }
          const page = Number(payload.page) || 1;
          const limit = Number(payload.limit) || 10;
          const search = String(payload.search || "");

          const skip = (page - 1) * limit;

          const [projects, total] = await Promise.all([
               prisma.project.findMany({
                    where: {
                         OR: [
                              { ownerId: payload.user },
                              { members: { some: { userId: payload.user } } }
                         ],
                         status: tableStatus.active,

                         ...(search && {
                              title: {
                                   contains: search,
                                   mode: "insensitive"
                              }
                         })
                    },
                    include: {
                         members: {
                              take: 5,
                              include: {
                                   user: {
                                        select: {
                                             id: true,
                                             fullname: true,
                                             username: true,
                                             avatar: true,
                                        },
                                   }
                              },
                         },
                    },
                    skip,
                    take: limit,
                    orderBy: {
                         createdAt: "desc"
                    }
               }),
               prisma.project.count({
                    where: {
                         ownerId: payload.user,
                         status: tableStatus.active,

                         ...(search && {
                              title: {
                                   contains: search,
                                   mode: "insensitive"
                              }
                         })
                    }
               })
          ]);

          const diagrams = await diagramModel
               .find({ projectId: { $in: projects.map((project) => project.site_id) } })
               .lean()
          const diagramsByProject = new Map(diagrams.map((diagram) => [diagram.projectId, diagram]))

          const result = {
               data: projects.map((project) => ({
                    ...project,
                    diagram: diagramsByProject.get(project.site_id) ?? null,
               })),
               pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
               }

          }
          await this.redis.setData(cacheKey, result)
          return result
     }

     public async editService(payload: IPayloadProject) {
          const existing = await prisma.project.findFirst({
               where: {
                    site_id: payload.project,
                    status: tableStatus.active,
                    ownerId: payload.user
               },
               select: { ownerId: true }
          });
          if (!existing) {
               return { success: false };
          }

          await prisma.project.update({
               where: {
                    site_id: payload.project
               },
               data: {
                    ...(payload.title !== undefined && {
                         title: payload.title,
                    }),
                    ...(payload.description !== undefined && {
                         description: payload.description,
                    }),
                    ...(payload.visibility !== undefined && {
                         visibility: payload.visibility,
                    }),
               },
          });

          await invalidateUserProjectsCache(existing.ownerId)
          return { success: true };
     }

     public async deleteService(payload: { project: string; user: number }) {
          const owned = await prisma.project.findFirst({
               where: {
                    site_id: payload.project,
                    status: tableStatus.active,
                    ownerId: payload.user
               },
               select: { id: true }
          })
          if (!owned) {
               return { success: false };
          }

          const project = await prisma.$transaction(async (tx) => {
               const project = await tx.project.update({
                    where: {
                         site_id: payload.project,
                         status: tableStatus.active
                    },
                    data: {
                         status: tableStatus.delete
                    }
               })
               await tx.projectMember.updateMany({
                    where: {
                         projectId: project.id,
                         status: tableStatus.active,
                    },
                    data: {
                         status: tableStatus.delete,
                    },
               })
               return project
          })

          const diagrams = await diagramModel.find({ projectId: payload.project }).select("_id").lean()
          if (diagrams.length) {
               await diagramVersionModel.deleteMany({
                    diagramId: { $in: diagrams.map((diagram) => diagram._id) },
               })
               await diagramModel.deleteMany({ projectId: payload.project })
          }

          await invalidateUserProjectsCache(project.ownerId)
          return { success: true };
     }

     public async inviteService(payload: any): Promise<any> {
          await prisma.user.findFirst({
               where: {
                    email: payload.email,
                    status: tableStatus.active
               },
               select: {
                    id: true
               }
          })
          const project = await prisma.project.findFirst({
               where: {
                    site_id: payload.project,
                    status: tableStatus.active,
                    ownerId: payload.id,
               },
               select: {
                    id: true,
                    title: true
               }
          })

          if (!project) {
               throw new AppError("this project is exest", 400)
          }

          const invite = await prisma.inviteProjects.create({
               data: {
                    inviterName: payload.fullname,
                    snederInvite: payload.id,
                    email: payload.email,
                    projectId: project.id,
                    status: tableStatus.inactive,
                    workspaceName: project.title
               }
          })
          return { success: true, data: invite }
     }

     public async getInvitesService(payload: any): Promise<any> {
          let decoded: any
          try {
               decoded = jwt.verify(payload, this.INVITE_TOKEN, { algorithms: ['HS256'] })
          } catch (err) {
               return { token: true }
          }

          const invite = await prisma.inviteProjects.findFirst({
               where: {
                    email: decoded.email as string,
                    status: tableStatus.inactive
               },
               include: {
                    snederInviteid: {
                         select: {
                              id: true,
                              fullname: true,
                              username: true,
                              avatar: true,
                         }
                    },
                    project: {
                         select: {
                              title: true,
                         }
                    }
               }
          })

          return { invite }
     }

     public async acceptInviteService(payload: any): Promise<any> {
          const project = await prisma.inviteProjects.update({
               where: {
                    site_id: payload.site_id as string,
                    email: payload.email as string,
                    status: tableStatus.inactive
               },
               data: {
                    status: payload.status === "accept" ? tableStatus.active : tableStatus.delete
               }
          })
          await prisma.projectMember.create({
               data: {
                    projectId: project.projectId,
                    userId: payload.user as number,
               }
          })
          await invalidateUserProjectsCache(payload.user as number)
          return { project }
     }

     // Private Functions

     private async createProject(payload: any) {
          const project = await prisma.project.create({
               data: {
                    title: payload.title,
                    description: payload.description,
                    visibility: payload.visibility,
                    ownerId: payload.user
               }
          })
          await prisma.projectMember.create({
               data: {
                    role: "OWNER",
                    projectId: project.id,
                    userId: payload.user
               }
          })
          return { success: true, project }
     }

     private async createDiagram(paylaod: any) {
          const diagram = await diagramModel.create({
               projectId: paylaod.project,
          })
          await diagramVersionModel.create({
               version: diagram.version,
               diagramId: diagram._id,
               createdById: paylaod.user,
          })
          await prisma.project.update({
               where: { site_id: paylaod.project },
               data: { diagram: diagram.site_id },
          })
          return { success: true, diagram }
     }
}
