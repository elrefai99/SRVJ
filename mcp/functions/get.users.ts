import prisma from "../../src/config/prisma";

export const getUsers = async (payload: any) => {
     const result = await prisma.user.findMany({
          take: payload,
          select: {
               id: true,
               fullname: true,
               email: true,
               createdAt: true
          },
          orderBy: { createdAt: "desc" },
     });
     return result
}
