import prisma from "../../../config/prisma";
import { cacheService } from "../../../functions/redis/cache.service.fun";
import { tableStatus } from "../../../generated/prisma";
import { IPayloadProject } from "../@types";

export class BasedProject {
     private redis: cacheService
     constructor() {
          this.redis = new cacheService()
     }

     public async createService(payload: IPayloadProject): Promise<any> {
          const project = await this.createProject({
               title: payload.title,
               description: payload.description,
               visibility: payload.visibility,
               user: payload.user
          })
          const diagram = await this.createDiagram({
               project: project.project.id,
          })
          if (project.success && diagram.success) {
               await this.redis.deleteData(`projects:${payload.user}`)
               return { success: true }
          }
     }

     public async getService(payload: any) {
          const cacheKey = `projects:${payload.user}`
          const cachedData = await this.redis.getData(cacheKey)
          if (cachedData) {
               return cachedData
          }
          const projects = await prisma.project.findMany({
               where: {
                    ownerId: payload.user,
                    status: tableStatus.active
               },
               include: {
                    diagram: true,
                    members: {
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
          });
          await this.redis.setData(cacheKey, projects)
          return projects
     }

     public async editService(payload: IPayloadProject) {
          const project = await prisma.project.update({
               where: {
                    site_id: payload.project,
                    status: tableStatus.active
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

          await this.redis.deleteData(`projects:${project.ownerId}`)
          return { success: true };
     }

     public async deleteService(payload: string) {
          const project = await prisma.$transaction(async (tx) => {
               const project = await tx.project.update({
                    where: {
                         site_id: payload,
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
               await tx.diagram.deleteMany({
                    where: {
                         projectId: project.id,
                    },
               })
               await tx.diagramVersion.deleteMany({
                    where: {
                         diagram: { projectId: project.id },
                    },
               })
               return project
          })

          await this.redis.deleteData(`projects:${project.ownerId}`)
          return { success: true };
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
          const diagram = await prisma.diagram.create({
               data: {
                    nodes: [],
                    edges: [],
                    projectId: paylaod.project,
               }
          })
          await prisma.diagramVersion.create({
               data: {
                    version: diagram.version,
                    nodes: {},
                    edges: {},
                    diagramId: diagram.id,
               }
          })
          return { success: true, diagram }
     }


}
