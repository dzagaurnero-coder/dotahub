import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InventoryItemStatus } from '@prisma/client';
import { requireAuth } from '@/middleware/auth.middleware';
import {
  listUserInventory,
  sellUserInventoryItem,
} from '@/services/catalog-import.service';

const inventoryQuerySchema = z.object({
  status: z.nativeEnum(InventoryItemStatus).optional(),
  rarity: z.string().optional(),
  sort: z.enum(['acquired_desc', 'price_desc', 'price_asc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

export const inventoryRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  // Список предметов инвентаря текущего пользователя
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const query = inventoryQuerySchema.parse(request.query);

    const data = await listUserInventory(userId, query);
    return reply.send(data);
  });

  // Продажа предмета из инвентаря
  app.post(
    '/:id/sell',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const { id } = request.params as { id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      const result = await sellUserInventoryItem({
        userId,
        inventoryItemId: id,
        idempotencyKey,
        ipAddress,
      });

      return reply.send(result);
    }
  );
};