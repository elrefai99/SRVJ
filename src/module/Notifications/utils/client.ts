import { SSEClient } from "../@types";

// userId -> set of active SSE connections (one per tab/device)
export const clients = new Map<string, Set<SSEClient>>();
