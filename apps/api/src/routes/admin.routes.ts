import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '@/middleware/auth.middleware';
import { prisma } from '@/config/prisma';
import { writeAuditLog } from '@/utils/audit';

const createPromoSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Промокод должен содержать только заглавные латинские буквы, цифры и спецсимволы.'),
  rewardAmountMinor: z.number().int().min(100).max(10000000),
  maxUses: z.number().int().min(1).nullable().optional(),
});

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Все административные маршруты требуют роли admin
  app.addHook('preHandler', requireAdmin);

  // Сводная аналитика платформы
  app.get('/stats', async (_request, reply) => {
    const [
      totalUsersCount,
      totalCasesOpened,
      totalUpgraderAttempts,
      depositsAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.caseOpening.count(),
      prisma.upgraderAttempt.count(),
      prisma.transaction.aggregate({
        where: { type: 'deposit' },
        _sum: { amount_minor: true },
      }),
    ]);

    return reply.send({
      stats: {
        total_users_count: totalUsersCount,
        total_cases_opened: totalCasesOpened,
        total_upgrader_attempts: totalUpgraderAttempts,
        total_deposits_minor: depositsAgg._sum.amount_minor ?? 0,
      },
    });
  });

  // Создание нового промокода администратором
  app.post('/promos', async (request, reply) => {
    const userId = request.currentUser!.id;
    const body = createPromoSchema.parse(request.body);
    const ipAddress = request.ip;

    const promo = await prisma.promoCode.create({
      data: {
        code: body.code,
        reward_amount_minor: body.rewardAmountMinor,
        max_uses: body.max_uses ?? null,
        is_active: true,
      },
    });

    await writeAuditLog({
      userId,
      action: 'admin.promo.create',
      entityType: 'promo_code',
      entityId: promo.id,
      ipAddress,
      metadata: { code: promo.code, rewardAmountMinor: promo.reward_amount_minor },
    });

    return reply.status(201).send({ promo });
  });
};