import prisma from "../../../config/prisma";
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

     public async getService(paylaod: any) {
          const projects = await prisma.project.findMany({
               where: {
                    ownerId: paylaod.user,
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
