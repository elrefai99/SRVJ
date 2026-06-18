import { SSEClient } from "../@types";

export const clients = new Map<string, Set<SSEClient>>();
