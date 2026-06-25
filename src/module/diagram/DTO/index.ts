import { z } from 'zod'

export const updateDiagramDTO = z.object({
     nodes: z.array(z.any()),
     edges: z.array(z.any()),
     metadata: z.record(z.string(), z.any()).optional()
})
export type updateDiagramDTO = z.infer<typeof updateDiagramDTO>
