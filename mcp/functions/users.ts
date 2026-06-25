import prisma from "../../src/config/prisma";
import { tableStatus } from "../../src/generated/prisma";

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

export const getUserUsername = async (payload: any) => {
     const result = await prisma.user.findFirst({
          where: {
               username: payload,
          },
          select: {
               id: true,
               fullname: true,
               email: true,
               createdAt: true
          },
     });
     return result
}

export const totalUsers = async (payload: any) => {
     const result = await prisma.user.count({
          where: {
               status: payload as tableStatus
          }
     });
     return result
}
