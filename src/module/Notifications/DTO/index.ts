import { z } from 'zod'

export const publishNotificationDTO = z.object({
     targetUserId: z.number().int().positive(),
     type: z.string().min(1).max(50),
     title: z.string().min(1).max(200),
     message: z.string().max(1000).optional(),
})
export type publishNotificationDTO = z.infer<typeof publishNotificationDTO>
