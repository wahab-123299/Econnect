import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient instance across the app — avoids exhausting DB
// connections, especially important with hot-reload in dev (tsx watch).
export const prisma = new PrismaClient();
