import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { registerController } from '../controller/register.controller'
import { loginController } from '../controller/login.controller'
import { logoutConrtoller } from '../controller/logout.controller'
import { refreshController } from '../controller/refresh.controller'
import { googleController } from '../controller/google.controller'
import { BaseAuth } from '../service/base.auth.service'
import { token_PASETO } from '../utils/paseto.utils'
import { V4 } from 'paseto'
import prisma from '../../../config/prisma'

vi.mock('../service/base.auth.service')
vi.mock('../utils/paseto.utils')
vi.mock('../../../MessageQueue/emails/Queue/queue.email', () => ({ addJobToQueue: vi.fn() }))
vi.mock('../../../utils/getLocation', () => ({ getLocation: vi.fn().mockReturnValue('Test Location') }))
vi.mock('../../../utils/loadKey', () => ({ loadPubliceKey: vi.fn().mockReturnValue('mock-public-key') }))
vi.mock('paseto', () => ({ V4: { verify: vi.fn() } }))
vi.mock('../../../config/prisma', () => ({
     default: { user: { findFirst: vi.fn() } },
}))

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({ body: {}, params: {}, query: {}, cookies: {}, useragent: { browser: 'Chrome' }, clientIP: '127.0.0.1', ...overrides } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     r.cookie = vi.fn().mockReturnValue(r)
     r.clearCookie = vi.fn().mockReturnValue(r)
     return r
}

const next = vi.fn() as unknown as NextFunction

beforeEach(() => {
     vi.mocked(token_PASETO).mockResolvedValue('mock-token')
})

describe('registerController', () => {
     it('responds 400 when user already exists', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               create_user: vi.fn().mockResolvedValue({ success: false, error: true, message: 'User exists', data: null }),
          } as any))

          const r = makeRes()
          await registerController(makeReq({ body: { email: 'a@b.com', password: 'p', fullname: 'A' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: true }))
     })

     it('responds 201 with token on success', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               create_user: vi.fn().mockResolvedValue({ success: true, error: false, message: 'Success', data: { id: 1 } }),
          } as any))

          const r = makeRes()
          await registerController(makeReq({ body: { email: 'a@b.com', password: 'p', fullname: 'A' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(201)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { token: 'mock-token' } }))
     })

     it('sets access_token and refresh_token cookies on success', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               create_user: vi.fn().mockResolvedValue({ success: true, error: false, message: 'Success', data: { id: 1 } }),
          } as any))

          const r = makeRes()
          await registerController(makeReq({ body: { email: 'a@b.com', password: 'p', fullname: 'A' } }), r, next)

          expect(r.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
          expect(r.cookie).toHaveBeenCalledWith('refresh_token', 'mock-token', expect.any(Object))
     })
})

describe('loginController', () => {
     it('responds 400 on failed login', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               login_service: vi.fn().mockResolvedValue({ success: false, error: true, message: 'Bad credentials', data: null }),
          } as any))

          const r = makeRes()
          await loginController(makeReq({ body: { email: 'a@b.com', password: 'wrong' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: true }))
     })

     it('responds 200 with token on success', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               login_service: vi.fn().mockResolvedValue({ success: true, error: false, message: 'Login OK', data: { id: 1, fullname: 'Test' } }),
          } as any))

          const r = makeRes()
          await loginController(makeReq({ body: { email: 'a@b.com', password: 'p' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { token: 'mock-token' } }))
     })

     it('sets access_token and refresh_token cookies on success', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               login_service: vi.fn().mockResolvedValue({ success: true, error: false, message: 'Login OK', data: { id: 1, fullname: 'Test' } }),
          } as any))

          const r = makeRes()
          await loginController(makeReq({ body: { email: 'a@b.com', password: 'p' } }), r, next)

          expect(r.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
          expect(r.cookie).toHaveBeenCalledWith('refresh_token', 'mock-token', expect.any(Object))
     })
})

describe('logoutController', () => {
     it('clears both cookies and responds 200', async () => {
          const r = makeRes()
          await logoutConrtoller(makeReq(), r, next)

          expect(r.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object))
          expect(r.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cookie is deleted' }))
     })
})

describe('refreshController', () => {
     it('calls next with 400 error when refresh_token cookie is absent', async () => {
          const mockNext = vi.fn()
          await refreshController(makeReq({ cookies: {} }), makeRes(), mockNext as unknown as NextFunction)

          expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
     })

     it('responds 200 and sets access_token cookie when token is valid', async () => {
          vi.mocked(V4.verify).mockResolvedValue({ data: { user_id: 1 }, token_version: 2 } as any)
          vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 1 } as any)

          const r = makeRes()
          await refreshController(makeReq({ cookies: { refresh_token: 'valid-token' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
          expect(r.cookie).toHaveBeenCalledWith('refresh_token', 'mock-token', expect.any(Object))
     })

     it('rejects with 401 AppError when token verification fails', async () => {
          vi.mocked(V4.verify).mockRejectedValue(new Error('invalid'))

          await expect(
               refreshController(makeReq({ cookies: { refresh_token: 'bad-token' } }), makeRes(), next),
          ).rejects.toMatchObject({ statusCode: 401 })
     })

     it('rejects with 401 AppError when user does not exist (catch block re-wraps as unauthorized)', async () => {
          vi.mocked(V4.verify).mockResolvedValue({ data: { user_id: 99 } } as any)
          vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

          await expect(
               refreshController(makeReq({ cookies: { refresh_token: 'valid-token' } }), makeRes(), next),
          ).rejects.toMatchObject({ statusCode: 401 })
     })
})

describe('googleController', () => {
     it('responds 400 when Google service fails', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               googleService: vi.fn().mockResolvedValue({ success: false, error: true, message: 'Invalid token', data: null }),
          } as any))

          const r = makeRes()
          await googleController(makeReq({ body: { credential: 'bad' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: true }))
     })

     it('responds 201 and sets cookies on existing user login', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               googleService: vi.fn().mockResolvedValue({
                    success: true, error: false, message: 'OK',
                    data: { id: 1, email: 'a@g.com', fullname: 'A', login: true },
               }),
          } as any))

          const r = makeRes()
          await googleController(makeReq({ body: { credential: 'token' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(201)
          expect(r.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
          expect(r.cookie).toHaveBeenCalledWith('refresh_token', 'mock-token', expect.any(Object))
     })

     it('responds 201 and sets cookies on new user registration via Google', async () => {
          vi.mocked(BaseAuth).mockImplementation(() => ({
               googleService: vi.fn().mockResolvedValue({
                    success: true, error: false, message: 'OK',
                    data: { id: 2, email: 'b@g.com', fullname: 'B', register: true },
               }),
          } as any))

          const r = makeRes()
          await googleController(makeReq({ body: { credential: 'token' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(201)
          expect(r.cookie).toHaveBeenCalledWith('refresh_token', 'mock-token', expect.any(Object))
     })
})
