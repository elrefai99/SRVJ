import { invalidateUserProjectsCache } from "../../../functions/redis/cache.invalidation";
import { diagramModel } from "../schema/diagram.schema";
import { diagramVersionModel } from "../schema/diagram.version.schema";
import { IPayloadDiagram } from "../@types";
import { invalidateRoom } from "../../../collab/server";

export class BasedDiagram {
     public async getDiagramService(payload: IPayloadDiagram): Promise<any> {
          const diagram: any = await diagramModel.findOne({ site_id: payload.siteId }).read("secondaryPreferred")
          if (!diagram) {
               return { success: false, error: true, message: "Diagram not found", data: null }
          }

          const data = {
               id: diagram._id,
               site_id: diagram.site_id,
               projectId: diagram.projectId,
               version: diagram.version,
               nodes: Array.isArray(diagram.nodes) ? diagram.nodes : [],
               edges: Array.isArray(diagram.edges) ? diagram.edges : [],
               metadata: diagram.metadata ?? null,
               createdAt: diagram.createdAt,
               updatedAt: diagram.updatedAt,
          }

          return { success: true, error: false, message: "Diagram fetched successfully", data }
     }

     public async updateDiagramService(payload: IPayloadDiagram): Promise<any> {
          const diagram = await diagramModel.findOne({ projectId: payload.projectId }).read("secondaryPreferred")
          if (!diagram) {
               return { success: false, error: true, message: "Diagram not found", data: null }
          }

          const nextVersion = diagram.version + 1

          diagram.nodes = payload.nodes
          diagram.edges = payload.edges
          if (payload.metadata !== undefined) {
               diagram.metadata = payload.metadata
          }
          diagram.version = nextVersion
          await diagram.save()

          await diagramVersionModel.create({
               diagramId: diagram._id,
               version: nextVersion,
               nodes: payload.nodes,
               edges: payload.edges,
               metadata: payload.metadata ?? diagram.metadata,
               createdById: payload.user !== undefined ? String(payload.user) : undefined,
          })

          await invalidateRoom(diagram.site_id, { nodes: diagram.nodes, edges: diagram.edges, metadata: diagram.metadata })
          await invalidateUserProjectsCache(payload.user)
          return { success: true, error: false, message: "Success update diagram", data: diagram }
     }

     public async getVersionsService(payload: IPayloadDiagram): Promise<any> {
          const diagram = await diagramModel.findOne({ projectId: payload.projectId }).select("_id").read("secondaryPreferred")
          if (!diagram) {
               return { success: false, error: true, message: "Diagram not found", data: null }
          }

          const page = Number(payload.page) || 1
          const limit = Number(payload.limit) || 10
          const skip = (page - 1) * limit

          const [versions, total] = await Promise.all([
               diagramVersionModel
                    .find({ diagramId: diagram._id })
                    .sort({ version: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
               diagramVersionModel.countDocuments({ diagramId: diagram._id })
          ])

          return {
               success: true,
               error: false,
               message: "Success fetch versions",
               data: versions,
               pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
               }
          }
     }

     public async getVersionService(payload: IPayloadDiagram): Promise<any> {
          const diagram = await diagramModel.findOne({ projectId: payload.projectId }).select("_id").read("secondaryPreferred")
          if (!diagram) {
               return { success: false, error: true, message: "Diagram not found", data: null }
          }

          const version = await diagramVersionModel
               .findOne({ diagramId: diagram._id, site_id: payload.versionId })
               .lean()
          if (!version) {
               return { success: false, error: true, message: "Version not found", data: null }
          }

          return { success: true, error: false, message: "Success fetch version", data: version }
     }

     public async restoreVersionService(payload: IPayloadDiagram): Promise<any> {
          const diagram = await diagramModel.findOne({ projectId: payload.projectId }).read("secondaryPreferred")
          if (!diagram) {
               return { success: false, error: true, message: "Diagram not found", data: null }
          }

          const version = await diagramVersionModel
               .findOne({ diagramId: diagram._id, site_id: payload.versionId })
               .lean()
          if (!version) {
               return { success: false, error: true, message: "Version not found", data: null }
          }

          const nextVersion = diagram.version + 1

          diagram.nodes = version.nodes
          diagram.edges = version.edges
          diagram.metadata = version.metadata
          diagram.version = nextVersion
          await diagram.save()

          await diagramVersionModel.create({
               diagramId: diagram._id,
               version: nextVersion,
               nodes: version.nodes,
               edges: version.edges,
               metadata: version.metadata,
               createdById: payload.user !== undefined ? String(payload.user) : undefined,
          })

          await invalidateRoom(diagram.site_id, { nodes: diagram.nodes, edges: diagram.edges, metadata: diagram.metadata })
          await invalidateUserProjectsCache(payload.user)
          return { success: true, error: false, message: "Success restore version", data: diagram }
     }
}
