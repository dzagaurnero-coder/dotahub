import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Session, User } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { hashSessionToken } from '@/utils/crypto-rng';
import { ForbiddenError, UnauthorizedError } from '@/utils/errors';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: User | null;
    currentSession: Session | null;
  }
}

/**
 * Глобальный хук: извлекает токен сессии из HTTP-only cookie,
 * проверяет срок действия в PostgreSQL и прикрепляет пользователя к запросу.
 */
export async function attachOptionalUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  request.currentUser = null;
  request.currentSession = null;

  const rawToken = request.cookies?.[env.SESSION_COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') {
    return;
  }

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!session) {
    clearSessionCookie(reply);
    return;
  }

  if (session.expires_at <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    clearSessionCookie(reply);
    return;
  }

  request.currentUser = session.user;
  request.currentSession = session;
}

/**
 * Гард для защищённых маршрутов: требует авторизованного пользователя
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  if (!request.currentUser || !request.currentSession) {
    throw new UnauthorizedError(
      'Необходима авторизация для выполнения этого действия.'
    );
  }
}

/**
 * Гард для административных маршрутов: требует роль admin
 */
export async function requireAdmin(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  if (!request.currentUser || !request.currentSession) {
    throw new UnauthorizedError(
      'Необходима авторизация для доступа к панели администратора.'
    );
  }

  if (request.currentUser.role !== 'admin') {
    throw new ForbiddenError(
      'Доступ запрещён: требуются права администратора платформы.'
    );
  }
}

/**
 * Установка защищённой HTTP-only cookie сессии
 */
export function setSessionCookie(
  reply: FastifyReply,
  rawToken: string,
  expiresAt: Date
): void {
  reply.setCookie(env.SESSION_COOKIE_NAME, rawToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

/**
 * Очистка сессионной cookie
 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(env.SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
}