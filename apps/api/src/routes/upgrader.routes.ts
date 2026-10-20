import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth.middleware';
import {
  runUpgraderAttempt,
  listUserUpgraderHistory,
} from '@/services/upgrader.service';

const attemptSchema = z.object({
  inventoryItemId: z.string().uuid('Некорректный ID предмета инвентаря.'),
  targetItemId: z.string().uuid('Некорректный ID целевого предмета.'),
  clientSeed: z.string().max(64).optional(),
});

export const upgraderRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Запуск попытки апгрейда
  app.post(
    '/attempt',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const body = attemptSchema.parse(request.body);
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      const result = await runUpgraderAttempt({
        userId,
        inventoryItemId: body.inventoryItemId,
        targetItemId: body.targetItemId,
        idempotencyKey,
        clientSeed: body.clientSeed,
        ipAddress,
      });

      return reply.send(result);
    }
  );

  // История попыток апгрейда
  app.get('/history', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const history = await listUserUpgraderHistory(userId, 30);
    return reply.send(history);
  });
};