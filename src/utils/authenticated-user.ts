import type { Request } from 'express'
import type { IUser } from '../@types'
import { AppError } from './errors/app-error'

export type AuthenticatedUser = IUser & { id: number }

export const getAuthenticatedUser = (req: Request): AuthenticatedUser => {
  if (typeof req.user?.id !== 'number') {
    throw AppError.unauthorized('Please login first')
  }

  return req.user as AuthenticatedUser
}
