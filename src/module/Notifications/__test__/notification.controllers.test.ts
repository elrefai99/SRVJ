import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { listController } from '../controller/list.controller'
import { seenController } from '../controller/seen.controller'
import { streamController } from '../controller/stream.controller'
import { clients } from '../utils/client'
import prisma from '../../../config/prisma'

vi.mock('../../../config/prisma', () => ({
     default: {
          notification: {
               findMany: vi.fn(),
               count: vi.fn(),
               updateMany: vi.fn(),
          },
     },
}))

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({
          body: {}, params: {}, query: {},
          user: { id: 1 },
          on: vi.fn(),
          ...overrides,
     } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     r.writeHead = vi.fn()
     r.flushHeaders = vi.fn()
     r.write = vi.fn()
     return r
}

const next = vi.fn() as unknown as NextFunction

describe('listController', () => {
     const notifications = [{ id: 1, message: 'hello', fromUser: { id: 2 } }]

     beforeEach(() => {
          vi.mocked(prisma.notification.findMany).mockResolvedValue(notifications as any)
          vi.mocked(prisma.notification.count)
               .mockResolvedValueOnce(1)
               .mockResolvedValueOnce(0)
     })

     it('responds with notification list and pagination', async () => {
          const r = makeRes()
          await listController(makeReq({ query: { page: '1', limit: '10' } }), r, next)

          expect(r.json).toHaveBeenCalledWith(
               expect.objectContaining({
                    data: notifications,
                    pagination: expect.objectContaining({ page: 1, limit: 10, total: 1 }),
               }),
          )
     })

     it('defaults to page 1 and limit 10 when query params are absent', async () => {
          const r = makeRes()
          await listController(makeReq({ query: {} }), r, next)

          expect(r.json).toHaveBeenCalledWith(
               expect.objectContaining({ pagination: expect.objectContaining({ page: 1, limit: 10 }) }),
          )
     })
})

describe('seenController', () => {
     it('marks all unread notifications as read and responds 200', async () => {
          vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as any)

          const r = makeRes()
          await seenController(makeReq(), r, next)

          expect(prisma.notification.updateMany).toHaveBeenCalledWith(
               expect.objectContaining({ where: { toUserId: 1, isRead: false }, data: { isRead: true } }),
          )
          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
     })
})

describe('streamController', () => {
     afterEach(() => {
          clients.clear()
     })

     it('sets SSE response headers', async () => {
          const r = makeRes()
          await streamController(makeReq(), r, next)

          expect(r.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'text/event-stream' }))
     })

     it('writes the initial connected frame', async () => {
          const r = makeRes()
          await streamController(makeReq(), r, next)

          expect(r.write).toHaveBeenCalledWith(': connected\n\n')
     })

     it('adds client to the clients Map', async () => {
          const r = makeRes()
          await streamController(makeReq({ user: { id: 42 } }), r, next)

          expect(clients.has('42')).toBe(true)
          expect(clients.get('42')!.size).toBe(1)
     })

     it('removes client from Map on request close', async () => {
          let closeHandler: () => void = () => {}
          const req = makeReq({ user: { id: 7 }, on: vi.fn((event, cb) => { if (event === 'close') closeHandler = cb }) })
          const r = makeRes()

          await streamController(req, r, next)
          expect(clients.has('7')).toBe(true)

          closeHandler()
          expect(clients.has('7')).toBe(false)
     })
})
