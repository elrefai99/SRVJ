import { createClient } from "redis";

const url = process.env.REDIS_CACHE_BULLMQ as string;

export const redis = createClient({ url });
export const subscriber: typeof redis = redis.duplicate();

let connected = false;
let subscriberConnected = false;

export const connectRedis = async () => {
     if (!connected) {
          await redis.connect();
          connected = true;
     }
};

export const connectSubscriber = async () => {
     if (!subscriberConnected) {
          await subscriber.connect();
          subscriberConnected = true;
     }
};
