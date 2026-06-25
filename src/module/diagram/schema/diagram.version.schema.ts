import { model, Schema } from "mongoose";
import { IDiagramVersion } from "../@types";
import { v4 as uuidv4 } from 'uuid';

const diagramVersionSchema = new Schema<IDiagramVersion>(
     {
          site_id: {
               type: String,
               default: uuidv4,
               index: true,
               unique: true,
          },
          diagramId: {
               type: Schema.Types.ObjectId,
               ref: "Diagram",
               required: true,
               index: true,
          },
          version: {
               type: Number,
               required: true,
          },
          nodes: {
               type: Schema.Types.Mixed,
               default: [],
          },
          edges: {
               type: Schema.Types.Mixed,
               default: [],
          },
          metadata: {
               type: Schema.Types.Mixed,
               default: {},
          },
          createdById: {
               type: String,
          },
     },
     {
          timestamps: true,
     }
);

export const diagramVersionModel = model<IDiagramVersion>('diagramVersion', diagramVersionSchema)
