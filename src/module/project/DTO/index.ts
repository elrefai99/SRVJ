import { z } from 'zod'

export const createProjectDTO = z.object({
     title: z
          .string()
          .min(2, 'title must be at least 2 characters')
          .max(50, 'title must not exceed 50 characters'),
     description: z
          .string()
          .max(800, 'description must not exceed 800 characters'),
     visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED'])
})
export type createProjectDTO = z.infer<typeof createProjectDTO>

export const editProjectDTO = z.object({
     title: z
          .string()
          .min(2, 'title must be at least 2 characters')
          .max(50, 'title must not exceed 50 characters').optional(),
     description: z
          .string()
          .max(800, 'description must not exceed 800 characters').optional(),
     visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional()
})
export type editProjectDTO = z.infer<typeof editProjectDTO>
