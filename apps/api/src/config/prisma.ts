import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __dotahubPrisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__dotahubPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__dotahubPrisma = prisma;
}

/**
 * Проверка доступности PostgreSQL для эндпоинта /api/health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Корректное закрытие пула соединений при остановке сервера
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}