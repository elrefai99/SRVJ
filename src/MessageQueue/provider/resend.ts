import { Resend } from 'resend';
import prisma from '../../config/prisma';

type formType = "auth" | "invite" | "user"

export const resendFunction = async (to: string, html: string, subject: string, uuid: string, type: formType) => {
     const resend = new Resend(process.env.RESEND_API as string);
     try {
          const { data, error } = await resend.emails.send({
               from: `SRVJ <srvj${type == "auth" ? ".auth" : type == "invite" ? ".invite" : type == "user" ? ".user" : ""}@elrefai.me>`,
               to,
               subject,
               html,
          });

          if (error) {
               console.error("❌ Resend error:", error);
               throw error;
          }
          await prisma.emails.create({
               data: {
                    email_id: data?.id as string,
                    email: to,
                    site_id: uuid
               }
          })
          console.log("✅ Email sent successfully via Resend:", data?.id);
          return;
     } catch (error) {
          console.error("❌ Failed to send email via Resend:", error);
          throw error;
     }
}
