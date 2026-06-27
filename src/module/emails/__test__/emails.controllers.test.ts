import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { openedController } from '../Controller/opened.controller'
import { clickController } from '../Controller/click.controller'
import { BasedEmails } from '../service/based.emails.service'

vi.mock('../service/based.emails.service')

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({ body: {}, params: {}, query: {}, ...overrides } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     return r
}

const next = vi.fn() as unknown as NextFunction

describe('openedController', () => {
     beforeEach(() => {
          vi.mocked(BasedEmails).mockImplementation(() => ({
               opendService: vi.fn().mockResolvedValue({ opend: true }),
          } as any))
     })

     it('responds 200 when email open is tracked', async () => {
          const r = makeRes()
          await openedController(makeReq({ params: { id: 'email-abc' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Success seen emails' }))
     })

     it('calls opendService with the email id from params', async () => {
          const opendMock = vi.fn().mockResolvedValue({ opend: true })
          vi.mocked(BasedEmails).mockImplementation(() => ({ opendService: opendMock } as any))

          await openedController(makeReq({ params: { id: 'email-xyz' } }), makeRes(), next)

          expect(opendMock).toHaveBeenCalledWith('email-xyz')
     })
})

describe('clickController', () => {
     beforeEach(() => {
          vi.mocked(BasedEmails).mockImplementation(() => ({
               clickService: vi.fn().mockResolvedValue({ click: true }),
          } as any))
     })

     it('responds 200 when email click is tracked', async () => {
          const r = makeRes()
          await clickController(makeReq({ params: { id: 'email-abc' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Success click on emails' }))
     })

     it('calls clickService with the email id from params', async () => {
          const clickMock = vi.fn().mockResolvedValue({ click: true })
          vi.mocked(BasedEmails).mockImplementation(() => ({ clickService: clickMock } as any))

          await clickController(makeReq({ params: { id: 'email-xyz' } }), makeRes(), next)

          expect(clickMock).toHaveBeenCalledWith('email-xyz')
     })
})
