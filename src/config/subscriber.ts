import { connectSubscriber, subscriber } from "../module/Notifications/shared/redis";
import { clients } from "../module/Notifications/utils/client";

export const startSubscriber = async () => {
     await connectSubscriber();

     await subscriber.subscribe("notifications", (message) => {
          try {
               const payload = JSON.parse(message);

               const client = clients.get(String(payload.userId));

               if (!client) return;

               client.res.write(
                    `event: notification\n` +
                    `data: ${JSON.stringify(payload)}\n\n`
               );
          } catch (e) { }
     });
};
