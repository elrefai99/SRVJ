import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";
import { prismaMock } from "./prisma";

vi.mock("@/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => mockReset(prismaMock));
