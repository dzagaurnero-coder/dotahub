import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { attachOptionalUser } from '@/middleware/auth.middleware';
import {
  getDotaItemDetailBySlug,
  listDotaItemsCatalog,
} from '@/services/catalog-import.service';

const itemsQuerySchema = z.object({
  search: z.string().optional(),
  heroSlug: z.string().optional(),
  rarity: z.string().optional(),
  quality: z.string().optional(),
  itemType: z.string().optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['price_desc', 'price_asc', 'rarity_desc', 'name_asc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

export const itemsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Список предметов каталога
  app.get('/', async (request, reply) => {
    const query = itemsQuerySchema.parse(request.query);
    const data = await listDotaItemsCatalog(query);
    return reply.send(data);
  });

  // Детальная карточка предмета по slug
  app.get(
    '/:slug',
    { preHandler: [attachOptionalUser] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const userId = request.currentUser?.id;

      const data = await getDotaItemDetailBySlug(slug, userId);
      return reply.send(data);
    }
  );
};