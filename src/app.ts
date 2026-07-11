import './config/dotenv'
import { logger } from './utils/logger'
process
     .on('unhandledRejection', (reason, promise) => {
          console.error(reason, 'Unhandled Rejection at Promise', promise)
          logger.error({
               message: 'Unhandled Rejection',
               reason: reason instanceof Error ? reason.message : reason,
               stack: reason instanceof Error ? reason.stack : undefined,
               promise,
          })
     })
     .on('uncaughtException', (err) => {
          console.error(err, '\n Uncaught Exception thrown \n')
          logger.error({
               message: 'Uncaught Exception',
               error: err.message,
               stack: err.stack,
          })

          // allow logger to flush before exit
          setTimeout(() => {
               process.exit(1)
          }, 500)
     })
import express, { type Express, type Request, type Response } from 'express'
import client from 'prom-client'
import * as http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { allowedOrigins } from './app.config'
import appConfig from './app.config'
import appModule from './app.module'
import prisma from './config/prisma'
import { redisConfig } from './config/redis'
import { startSubscriber } from './config/subscriber'
import { mongoDBConfig } from './config/mongoDB'
import { attachCollab, connectCollabRedis, shutdownCollab, disconnectCollabRedis } from './collab'
import { errorHandler } from './utils/errors/errorHandler'

const app: Express = express()

const server = http.createServer(app)
export let ioSocket: SocketIOServer = new SocketIOServer(server, {
     cors: {
          origin: allowedOrigins,
     },
     destroyUpgrade: false,
})

attachCollab(server)
appConfig(app)
appModule(app)

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
     res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/metrics', async (req: Request, res: Response) => {
     const metricsToken = process.env.METRICS_TOKEN
     if (metricsToken && req.headers.authorization !== `Bearer ${metricsToken}`) {
          res.status(401).json({ code: 401, status: 'Unauthorized', message: 'Unauthorized' })
          return
     }
     res.set('Content-Type', client.register.contentType)
     res.end(await client.register.metrics())
})

app.use(async (_req: Request, res: Response) => {
     res.status(404).send('This is not the API route you are looking for')
})

app.use(errorHandler)
const PORT: number = Number(process.env.PORT) || 9999

async function startServer() {
     try {
          await Promise.all([
               mongoDBConfig(),
               prisma.$connect().then(() => {
                    console.log('✅ Success connected with PostgresSQL of SRVJ')
               }),
               redisConfig(),
               startSubscriber(),
               connectCollabRedis(),
          ]).then(() => {
               server.listen(PORT, () => {
                    console.log('🌐 Server is running on:', `${process.env.API_LINK as string}`)
               })
          })
     } catch (error: any) {
          logger.error({
               message: 'Failed to start server',
               error: error?.message,
               stack: error?.stack,
          })
          process.exit(1)
     }
}

let shuttingDown = false
async function gracefulShutdown(signal: string) {
     if (shuttingDown) return
     shuttingDown = true
     console.log(`${signal} received, flushing collaboration state...`)
     const forceExit = setTimeout(() => process.exit(0), 15000)
     forceExit.unref()
     try {
          await shutdownCollab()
          await disconnectCollabRedis()
     } catch (error: any) {
          logger.error({ message: 'Graceful shutdown error', error: error?.message, stack: error?.stack })
     }
     server.close(() => process.exit(0))
}

if (process.env.NODE_ENV !== 'test') {
     process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
     process.on('SIGINT', () => void gracefulShutdown('SIGINT'))
     startServer()
}

export default server
