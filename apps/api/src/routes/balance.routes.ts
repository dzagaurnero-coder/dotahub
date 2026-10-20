import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { requireAuth } from '@/middleware/auth.middleware';
import {
  depositDemoBalance,
  listUserTransactions,
} from '@/services/balance.service';

const depositSchema = z.object({
  amountMinor: z
    .number()
    .int()
    .min(1000, 'Минимальная сумма пополнения — 10 ₽ (1000 копеек).')
    .max(5000000, 'Максимальная сумма пополнения — 50 000 ₽.'),
});

const transactionsQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const balanceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Пополнение демонстрационного баланса
  app.post(
    '/deposit',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const body = depositSchema.parse(request.body);
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      if (!idempotencyKey) {
        return reply.status(400).send({
          error: {
            code: 'MISSING_IDEMPOTENCY_KEY',
            message: 'Заголовок Idempotency-Key обязателен для финансовых операций.',
          },
        });
      }

      const result = await depositDemoBalance({
        userId,
        amountMinor: body.amountMinor,
        idempotencyKey,
        ipAddress,
      });

      return reply.send(result);
    }
  );

  // История финансовых транзакций
  app.get(
    '/transactions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const query = transactionsQuerySchema.parse(request.query);

      const data = await listUserTransactions(userId, query);
      return reply.send(data);
    }
  );
};