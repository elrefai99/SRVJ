import * as Y from "yjs";
import { diagramYDocModel } from "../module/diagram/schema/diagram.ydoc.schema";
import { diagramModel } from "../module/diagram/schema/diagram.schema";

export async function loadDocument(diagramId: string, doc: Y.Doc): Promise<void> {
     const snapshot = await diagramYDocModel.findOne({ diagramId }).select({ state: 1 }).lean();
     if (snapshot?.state) {
          Y.applyUpdate(doc, new Uint8Array(snapshot.state));
          return;
     }

     const diagram = await diagramModel.findById(diagramId).select({ nodes: 1, edges: 1, metadata: 1 }).lean();
     if (!diagram) return;

     doc.transact(() => {
          const nodes = doc.getArray("nodes");
          const edges = doc.getArray("edges");
          const metadata = doc.getMap("metadata");
          if (Array.isArray(diagram.nodes)) nodes.push(diagram.nodes);
          if (Array.isArray(diagram.edges)) edges.push(diagram.edges);
          if (diagram.metadata && typeof diagram.metadata === "object") {
               for (const [key, value] of Object.entries(diagram.metadata)) metadata.set(key, value);
          }
     });
}

export async function storeDocument(diagramId: string, siteId: string, doc: Y.Doc): Promise<void> {
     const state = Buffer.from(Y.encodeStateAsUpdate(doc));

     await diagramYDocModel.updateOne(
          { diagramId },
          { $set: { state } },
          { upsert: true },
     );

     const nodes = doc.getArray("nodes").toJSON();
     const edges = doc.getArray("edges").toJSON();
     const metadata = doc.getMap("metadata").toJSON();

     await diagramModel.updateOne({ site_id: siteId }, { $set: { nodes, edges, metadata } });
}
