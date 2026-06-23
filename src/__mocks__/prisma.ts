import { mockDeep } from "vitest-mock-extended";
import { PrismaClient } from "../generated/prisma";

export const prismaMock = mockDeep<PrismaClient>();
