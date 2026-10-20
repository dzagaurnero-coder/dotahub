import fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '@/config/env';
import { checkDatabaseHealth } from '@/config/prisma';
import { attachOptionalUser } from '@/middleware/auth.middleware';
import { csrfProtectionMiddleware } from '@/middleware/csrf.middleware';
import { registerErrorMiddleware } from '@/middleware/error.middleware';
import { authRoutes } from '@/routes/auth.routes';
import { casesRoutes } from '@/routes/cases.routes';
import { itemsRoutes } from '@/routes/items.routes';
import { inventoryRoutes } from '@/routes/inventory.routes';
import { upgraderRoutes } from '@/routes/upgrader.routes';
import { profileRoutes } from '@/routes/profile.routes';
import { balanceRoutes } from '@/routes/balance.routes';
import { bonusesRoutes } from '@/routes/bonuses.routes';
import { adminRoutes } from '@/routes/admin.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
  });

  // 1. Регистрация базовых плагинов безопасности
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  await app.register(fastifyCors, {
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key'],
  });

  await app.register(fastifyCookie, {
    secret: env.SESSION_SECRET,
  });

  await app.register(fastifyRateLimit, {
    max: 120,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  // 2. Регистрация централизованного обработчика ошибок
  registerErrorMiddleware(app);

  // 3. Глобальные хуки запросов
  app.addHook('onRequest', attachOptionalUser);
  app.addHook('preHandler', csrfProtectionMiddleware);

  // 4. Проверка здоровья (Health Check)
  app.get('/api/health', async (_request, reply) => {
    const isDbHealthy = await checkDatabaseHealth();
    const status = isDbHealthy ? 'ok' : 'degraded';
    return reply.status(isDbHealthy ? 200 : 503).send({
      status,
      database: isDbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // 5. Подключение групп маршрутов API
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(casesRoutes, { prefix: '/api/cases' });
  await app.register(itemsRoutes, { prefix: '/api/items' });
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });
  await app.register(upgraderRoutes, { prefix: '/api/upgrader' });
  await app.register(profileRoutes, { prefix: '/api/profile' });
  await app.register(balanceRoutes, { prefix: '/api/balance' });
  await app.register(bonusesRoutes, { prefix: '/api/bonuses' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}