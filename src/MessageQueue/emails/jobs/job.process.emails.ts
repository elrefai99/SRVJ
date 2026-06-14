import { Job } from "bullmq";
import { loginTemp } from "../template/login";
import { registerTemp } from "../template/register";
import { resendFunction } from "../../../MessageQueue/provider/resend";

export const sendEmail = async (data: any) => {
     try {
          switch (data.type) {
               case "login":
                    await resendFunction(data.email, loginTemp(data.emailBody), data.subject)
                    break;
               case "register":
                    await resendFunction(data.email, registerTemp(data.emailBody), data.subject)
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
