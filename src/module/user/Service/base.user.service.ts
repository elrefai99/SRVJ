import prisma from "../../../config/prisma";
import { avatarProcess } from "../../../functions/upload/image.process";
import { Prisma } from "../../../generated/prisma";
import { updateProfileDTO } from "../DTO/index.dto";

export class BaseUser {
     constructor() {

     }

     public async update_profile(userId: number, payload: updateProfileDTO) {
          const data: Prisma.UserUpdateInput = { fullname: payload.fullname }

          if (payload.image) {
               data.avatar = await avatarProcess(payload.image, userId)
          }

          return prisma.user.update({
               where: { id: userId },
               data,
               select: { id: true, fullname: true, avatar: true },
          })
     }
}
