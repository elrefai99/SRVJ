import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodSchema } from 'zod'
import { asyncHandler } from '../utils/api-requesthandler'
import { AppError } from '../utils/errors/app-error'

export function validateDTO<T>(schema: ZodSchema<T>): RequestHandler {
     return asyncHandler(
          async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
               const result: any = schema.safeParse(req.body)

               if (!result.success) {
                    const messages = result.error.errors.map((e: any) => e.message).join('; ')
                    return next(AppError.badRequest(messages))
               }

               req.body = result.data
               next()
          }
     )
}
