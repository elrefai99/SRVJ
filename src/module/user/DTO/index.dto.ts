import { z } from 'zod'

export const updateProfileDTO = z.object({
     fullname: z
          .string()
          .min(2, 'Name must be at least 2 characters')
          .max(50, 'Name must not exceed 50 characters'),
     email: z
          .string()
          .max(100, 'Email must not exceed 100 characters'),
})
export type updateProfileDTO = z.infer<typeof updateProfileDTO>
