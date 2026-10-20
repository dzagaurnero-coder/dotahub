import crypto from 'node:crypto';
import argon2 from 'argon2';

export interface ProvablyFairDraw {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  rollBasisPoints: number; // Целое число 0..9999 (0.00% .. 99.99%)
}

export interface WeightedPoolCandidate {
  id: string;
  weight: number;
}

/**
 * Генерация криптографически стойкого серверного сида (32 байта = 64 hex-символа)
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Генерация дефолтного клиентского сида, если пользователь не передал свой
 */
export function generateClientSeed(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Вычисление публичного SHA-256 хеша серверного сида
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Вычисление детерминированного результата (0..9999) по алгоритму HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`)
 */
export function calculateProvablyFairRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const cleanClientSeed = clientSeed.trim() || 'dotahub-default-client-seed';
  const safeNonce = Number.isInteger(nonce) && nonce >= 0 ? nonce : 1;

  const hmacHex = crypto
    .createHmac('sha256', serverSeed)
    .update(`${cleanClientSeed}:${safeNonce}`)
    .digest('hex');

  // Берём первые 8 hex-символов (32 бита) и переводим в диапазон 0..9999
  const intValue = Number.parseInt(hmacHex.slice(0, 8), 16);
  return intValue % 10000;
}

/**
 * Полный цикл создания криптографического броска Provably Fair
 */
export function createProvablyFairDraw(
  clientSeedInput?: string,
  nonce = 1
): ProvablyFairDraw {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed =
    clientSeedInput && clientSeedInput.trim().length > 0
      ? clientSeedInput.trim().slice(0, 64)
      : generateClientSeed();
  const rollBasisPoints = calculateProvablyFairRoll(serverSeed, clientSeed, nonce);

  return {
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
    rollBasisPoints,
  };
}

/**
 * Детерминированный выбор предмета из взвешенного пула кейса по rollBasisPoints (0..9999)
 */
export function pickWeightedPoolItem<T extends WeightedPoolCandidate>(
  pool: T[],
  rollBasisPoints: number
): T {
  if (pool.length === 0) {
    throw new Error('Пул кейса пуст: невозможно выбрать предмет.');
  }

  const totalWeight = pool.reduce((sum, entry) => sum + Math.max(1, entry.weight), 0);
  const normalizedFraction = Math.max(0, Math.min(9999, rollBasisPoints)) / 10000;
  const targetThreshold = normalizedFraction * totalWeight;

  let cumulative = 0;
  for (const entry of pool) {
    cumulative += Math.max(1, entry.weight);
    if (targetThreshold < cumulative) {
      return entry;
    }
  }

  return pool[pool.length - 1];
}

/**
 * Хеширование пароля алгоритмом Argon2id
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Проверка пароля алгоритмом Argon2id
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Генерация случайного сессионного токена (64 hex-символа)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 хеширование сессионного токена для хранения в таблице Session
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Генерация CSRF-токена для сессии
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Защищённое от timing-атак сравнение CSRF-токенов
 */
export function verifyCsrfToken(expectedToken: string, providedToken: string): boolean {
  if (!expectedToken || !providedToken) {
    return false;
  }
  const expectedBuf = Buffer.from(expectedToken, 'utf-8');
  const providedBuf = Buffer.from(providedToken, 'utf-8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}