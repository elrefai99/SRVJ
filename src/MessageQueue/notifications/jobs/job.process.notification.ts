import { Job } from "bullmq";
import { v4 as uuidv4 } from 'uuid'
import { connectRedis, redis } from "../../../module/Notifications/shared/redis";
import prisma from "../../../config/prisma";

export const sendNotification = async (data: any) => {
     try {
          const payload = {
               id: uuidv4(),
               sender: data.sender,
               userId: data.userId,
               type: data.type,
               title: data.title,
               message: data.message,
               createdAt: new Date().toISOString(),
          };
          await connectRedis();
          await prisma.notification.create({
               data: {
                    fromUserId: Number(payload.sender),
                    toUserId: Number(payload.userId),
                    title: payload.title,
                    message: payload.message,
               }
          })
          await redis.publish("notifications", JSON.stringify(payload));
     }
     catch (err) {
          console.error(`[sendEmail] Failed to send email type "${data.type}":`, err);
          throw err;
     }
}

export const jobNotificationProcessor = async (job: Job): Promise<any> => {
     await sendNotification(job.data);
};
