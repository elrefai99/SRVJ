import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { createController } from '../controller/create.controller'
import { getController } from '../controller/get.controller'
import { editController } from '../controller/edit.controller'
import { deleteController } from '../controller/delete.controller'
import { invitesController } from '../controller/invites.controller'
import { acceptInvitesController } from '../controller/accept.controller'
import { getInvitesController } from '../controller/get.invite.controller'
import { BasedProject } from '../service/base.project.service'

vi.mock('../service/base.project.service')
vi.mock('../utils/token', () => ({ inviteToken: vi.fn().mockReturnValue('invite-token') }))
vi.mock('../../../MessageQueue/emails/Queue/queue.email', () => ({ addJobToQueue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../../MessageQueue/notifications/Queue/queue.notification', () => ({ addNotificationJobToQueue: vi.fn().mockResolvedValue(undefined) }))

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({
          body: {}, params: {}, query: {},
          user: { id: 1, fullname: 'Owner', email: 'owner@test.com' },
          ...overrides,
     } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     return r
}

const next = vi.fn() as unknown as NextFunction

describe('createController', () => {
     beforeEach(() => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               createService: vi.fn().mockResolvedValue({ success: true, diagram: { site_id: 'diag-1' } }),
          } as any))
     })

     it('responds 200 with diagram on success', async () => {
          const r = makeRes()
          await createController(makeReq({ body: { title: 'P1', description: 'Desc', visibility: 'PUBLIC' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: { site_id: 'diag-1' } }))
     })

     it('responds 400 when service fails', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               createService: vi.fn().mockResolvedValue({ success: false }),
          } as any))

          const r = makeRes()
          await createController(makeReq({ body: { title: 'P1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
     })
})

describe('getController', () => {
     it('responds 200 with projects and pagination', async () => {
          const projects = [{ id: 1, title: 'P1' }]
          vi.mocked(BasedProject).mockImplementation(() => ({
               getService: vi.fn().mockResolvedValue({
                    data: projects,
                    pagination: { total: 1, totalPages: 1 },
               }),
          } as any))

          const r = makeRes()
          await getController(makeReq({ query: { page: '1', limit: '10' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: projects, pagination: expect.any(Object) }))
     })
})

describe('editController', () => {
     beforeEach(() => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               editService: vi.fn().mockResolvedValue({ success: true }),
          } as any))
     })

     it('responds 200 on successful edit', async () => {
          const r = makeRes()
          await editController(makeReq({ body: { title: 'New Title' }, params: { id: 'proj-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
     })

     it('responds 400 when project is not found or edit fails', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               editService: vi.fn().mockResolvedValue({ success: false }),
          } as any))

          const r = makeRes()
          await editController(makeReq({ body: { title: 'X' }, params: { id: 'proj-x' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(400)
     })
})

describe('deleteController', () => {
     it('responds 200 after deleting the project', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               deleteService: vi.fn().mockResolvedValue({ success: true }),
          } as any))

          const r = makeRes()
          await deleteController(makeReq({ params: { id: 'proj-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Project deleted successfully' }))
     })
})

describe('invitesController', () => {
     it('responds 200 after sending invite', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               inviteService: vi.fn().mockResolvedValue({ success: true, data: { site_id: 'invite-1' } }),
          } as any))

          const r = makeRes()
          await invitesController(makeReq({ body: { email: 'b@test.com', project: 'proj-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Success send invite' }))
     })
})

describe('acceptInvitesController', () => {
     it('responds 200 with reject message when status is not accept', async () => {
          const r = makeRes()
          await acceptInvitesController(makeReq({ query: { status: 'reject' }, params: { id: 'invite-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User reject invite' }))
     })

     it('responds 200 with accept message when status is accept', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               acceptInviteService: vi.fn().mockResolvedValue({ project: { snederInvite: 2 } }),
          } as any))

          const r = makeRes()
          await acceptInvitesController(makeReq({ query: { status: 'accept' }, params: { id: 'invite-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User accept invite' }))
     })
})

describe('getInviteDTO', () => {
     it('rejects a request body with no token (enforced by validateDTO before the controller runs)', async () => {
          const { getInviteDTO } = await import('../DTO')
          const result = getInviteDTO.safeParse({})

          expect(result.success).toBe(false)
     })
})

describe('getInvitesController', () => {
     it('responds 403 when token is expired', async () => {
          vi.mocked(BasedProject).mockImplementation(() => ({
               getInvitesService: vi.fn().mockResolvedValue({ token: true }),
          } as any))

          const r = makeRes()
          await getInvitesController(makeReq({ body: { token: 'expired-token' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(403)
     })

     it('responds 200 with invite data on valid token', async () => {
          const invite = { id: 1, email: 'b@test.com' }
          vi.mocked(BasedProject).mockImplementation(() => ({
               getInvitesService: vi.fn().mockResolvedValue({ invite }),
          } as any))

          const r = makeRes()
          await getInvitesController(makeReq({ body: { token: 'valid-token' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: invite }))
     })
})
