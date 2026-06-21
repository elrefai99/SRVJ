import { Job } from "bullmq";
import { loginTemp } from "../template/login";
import { registerTemp } from "../template/register";
import { resendFunction } from "../../../MessageQueue/provider/resend";
import { generateUUID } from "../../../utils/uuid";

export const sendEmail = async (data: any) => {
     try {
          const uuid = generateUUID()
          data.uuid = uuid
          switch (data.type) {
               case "login":
                    await resendFunction(data.email, loginTemp(data.emailBody), data.subject, uuid)
                    break;
               case "register":
                    await resendFunction(data.email, registerTemp(data.emailBody), data.subject, uuid)
                    break;
          }
     }
     catch (err) {
          console.error(`[sendEmail] Failed to send email type "${data.type}":`, err);
          throw err;
     }
}

export const jobProcessor = async (job: Job): Promise<any> => {
     await sendEmail(job.data);
};
