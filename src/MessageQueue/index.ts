import "../config/dotenv"
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getPostgresConnectionString } from '../config/postgres-url'
import { logger } from "../utils/logger";
import mongoose from "mongoose";

async function connectMongoDB() {
     try {
          const uri = process.env.MONGODB_URI as string
          await mongoose.connect(uri);
     } catch (err) {
          console.error("❌ MongoDB connection error in workers:", err);
          process.exit(1);
     }
}
async function connectPrisma() {
     const pool = new Pool({ connectionString: getPostgresConnectionString() });
     const adapter = new PrismaPg(pool);
     const prisma = new PrismaClient({ adapter });
     prisma.$connect()
     return prisma
}
process.on('SIGTERM', async () => {
     console.log('SIGTERM received, closing MongoDB connection...');
     const prisma = await connectPrisma()
     await prisma.$disconnect();
     await mongoose.disconnect();
     process.exit(0);
});

process.on('SIGINT', async () => {
     console.log('SIGINT received, closing MongoDB connection...');
     const prisma = await connectPrisma()
     await prisma.$disconnect();
     await mongoose.disconnect();
     process.exit(0);
});


const startWorkerServer = async () => {
     try {
          await Promise.all([
               connectMongoDB(),
          ]).then(() => {
               require('./worker.emails');
               require('./worker.notification');
               console.log('⛁  Success connected with PostgresSQL of SRVJ for workers');
               console.log('⛁  Success connected with MongoDB of SRVJ for workers');
               console.log('🚀 All workers started successfully!');
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
startWorkerServer()
