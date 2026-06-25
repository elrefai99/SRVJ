import { model, Schema } from "mongoose";
import { IDiagram } from "../@types";
import { v4 as uuidv4 } from 'uuid';

const diagramSchema = new Schema<IDiagram>({
     site_id: {
          type: String,
          default: uuidv4,
          index: true,
          unique: true,
     },
     projectId: {
          type: String,
          required: true,
          index: true,
          unique: true,
     },
     version: {
          type: Number,
          default: 1,
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
}, {
     timestamps: true,
})

diagramSchema.index({ createdAt: -1 });

export const diagramModel = model<IDiagram>('diagram', diagramSchema)
