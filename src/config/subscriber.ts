import { connectSubscriber, subscriber } from "../module/Notifications/shared/redis";
import { clients } from "../module/Notifications/utils/client";

export const startSubscriber = async () => {
     await connectSubscriber();

     await subscriber.subscribe("notifications", (message) => {
          try {
               const payload = JSON.parse(message);

               const connections = clients.get(String(payload.userId));

               if (!connections || connections.size === 0) return;

               const frame =
                    `event: notification\n` +
                    `data: ${JSON.stringify(payload)}\n\n`;

               for (const client of connections) {
                    client.res.write(frame);
               }
          } catch (e) { }
     });
};
