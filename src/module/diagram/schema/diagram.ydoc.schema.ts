import { model, Schema } from "mongoose";

export interface IDiagramYDoc {
     diagramId: string;
     state: Buffer;
}

const diagramYDocSchema = new Schema<IDiagramYDoc>(
     {
          diagramId: {
               type: String,
               required: true,
               unique: true,
               index: true,
          },
          state: {
               type: Buffer,
               required: true,
          },
     },
     {
          timestamps: true,
     }
);

export const diagramYDocModel = model<IDiagramYDoc>("diagramYDoc", diagramYDocSchema);
