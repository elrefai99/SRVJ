import { Document } from "mongoose"

export interface IDiagram extends Document {
     site_id: any
     projectId: string
     version: number
     nodes: any;
     edges: any;
     metadata?: Record<string, any>;

}
export interface IDiagramVersion extends Document {
     site_id: any;

     diagramId: mongoose.Types.ObjectId;

     version: number;

     nodes: any;
     edges: any;
     metadata?: Record<string, any>;

     createdById?: string;
}

export interface IPayloadDiagram {
     siteId?: string;
     projectId?: string;
     nodes?: any;
     edges?: any;
     metadata?: Record<string, any>;
     user?: number;
     versionId?: string;
     page?: number | string;
     limit?: number | string;
}
