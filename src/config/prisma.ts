import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getPostgresConnectionString } from './postgres-url'

const pool = new Pool({
     connectionString: getPostgresConnectionString(),
     max: Number(process.env.PG_POOL_MAX) || 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
