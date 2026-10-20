import type { Prisma, TransactionType } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { paymentService } from '@/services/payment/payment.service';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/utils/errors';
import {
  checkIdempotency,
  saveIdempotencyRecord,
  toTransactionDto,
  writeAuditLog,
} from '@/utils/audit';
import type {
  DailyBonusStatusDto,
  TransactionDto,
  TransactionsQueryInput,
} from '@dotahub/shared';

const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Пополнение виртуального демобаланса с защитой по Idempotency-Key
 */
export async function depositDemoBalance(params: {
  userId: string;
  amountMinor: number;
  idempotencyKey: string;
  ipAddress?: string;
}): Promise<{
  transaction: TransactionDto;
  creditedAmountMinor: number;
  updatedDemoBalanceMinor: number;
}> {
  const endpointKey = 'POST:/api/balance/deposit';

  const cached = await checkIdempotency<{
    transaction: TransactionDto;
    creditedAmountMinor: number;
    updatedDemoBalanceMinor: number;
  }>(params.userId, params.idempotencyKey, endpointKey);

  if (cached) {
    return cached.body;
  }

  const gatewayReceipt = await paymentService.processDemoOrLiveDeposit({
    userId: params.userId,
    amountMinor: params.amountMinor,
    idempotencyKey: params.idempotencyKey,
  });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    const updatedBalanceMinor =
      user.demo_balance_minor + gatewayReceipt.creditedAmountMinor;

    await tx.user.update({
      where: { id: user.id },
      data: { demo_balance_minor: updatedBalanceMinor },
    });

    const createdTx = await tx.transaction.create({
      data: {
        user_id: user.id,
        type: 'deposit',
        amount_minor: gatewayReceipt.creditedAmountMinor,
        balance_after_minor: updatedBalanceMinor,
        description: 'Пополнение виртуального демобаланса',
        reference_id: gatewayReceipt.externalTransactionId,
      },
    });

    const responseBody = {
      transaction: toTransactionDto(createdTx),
      creditedAmountMinor: gatewayReceipt.creditedAmountMinor,
      updatedDemoBalanceMinor: updatedBalanceMinor,
    };

    await saveIdempotencyRecord(
      user.id,
      params.idempotencyKey,
      endpointKey,
      200,
      responseBody,
      tx
    );

    await writeAuditLog(
      {
        userId: user.id,
        action: 'balance.deposit',
        entityType: 'transaction',
        entityId: createdTx.id,
        ipAddress: params.ipAddress,
        metadata: {
          creditedAmountMinor: gatewayReceipt.creditedAmountMinor,
          balanceAfterMinor: updatedBalanceMinor,
        },
      },
      tx
    );

    return responseBody;
  });

  return result;
}

/**
 * Получение постраничной истории финансовых транзакций пользователя
 */
export async function listUserTransactions(
  userId: string,
  query: Partial<TransactionsQueryInput>
): Promise<{
  transactions: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.TransactionWhereInput = {
    user_id: userId,
  };

  if (query.type) {
    where.type = query.type as TransactionType;
  }

  const [records, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    transactions: records.map(toTransactionDto),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Получение статуса ежедневного бонуса для пользователя (или гостя)
 */
export async function getDailyBonusStatus(
  userId?: string | null
): Promise<{ status: DailyBonusStatusDto }> {
  const rewardAmountMinor = env.DAILY_BONUS_AMOUNT_MINOR;

  if (!userId) {
    return {
      status: {
        can_claim: false,
        reward_amount_minor: rewardAmountMinor,
        next_available_at: null,
        last_claimed_at: null,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { last_daily_bonus_at: true },
  });

  if (!user || !user.last_daily_bonus_at) {
    return {
      status: {
        can_claim: true,
        reward_amount_minor: rewardAmountMinor,
        next_available_at: null,
        last_claimed_at: null,
      },
    };
  }

  const lastClaimedMs = user.last_daily_bonus_at.getTime();
  const nextAvailableMs = lastClaimedMs + DAILY_BONUS_COOLDOWN_MS;
  const nowMs = Date.now();
  const canClaim = nowMs >= nextAvailableMs;

  return {
    status: {
      can_claim: canClaim,
      reward_amount_minor: rewardAmountMinor,
      next_available_at: canClaim
        ? null
        : new Date(nextAvailableMs).toISOString(),
      last_claimed_at: user.last_daily_bonus_at.toISOString(),
    },
  };
}

/**
 * Начисление ежедневного бонуса (раз в 24 часа)
 */
export async function claimDailyBonusForUser(params: {
  userId: string;
  idempotencyKey?: string;
  ipAddress?: string;
}): Promise<{
  creditedAmountMinor: number;
  updatedDemoBalanceMinor: number;
  nextAvailableAt: string;
}> {
  const endpointKey = 'POST:/api/bonuses/daily/claim';

  const cached = await checkIdempotency<{
    creditedAmountMinor: number;
    updatedDemoBalanceMinor: number;
    nextAvailableAt: string;
  }>(params.userId, params.idempotencyKey, endpointKey);

  if (cached) {
    return cached.body;
  }

  const rewardAmountMinor = env.DAILY_BONUS_AMOUNT_MINOR;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    const now = new Date();
    if (user.last_daily_bonus_at) {
      const nextAvailableMs =
        user.last_daily_bonus_at.getTime() + DAILY_BONUS_COOLDOWN_MS;
      if (now.getTime() < nextAvailableMs) {
        throw new BadRequestError(
          'Ежедневный бонус уже получен. Дождитесь окончания 24-часового таймера.'
        );
      }
    }

    const updatedBalanceMinor = user.demo_balance_minor + rewardAmountMinor;
    const nextAvailableAt = new Date(
      now.getTime() + DAILY_BONUS_COOLDOWN_MS
    ).toISOString();

    await tx.user.update({
      where: { id: user.id },
      data: {
        demo_balance_minor: updatedBalanceMinor,
        last_daily_bonus_at: now,
      },
    });

    const createdTx = await tx.transaction.create({
      data: {
        user_id: user.id,
        type: 'daily_bonus',
        amount_minor: rewardAmountMinor,
        balance_after_minor: updatedBalanceMinor,
        description: 'Ежедневный бонус платформы DotaHub',
        reference_id: `daily_${now.toISOString().slice(0, 10)}`,
      },
    });

    const responseBody = {
      creditedAmountMinor: rewardAmountMinor,
      updatedDemoBalanceMinor: updatedBalanceMinor,
      nextAvailableAt,
    };

    await saveIdempotencyRecord(
      user.id,
      params.idempotencyKey,
      endpointKey,
      200,
      responseBody,
      tx
    );

    await writeAuditLog(
      {
        userId: user.id,
        action: 'bonus.daily_claim',
        entityType: 'transaction',
        entityId: createdTx.id,
        ipAddress: params.ipAddress,
        metadata: { rewardAmountMinor, updatedBalanceMinor },
      },
      tx
    );

    return responseBody;
  });

  return result;
}

/**
 * Активация промокода с защитой от повторного использования одним и тем же игроком
 */
export async function redeemPromoCodeForUser(params: {
  userId: string;
  code: string;
  idempotencyKey?: string;
  ipAddress?: string;
}): Promise<{
  code: string;
  creditedAmountMinor: number;
  updatedDemoBalanceMinor: number;
}> {
  const normalizedCode = params.code.trim().toUpperCase();
  const endpointKey = `POST:/api/bonuses/promo/redeem:${normalizedCode}`;

  const cached = await checkIdempotency<{
    code: string;
    creditedAmountMinor: number;
    updatedDemoBalanceMinor: number;
  }>(params.userId, params.idempotencyKey, endpointKey);

  if (cached) {
    return cached.body;
  }

  const result = await prisma.$transaction(async (tx) => {
    const promo = await tx.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo || !promo.is_active) {
      throw new NotFoundError('Промокод не найден или более не активен.');
    }

    if (promo.expires_at && promo.expires_at <= new Date()) {
      throw new BadRequestError('Срок действия этого промокода истёк.');
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      throw new BadRequestError(
        'Лимит активаций для этого промокода полностью исчерпан.'
      );
    }

    const alreadyRedeemed = await tx.promoRedemption.findUnique({
      where: {
        user_id_promo_id: {
          user_id: params.userId,
          promo_id: promo.id,
        },
      },
    });

    if (alreadyRedeemed) {
      throw new ConflictError('Вы уже активировали этот промокод ранее.');
    }

    const user = await tx.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    const updatedBalanceMinor =
      user.demo_balance_minor + promo.reward_amount_minor;

    await tx.promoCode.update({
      where: { id: promo.id },
      data: { current_uses: { increment: 1 } },
    });

    await tx.promoRedemption.create({
      data: {
        user_id: user.id,
        promo_id: promo.id,
        promo_code: promo.code,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { demo_balance_minor: updatedBalanceMinor },
    });

    await tx.transaction.create({
      data: {
        user_id: user.id,
        type: 'promo_bonus',
        amount_minor: promo.reward_amount_minor,
        balance_after_minor: updatedBalanceMinor,
        description: `Активация промокода ${promo.code}`,
        reference_id: promo.id,
      },
    });

    const responseBody = {
      code: promo.code,
      creditedAmountMinor: promo.reward_amount_minor,
      updatedDemoBalanceMinor: updatedBalanceMinor,
    };

    await saveIdempotencyRecord(
      user.id,
      params.idempotencyKey,
      endpointKey,
      200,
      responseBody,
      tx
    );

    await writeAuditLog(
      {
        userId: user.id,
        action: 'bonus.promo_redeem',
        entityType: 'promo_code',
        entityId: promo.id,
        ipAddress: params.ipAddress,
        metadata: {
          code: promo.code,
          creditedAmountMinor: promo.reward_amount_minor,
        },
      },
      tx
    );

    return responseBody;
  });

  return result;
}