import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CaseCategory } from '@prisma/client';
import { attachOptionalUser, requireAuth } from '@/middleware/auth.middleware';
import {
  getCaseDetailBySlug,
  listCasesCatalog,
  openCaseForUser,
  toggleUserFavoriteCase,
} from '@/services/case-opening.service';

const catalogQuerySchema = z.object({
  category: z.nativeEnum(CaseCategory).optional(),
  search: z.string().optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'name_asc', 'featured']).optional(),
  onlyFavorites: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

const openCaseSchema = z.object({
  clientSeed: z.string().max(64).optional(),
  fastOpen: z.boolean().optional(),
});

export const casesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Список кейсов каталога (с опциональной привязкой юзера для избранного)
  app.get('/', { preHandler: [attachOptionalUser] }, async (request, reply) => {
    const query = catalogQuerySchema.parse(request.query);
    const userId = request.currentUser?.id;

    const data = await listCasesCatalog(query, userId);
    return reply.send(data);
  });

  // Детальная информация о кейсе по slug
  app.get(
    '/:slug',
    { preHandler: [attachOptionalUser] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const userId = request.currentUser?.id;

      const data = await getCaseDetailBySlug(slug, userId);
      return reply.send(data);
    }
  );

  // Переключение избранного кейса
  app.post(
    '/:id/favorite',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.currentUser!.id;

      const result = await toggleUserFavoriteCase(userId, id);
      return reply.send(result);
    }
  );

  // Открытие кейса (с поддержкой Idempotency-Key)
  app.post(
    '/:slug/open',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const userId = request.currentUser!.id;
      const body = openCaseSchema.parse(request.body ?? {});
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const ipAddress = request.ip;

      const result = await openCaseForUser(userId, slug, {
        idempotencyKey,
        clientSeed: body.clientSeed,
        fastOpen: body.fastOpen,
        ipAddress,
      });

      return reply.send(result);
    }
  );
};