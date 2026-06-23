import { describe, it, expect } from 'vitest'
import type { Request } from 'express'
import { getAuthenticatedUser } from './authenticated-user'
import { AppError } from './errors/app-error'

const asReq = (user: unknown) => ({ user }) as unknown as Request

describe('getAuthenticatedUser', () => {
  it('returns the user when req.user.id is a number', () => {
    const user = { id: 7, email: 'a@b.com' }
    expect(getAuthenticatedUser(asReq(user))).toBe(user)
  })

  it('throws an unauthorized AppError when req.user is missing', () => {
    try {
      getAuthenticatedUser(asReq(undefined))
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).statusCode).toBe(401)
      expect((err as AppError).message).toBe('Please login first')
    }
  })

  it('throws when req.user.id is not a number', () => {
    expect(() => getAuthenticatedUser(asReq({ id: '7' }))).toThrow(AppError)
  })
})
