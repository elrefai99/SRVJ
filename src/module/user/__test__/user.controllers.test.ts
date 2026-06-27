import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { profileController } from '../Controller/profile.controller'
import { updateProfileController } from '../Controller/update.controller'
import { deleteController } from '../Controller/delete.controller'
import { BaseUser } from '../Service/base.user.service'

vi.mock('../Service/base.user.service')

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({ body: {}, params: {}, query: {}, user: { id: 1, fullname: 'Test User' }, ...overrides } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     return r
}

const next = vi.fn() as unknown as NextFunction

describe('profileController', () => {
     it('responds 200 with req.user as data', async () => {
          const user = { id: 1, fullname: 'Test User', email: 'a@b.com' }
          const r = makeRes()
          await profileController(makeReq({ user }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: user }))
     })
})

describe('updateProfileController', () => {
     beforeEach(() => {
          vi.mocked(BaseUser).mockImplementation(() => ({
               update_profile: vi.fn().mockResolvedValue(true),
          } as any))
     })

     it('responds 200 when update succeeds', async () => {
          const r = makeRes()
          await updateProfileController(makeReq({ body: { fullname: 'New Name' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
     })

     it('responds 400 when update fails', async () => {
          vi.mocked(BaseUser).mockImplementation(() => ({
               update_profile: vi.fn().mockResolvedValue(false),
          } as any))

          const r = makeRes()
          await updateProfileController(makeReq({ body: { fullname: 'New Name' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: true }))
     })

     it('passes file buffer to update_profile when file is present', async () => {
          const updateMock = vi.fn().mockResolvedValue(true)
          vi.mocked(BaseUser).mockImplementation(() => ({ update_profile: updateMock } as any))

          const fileBuffer = Buffer.from('image-data')
          await updateProfileController(
               makeReq({ body: { fullname: 'A' }, file: { buffer: fileBuffer } }),
               makeRes(),
               next,
          )

          expect(updateMock).toHaveBeenCalledWith(1, expect.objectContaining({ image: fileBuffer }))
     })
})

describe('deleteController', () => {
     beforeEach(() => {
          vi.mocked(BaseUser).mockImplementation(() => ({
               delete_profile: vi.fn().mockResolvedValue(true),
          } as any))
     })

     it('responds 200 when delete succeeds', async () => {
          const r = makeRes()
          await deleteController(makeReq(), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
     })

     it('responds 400 when delete fails', async () => {
          vi.mocked(BaseUser).mockImplementation(() => ({
               delete_profile: vi.fn().mockResolvedValue(false),
          } as any))

          const r = makeRes()
          await deleteController(makeReq(), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: true }))
     })
})
