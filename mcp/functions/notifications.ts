import prisma from "../../src/config/prisma"

export const lastNotifications = async (limit: number) => {
     const result = await prisma.notification.findMany({
          take: limit,
          include: {
               fromUser: {
                    select: {
                         fullname: true,
                         email: true
                    }
               },
               toUser: {
                    select: {
                         fullname: true,
                         email: true
                    }
               }
          },
          orderBy: { createdAt: "desc" },
     })
     return result
}
