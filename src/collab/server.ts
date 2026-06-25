import { Hocuspocus } from "@hocuspocus/server";
import { loadDocument, storeDocument } from "./persistence";
import { createLogger } from "../utils/logger";
import { COLLAB_DEBOUNCE, COLLAB_MAX_DEBOUNCE } from "./env";
import type { CollabContext } from "./auth";

const log = createLogger("collab");

export const collab = new Hocuspocus<CollabContext>({
     debounce: COLLAB_DEBOUNCE,
     maxDebounce: COLLAB_MAX_DEBOUNCE,
     quiet: true,

     async onLoadDocument({ document, context }) {
          await loadDocument(context.diagramId, document);
          return document;
     },

     async onStoreDocument({ document, lastContext }) {
          if (!lastContext) return;
          await storeDocument(lastContext.diagramId, lastContext.siteId, document);
     },

     async onConnect({ context }) {
          log.info({ msg: "collab connected", userId: context.userId, diagramId: context.diagramId });
     },
});
