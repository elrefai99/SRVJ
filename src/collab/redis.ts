import { createClient, type RedisClientType } from "redis";
import { createLogger } from "../utils/logger";

const log = createLogger("collab-redis");

const url = process.env.REDIS_CACHE_BULLMQ as string;
const CHANNEL = "collab-sync";

export const REMOTE_ORIGIN = Symbol("collab-remote");

type RemoteUpdateHandler = (siteId: string, update: Uint8Array) => void;

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;
let connected = false;
let handler: RemoteUpdateHandler | null = null;

export const onRemoteUpdate = (fn: RemoteUpdateHandler): void => {
     handler = fn;
};

const dispatch = (raw: string): void => {
     try {
          const { siteId, update } = JSON.parse(raw) as { siteId: string; update: string };
          handler?.(siteId, new Uint8Array(Buffer.from(update, "base64")));
     } catch (err) {
          log.error({ msg: "collab redis dispatch failed", error: err instanceof Error ? err.message : String(err) });
     }
};

export const connectCollabRedis = async (): Promise<void> => {
     if (connected) return;
     if (!url) {
          log.warn({ msg: "collab redis disabled: REDIS_CACHE_BULLMQ not set (single-process mode)" });
          return;
     }
     try {
          publisher = createClient({ url });
          subscriber = publisher.duplicate();
          publisher.on("error", (err) => log.error({ msg: "collab publisher error", error: err instanceof Error ? err.message : String(err) }));
          subscriber.on("error", (err) => log.error({ msg: "collab subscriber error", error: err instanceof Error ? err.message : String(err) }));
          await publisher.connect();
          await subscriber.connect();
          await subscriber.subscribe(CHANNEL, dispatch);
          connected = true;
          log.info({ msg: "collab redis connected (multi-instance sync enabled)" });
     } catch (err) {
          connected = false;
          log.error({ msg: "collab redis connection failed (falling back to single-process mode)", error: err instanceof Error ? err.message : String(err) });
     }
};

export const publishCollabUpdate = async (siteId: string, update: Uint8Array): Promise<void> => {
     if (!connected || !publisher) return;
     try {
          await publisher.publish(CHANNEL, JSON.stringify({ siteId, update: Buffer.from(update).toString("base64") }));
     } catch (err) {
          log.error({ msg: "collab publish failed", error: err instanceof Error ? err.message : String(err) });
     }
};

export const disconnectCollabRedis = async (): Promise<void> => {
     if (!connected) return;
     connected = false;
     try {
          await subscriber?.unsubscribe(CHANNEL);
          await Promise.all([subscriber?.quit(), publisher?.quit()]);
     } catch (err) {
          log.error({ msg: "collab redis disconnect failed", error: err instanceof Error ? err.message : String(err) });
     }
};
