// subscriber.ts
import { clients } from "../utils/client";
import { redis, connectRedis } from "./redis";

export const startSubscriber = async () => {
     await connectRedis();

     await redis.subscribe("notifications", (message) => {
          try {
               const payload = JSON.parse(message);
               const client = clients.get(payload.userId);

               if (!client) return;

               client.res.write(
                    `event: notification\n` +
                    `data: ${JSON.stringify(payload)}\n\n`
               );
          } catch (e) { }
     });
};
