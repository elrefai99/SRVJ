import prisma from "../../../config/prisma";
import { tableStatus } from "../../../generated/prisma";
import { IPayloadProject } from "../@types";

export class BasedProject {
     constructor() { }

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
               return { success: true }
          }
     }

     public async getService(payload: any) {
          const projects = await prisma.project.findMany({
               where: {
                    ownerId: payload.user,
                    status: tableStatus.active
               },
               include: {
                    diagram: true,
                    members: {
                         include: {
                              user: true,
                         },
                    },
               },
          });
          return projects
     }

     public async editService(payload: IPayloadProject) {
          await prisma.project.update({
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
