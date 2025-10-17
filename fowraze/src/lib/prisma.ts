import { PrismaClient } from "@/generated/prisma";

// Prevent multiple instances of Prisma Client in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({
  log: ["error", "warn"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
