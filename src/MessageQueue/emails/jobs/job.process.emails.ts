import { Job } from "bullmq";
import { forgetPasswordTemp, generateUUID, inviteTemp, loginTemp, registerTemp, resendFunction } from "../../../gen-import";

export const sendEmail = async (data: any) => {
     try {
          const uuid = generateUUID()
          data.uuid = uuid

          switch (data.type) {
               case "login":
                    await resendFunction(data.email, loginTemp(data.emailBody), data.subject, uuid, "auth")
                    break;
               case "register":
                    await resendFunction(data.email, registerTemp(data.emailBody), data.subject, uuid, "auth")
                    break;
               case "invite":
                    await resendFunction(data.email, inviteTemp(data.emailBody), data.subject, uuid, "invite")
                    break;
               case "forgatePassword":
                    await resendFunction(data.email, forgetPasswordTemp(data.emailBody), data.subject, uuid, "auth")
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
