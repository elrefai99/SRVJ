import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { getDiagramController } from '../controller/get.diagrams.controller'
import { updateDiagramController } from '../controller/update.diagram.controller'
import { getVersionsController } from '../controller/get.versions.controller'
import { getVersionController } from '../controller/get.version.controller'
import { restoreVersionController } from '../controller/restore.version.controller'
import { BasedDiagram } from '../service/base.diagram.service'

vi.mock('../service/base.diagram.service')

const makeReq = (overrides: Partial<any> = {}): Request =>
     ({
          body: {}, params: {}, query: {},
          user: { id: 1 },
          ...overrides,
     } as unknown as Request)

const makeRes = (): Response => {
     const r: any = {}
     r.status = vi.fn().mockReturnValue(r)
     r.json = vi.fn().mockReturnValue(r)
     return r
}

const next = vi.fn() as unknown as NextFunction

describe('getDiagramController', () => {
     it('responds 404 when diagram is not found', async () => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getDiagramService: vi.fn().mockResolvedValue({ success: false, message: 'Diagram not found' }),
          } as any))

          const r = makeRes()
          await getDiagramController(makeReq({ params: { siteId: 'missing' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(404)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
     })

     it('responds 200 with diagram data on success', async () => {
          const diagram = { site_id: 'd-1', nodes: [], edges: [] }
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getDiagramService: vi.fn().mockResolvedValue({ success: true, message: 'OK', data: diagram }),
          } as any))

          const r = makeRes()
          await getDiagramController(makeReq({ params: { siteId: 'd-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: diagram }))
     })
})

describe('updateDiagramController', () => {
     const nodes = [{ id: 'n1' }]
     const edges = [{ id: 'e1' }]

     it('responds 404 when diagram is not found', async () => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               updateDiagramService: vi.fn().mockResolvedValue({ success: false, message: 'Diagram not found' }),
          } as any))

          const r = makeRes()
          await updateDiagramController(makeReq({ body: { nodes, edges }, params: { projectId: 'p-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(404)
     })

     it('responds 200 with updated diagram on success', async () => {
          const updated = { site_id: 'd-1', nodes, edges }
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               updateDiagramService: vi.fn().mockResolvedValue({ success: true, message: 'Updated', data: updated }),
          } as any))

          const r = makeRes()
          await updateDiagramController(makeReq({ body: { nodes, edges }, params: { projectId: 'p-1' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: updated }))
     })
})

describe('getVersionsController', () => {
     const versions = [{ version: 2 }, { version: 1 }]
     const pagination = { total: 2, page: 1, limit: 10, totalPages: 1 }

     beforeEach(() => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getVersionsService: vi.fn().mockResolvedValue({ success: true, message: 'OK', data: versions, pagination }),
          } as any))
     })

     it('responds 404 when diagram is not found', async () => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getVersionsService: vi.fn().mockResolvedValue({ success: false, message: 'Not found' }),
          } as any))

          const r = makeRes()
          await getVersionsController(makeReq({ params: { projectId: 'p-x' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(404)
     })

     it('responds 200 with version list and pagination', async () => {
          const r = makeRes()
          await getVersionsController(makeReq({ params: { projectId: 'p-1' }, query: { page: '1', limit: '10' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: versions, pagination }))
     })
})

describe('getVersionController', () => {
     it('responds 404 when version is not found', async () => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getVersionService: vi.fn().mockResolvedValue({ success: false, message: 'Not found' }),
          } as any))

          const r = makeRes()
          await getVersionController(makeReq({ params: { projectId: 'p-1', versionId: 'v-x' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(404)
     })

     it('responds 200 with version data on success', async () => {
          const version = { version: 3, nodes: [] }
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               getVersionService: vi.fn().mockResolvedValue({ success: true, message: 'OK', data: version }),
          } as any))

          const r = makeRes()
          await getVersionController(makeReq({ params: { projectId: 'p-1', versionId: 'v-3' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: version }))
     })
})

describe('restoreVersionController', () => {
     it('responds 404 when diagram or version is not found', async () => {
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               restoreVersionService: vi.fn().mockResolvedValue({ success: false, message: 'Not found' }),
          } as any))

          const r = makeRes()
          await restoreVersionController(makeReq({ params: { projectId: 'p-1', versionId: 'v-x' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(404)
     })

     it('responds 200 with restored diagram on success', async () => {
          const restored = { version: 2, nodes: [{ id: 'n1' }] }
          vi.mocked(BasedDiagram).mockImplementation(() => ({
               restoreVersionService: vi.fn().mockResolvedValue({ success: true, message: 'Restored', data: restored }),
          } as any))

          const r = makeRes()
          await restoreVersionController(makeReq({ params: { projectId: 'p-1', versionId: 'v-2' } }), r, next)

          expect(r.status).toHaveBeenCalledWith(200)
          expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ data: restored }))
     })
})
