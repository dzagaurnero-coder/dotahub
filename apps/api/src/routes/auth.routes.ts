import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/middleware/auth.middleware';
import {
  loginUser,
  logoutSession,
  registerUser,
} from '@/services/auth.service';
import {
  clearSessionCookie,
  setSessionCookie,
} from '@/middleware/auth.middleware';
import { toUserProfileDto } from '@/utils/audit';

const registerSchema = z.object({
  email: z.string().email('Некорректный формат email.'),
  username: z
    .string()
    .min(3, 'Логин должен содержать от 3 символов.')
    .max(32, 'Логин не должен превышать 32 символа.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Логин может содержать только латиницу, цифры, "_" и "-".'),
  display_name: z.string().max(40).optional(),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов.'),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Укажите email или логин.'),
  password: z.string().min(1, 'Укажите пароль.'),
});

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Регистрация нового аккаунта
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await registerUser({
      ...body,
      ipAddress,
      userAgent,
    });

    setSessionCookie(reply, result.rawSessionToken, result.expiresAt);

    return reply.status(201).send({
      user: result.user,
      csrfToken: result.csrfToken,
    });
  });

  // Вход в аккаунт
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await loginUser({
      identifier: body.identifier,
      password: body.password,
      ipAddress,
      userAgent,
    });

    setSessionCookie(reply, result.rawSessionToken, result.expiresAt);

    return reply.send({
      user: result.user,
      csrfToken: result.csrfToken,
    });
  });

  // Получение текущего авторизованного пользователя
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    return reply.send({
      user: toUserProfileDto(request.currentUser!),
      csrfToken: request.currentSession?.csrf_token ?? null,
    });
  });

  // Выход из системы
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const sessionId = request.currentSession!.id;
    const userId = request.currentUser?.id;
    const ipAddress = request.ip;

    await logoutSession(sessionId, userId, ipAddress);
    clearSessionCookie(reply);

    return reply.send({ success: true });
  });
};