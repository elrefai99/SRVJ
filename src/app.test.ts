import { describe, expect, it } from 'vitest'
import request from 'supertest'
import server from './app'
describe('GET /api/health', () => {
     it('responds 200 with an ok status payload', async () => {
          const res = await request(server).get('/api/health')
          expect(res.status).toBe(200)
          expect(res.body.status).toBe('ok')
          expect(typeof res.body.timestamp).toBe('string')
     })
     it('responds 404 for an unknown route', async () => {
          const res = await request(server).get('/not-a-route')

          expect(res.status).toBe(404)
     })
})
