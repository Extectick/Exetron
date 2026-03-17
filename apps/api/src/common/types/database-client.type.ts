import type { Prisma, PrismaClient } from "@exetron/database";

export type DatabaseClient = Prisma.TransactionClient | PrismaClient;
