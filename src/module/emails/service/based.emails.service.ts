import prisma from "../../../config/prisma";

export class BasedEmails {
     constructor() { }

     public async opendService(payload: string): Promise<any> {
          const email = await prisma.emails.findFirst({
               where: {
                    email_id: payload,
                    seen: false
               },
               select: {
                    id: true
               }
          })
          if (!email) {
               return { opend: true }
          }
          await prisma.emails.update({
               where: {
                    id: email.id
               },
               data: {
                    seen: true
               }
          })
          return { opend: true }
     }
     public async clickService(payload: string): Promise<any> {
          const email = await prisma.emails.findFirst({
               where: {
                    email_id: payload,
                    click: false
               },
               select: {
                    id: true
               }
          })
          if (!email) {
               return { click: true }
          }
          await prisma.emails.update({
               where: {
                    id: email.id
               },
               data: {
                    click: true
               }
          })
          return { click: true }
     }
}
