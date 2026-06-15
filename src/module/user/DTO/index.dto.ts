import { z } from 'zod'

export const updateProfileDTO = z.object({
     id: z.number(),
     fullname: z
          .string()
          .min(2, 'Name must be at least 2 characters')
          .max(50, 'Name must not exceed 50 characters'),
     image: z.any()
})
export type updateProfileDTO = z.infer<typeof updateProfileDTO>
