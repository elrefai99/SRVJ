import { Job } from "bullmq";

export const sendEmail = async (data: any) => {
     try {

     }
     catch (err) {
          console.error(`[sendEmail] Failed to send email type "${data.type}":`, err);
          throw err;
     }
}

export const jobProcessor = async (job: Job): Promise<any> => {
     await sendEmail(job.data);
};
