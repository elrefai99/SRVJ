import prisma from "../../../config/prisma";
import { avatarProcess } from "../../../functions/upload/image.process";
import { Prisma, tableStatus } from "../../../generated/prisma";
import { updateProfileDTO } from "../DTO/index.dto";

export class BaseUser {
     constructor() {

     }

     public async update_profile(userId: number, payload: updateProfileDTO) {
          const data: Prisma.UserUpdateInput = { fullname: payload?.fullname }

          if (payload?.image) {
               data.avatar = await avatarProcess(payload?.image, userId)
          }

          await prisma.user.update({
               where: { id: userId },
               data,
               select: { id: true, fullname: true, avatar: true },
          })
          return true
     }
     public async delete_profile(payload: any) {
          await prisma.user.update({
               where: { id: payload },
               data: {
                    status: tableStatus.inactive
               },
          })
          return true
     }
}
