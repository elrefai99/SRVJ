import prisma from "../../../config/prisma";
import { cacheService } from "../../../functions/redis/cache.service.fun";
import { avatarProcess } from "../../../functions/upload/image.process";
import { Prisma, tableStatus } from "../../../generated/prisma";
import { updateProfileDTO } from "../DTO/index.dto";

export class BaseUser {
     private redis: cacheService
     constructor() {
          this.redis = new cacheService()
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
          await this.invalidateUserCaches(userId)
          return true
     }
     public async delete_profile(payload: any) {
          await prisma.user.update({
               where: { id: payload },
               data: {
                    status: tableStatus.inactive
               },
          })
          await this.invalidateUserCaches(payload)
          return true
     }

     private async invalidateUserCaches(userId: number) {
          const memberships = await prisma.projectMember.findMany({
               where: { userId, status: tableStatus.active },
               select: { project: { select: { ownerId: true } } },
          })

          const ownerKeys = [...new Set(memberships.map((m) => m.project.ownerId))]
               .map((ownerId) => `projects:${ownerId}`)

          await Promise.all([
               this.redis.deleteData(`user:${userId}`),
               ...ownerKeys.map((key) => this.redis.deleteData(key)),
          ])
     }
}
