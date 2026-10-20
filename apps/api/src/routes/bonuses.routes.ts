import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  attachOptionalUser,
  requireAuth,
} from '@/middleware/auth.middleware';
import {
  claimDailyBonusForUser,
  getDailyBonusStatus,
  redeemPromoCodeForUser,
} from '@/services/balance.service';

const promoSchema = z.object({
  code: z
    .string()
    .min(3, 'Код промокода слишком короткий.')
    .max(32, 'Код промокода слишком длинный.'),
});

export const bonusesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Статус ежедневного бонуса
  app.get(
    '/daily',
    { preHandler: [attachOptionalUser] },
    async (request, reply) => {
      const userId = request.currentUser?.id;
      const data = await getDailyBonusStatus(userId);
      return reply.send(data);
    }
  );

  // Получение ежедневного бонуса
  app.post(
    '/daily/claim',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      const result = await claimDailyBonusForUser({
        userId,
        idempotencyKey,
        ipAddress,
      });

      return reply.send(result);
    }
  );

  // Активация промокода
  app.post(
    '/promo/redeem',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const body = promoSchema.parse(request.body);
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      const result = await redeemPromoCodeForUser({
        userId,
        code: body.code,
        idempotencyKey,
        ipAddress,
      });

      return reply.send(result);
    }
  );
};