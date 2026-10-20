import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { updateProfileSchema } from '@dotahub/shared';
import { prisma } from '@/config/prisma';
import { attachOptionalUser, requireAuth } from '@/middleware/auth.middleware';
import { NotFoundError } from '@/utils/errors';
import {
  toDotaItemDto,
  toUserProfileDto,
  writeAuditLog,
} from '@/utils/audit';

export const profileRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Обновление собственного профиля
  app.patch(
    '/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const body = updateProfileSchema.parse(request.body);
      const ipAddress = request.ip;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          display_name: body.display_name,
          avatar_url: body.avatar_url ?? null,
          steam_trade_url: body.steam_trade_url ?? null,
          is_public_profile: body.is_public_profile,
          show_public_inventory: body.show_public_inventory,
          show_public_stats: body.show_public_stats,
        },
      });

      await writeAuditLog({
        userId,
        action: 'profile.update',
        entityType: 'user',
        entityId: userId,
        ipAddress,
      });

      return reply.send({
        user: toUserProfileDto(updatedUser),
      });
    }
  );

  // Получение публичного профиля игрока по id
  app.get(
    '/:id',
    { preHandler: [attachOptionalUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.currentUser?.id;

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: {
          inventory_items: {
            where: { status: 'available' },
            include: { item: true },
            orderBy: { acquired_at: 'desc' },
            take: 18,
          },
          case_openings: {
            include: { won_item: true },
          },
          upgrader_attempts: true,
        },
      });

      if (!targetUser) {
        throw new NotFoundError('Пользователь не найден.');
      }

      const isOwner = currentUserId === targetUser.id;

      if (!targetUser.is_public_profile && !isOwner) {
        throw new NotFoundError('Профиль пользователя скрыт настройками приватности.');
      }

      let stats = null;
      if (targetUser.show_public_stats || isOwner) {
        const casesOpenedCount = targetUser.case_openings.length;
        const upgraderAttemptsCount = targetUser.upgrader_attempts.length;
        const upgraderWinsCount = targetUser.upgrader_attempts.filter(
          (u) => u.status === 'won'
        ).length;

        let bestDropItem = null;
        if (targetUser.case_openings.length > 0) {
          const sortedOpenings = [...targetUser.case_openings].sort(
            (a, b) => (b.won_item.estimated_value_minor ?? 0) - (a.won_item.estimated_value_minor ?? 0)
          );
          if (sortedOpenings[0]?.won_item) {
            bestDropItem = toDotaItemDto(sortedOpenings[0].won_item);
          }
        }

        stats = {
          cases_opened_count: casesOpenedCount,
          upgrader_attempts_count: upgraderAttemptsCount,
          upgrader_wins_count: upgraderWinsCount,
          best_drop_item: bestDropItem,
        };
      }

      let recentInventory = null;
      if (targetUser.show_public_inventory || isOwner) {
        recentInventory = targetUser.inventory_items.map((inv) =>
          toDotaItemDto(inv.item)
        );
      }

      return reply.send({
        profile: {
          id: targetUser.id,
          username: targetUser.username,
          display_name: targetUser.display_name,
          avatar_url: targetUser.avatar_url,
          joined_at: targetUser.created_at.toISOString(),
          stats,
          recent_inventory: recentInventory,
        },
      });
    }
  );
};