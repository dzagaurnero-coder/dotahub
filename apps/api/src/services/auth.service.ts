import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import {
  generateCsrfToken,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from '@/utils/crypto-rng';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '@/utils/errors';
import { toUserProfileDto, writeAuditLog } from '@/utils/audit';
import type { UserProfileDto } from '@dotahub/shared';

export interface RegisterUserParams {
  email: string;
  username: string;
  display_name?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginUserParams {
  email?: string;
  identifier?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthSessionResult {
  user: UserProfileDto;
  rawSessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}

/**
 * Создание новой серверной сессии для пользователя
 */
async function createSessionForUser(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ rawSessionToken: string; csrfToken: string; expiresAt: Date }> {
  const rawSessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawSessionToken);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      csrf_token: csrfToken,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ? userAgent.slice(0, 512) : null,
      expires_at: expiresAt,
    },
  });

  return { rawSessionToken, csrfToken, expiresAt };
}

/**
 * Регистрация нового пользователя с начислением стартового демобаланса
 */
export async function registerUser(
  params: RegisterUserParams
): Promise<AuthSessionResult> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedUsername = params.username.trim().toLowerCase();
  const displayName =
    params.display_name?.trim() || params.username.trim();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new ConflictError('Пользователь с таким email уже зарегистрирован.');
    }
    throw new ConflictError('Это имя пользователя (username) уже занято.');
  }

  const passwordHash = await hashPassword(params.password);
  const initialBalanceMinor = env.INITIAL_DEMO_BALANCE_MINOR;

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        display_name: displayName,
        password_hash: passwordHash,
        role: 'user',
        demo_balance_minor: initialBalanceMinor,
      },
    });

    if (initialBalanceMinor > 0) {
      await tx.transaction.create({
        data: {
          user_id: user.id,
          type: 'deposit',
          amount_minor: initialBalanceMinor,
          balance_after_minor: initialBalanceMinor,
          description: 'Стартовый демонстрационный баланс при регистрации',
          reference_id: 'initial_registration_grant',
        },
      });
    }

    await writeAuditLog(
      {
        userId: user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: user.id,
        ipAddress: params.ipAddress,
        metadata: { username: user.username, email: user.email },
      },
      tx
    );

    return user;
  });

  const session = await createSessionForUser(
    createdUser.id,
    params.ipAddress,
    params.userAgent
  );

  return {
    user: toUserProfileDto(createdUser),
    ...session,
  };
}

/**
 * Вход пользователя по email или username
 */
export async function loginUser(
  params: LoginUserParams
): Promise<AuthSessionResult> {
  const rawIdentifier = (params.email || params.identifier || '')
    .trim()
    .toLowerCase();

  if (!rawIdentifier || !params.password) {
    throw new BadRequestError('Укажите email (или логин) и пароль.');
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: rawIdentifier }, { username: rawIdentifier }],
    },
  });

  if (!user) {
    throw new UnauthorizedError('Неверный email/логин или пароль.');
  }

  const isPasswordValid = await verifyPassword(
    params.password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError('Неверный email/логин или пароль.');
  }

  const session = await createSessionForUser(
    user.id,
    params.ipAddress,
    params.userAgent
  );

  await writeAuditLog({
    userId: user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    ipAddress: params.ipAddress,
  });

  return {
    user: toUserProfileDto(user),
    ...session,
  };
}

/**
 * Завершение текущей сессии пользователя
 */
export async function logoutSession(
  sessionId: string,
  userId?: string | null,
  ipAddress?: string
): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});

  if (userId) {
    await writeAuditLog({
      userId,
      action: 'auth.logout',
      entityType: 'session',
      entityId: sessionId,
      ipAddress,
    });
  }
}