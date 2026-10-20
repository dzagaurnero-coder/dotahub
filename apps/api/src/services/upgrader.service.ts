import {
  calculateUpgraderChance,
  type UpgraderAttemptResultDto,
} from '@dotahub/shared';
import { prisma } from '@/config/prisma';
import { createProvablyFairDraw } from '@/utils/crypto-rng';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import {
  checkIdempotency,
  saveIdempotencyRecord,
  toDotaItemDto,
  toInventoryItemDto,
  writeAuditLog,
} from '@/utils/audit';

export interface RunUpgraderAttemptParams {
  userId: string;
  inventoryItemId: string;
  targetItemId: string;
  idempotencyKey?: string;
  clientSeed?: string;
  ipAddress?: string;
}

/**
 * Выполнение атомарной попытки апгрейда предмета
 */
export async function runUpgraderAttempt(
  params: RunUpgraderAttemptParams
): Promise<{ result: UpgraderAttemptResultDto }> {
  const endpointKey = 'POST:/api/upgrader/attempt';

  // 1. Проверка идемпотентности
  const cached = await checkIdempotency<{ result: UpgraderAttemptResultDto }>(
    params.userId,
    params.idempotencyKey,
    endpointKey
  );
  if (cached) {
    return cached.body;
  }

  // 2. Транзакция проверки предметов, расчёта шанса и записи результата
  const responseBody = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    const sourceInventory = await tx.inventoryItem.findFirst({
      where: {
        id: params.inventoryItemId,
        user_id: params.userId,
      },
      include: { item: true },
    });

    if (!sourceInventory) {
      throw new NotFoundError('Исходный предмет не найден в вашем инвентаре.');
    }

    if (sourceInventory.status !== 'available') {
      throw new BadRequestError(
        'Этот предмет уже был использован, улучшен или продан.'
      );
    }

    const targetItem = await tx.dotaItem.findFirst({
      where: {
        id: params.targetItemId,
        is_active: true,
      },
    });

    if (!targetItem) {
      throw new NotFoundError('Целевой предмет не найден в активном каталоге.');
    }

    const sourceValueMinor = sourceInventory.item.estimated_value_minor ?? 0;
    const targetValueMinor = targetItem.estimated_value_minor ?? 0;

    if (sourceValueMinor <= 0 || targetValueMinor <= 0) {
      throw new BadRequestError(
        'Предметы без установленной оценки не могут участвовать в Upgrader.'
      );
    }

    const calculation = calculateUpgraderChance(
      sourceValueMinor,
      targetValueMinor
    );

    if (!calculation.isValid) {
      throw new BadRequestError(
        calculation.reasonRu ||
          'Недопустимое соотношение стоимости предметов для апгрейда.'
      );
    }

    const nextNonce = user.provably_fair_nonce + 1;
    await tx.user.update({
      where: { id: user.id },
      data: { provably_fair_nonce: nextNonce },
    });

    const draw = createProvablyFairDraw(params.clientSeed, nextNonce);
    const winThresholdBasisPoints = Math.round(calculation.chancePercent * 100);
    const isWon = draw.rollBasisPoints < winThresholdBasisPoints;

    // Списываем исходный предмет инвентаря
    await tx.inventoryItem.update({
      where: { id: sourceInventory.id },
      data: { status: 'consumed' },
    });

    let createdWinInventory: Awaited<
      ReturnType<typeof tx.inventoryItem.create>
    > | null = null;

    if (isWon) {
      createdWinInventory = await tx.inventoryItem.create({
        data: {
          user_id: user.id,
          item_id: targetItem.id,
          status: 'available',
          acquired_source: 'upgrader_win',
        },
      });
    }

    const attemptRecord = await tx.upgraderAttempt.create({
      data: {
        user_id: user.id,
        source_inventory_item_id: sourceInventory.id,
        result_inventory_item_id: createdWinInventory?.id ?? null,
        source_item_id: sourceInventory.item.id,
        target_item_id: targetItem.id,
        source_value_minor: sourceValueMinor,
        target_value_minor: targetValueMinor,
        multiplier: calculation.multiplier,
        chance_percent: calculation.chancePercent,
        roll_basis_points: draw.rollBasisPoints,
        status: isWon ? 'won' : 'lost',
        server_seed_hash: draw.serverSeedHash,
        server_seed: draw.serverSeed,
        client_seed: draw.clientSeed,
        nonce: draw.nonce,
      },
    });

    await tx.transaction.create({
      data: {
        user_id: user.id,
        type: isWon ? 'upgrader_win' : 'upgrader_bet',
        amount_minor: isWon ? targetValueMinor : sourceValueMinor,
        balance_after_minor: user.demo_balance_minor,
        description: isWon
          ? `Успешный апгрейд: ${sourceInventory.item.localized_name} → ${targetItem.localized_name}`
          : `Неудачный апгрейд: ${sourceInventory.item.localized_name} → ${targetItem.localized_name}`,
        reference_id: attemptRecord.id,
      },
    });

    const resultDto: UpgraderAttemptResultDto = {
      attempt_id: attemptRecord.id,
      status: isWon ? 'won' : 'lost',
      chance_percent: calculation.chancePercent,
      multiplier: calculation.multiplier,
      source_item: toDotaItemDto(sourceInventory.item),
      target_item: toDotaItemDto(targetItem),
      result_inventory_item: createdWinInventory
        ? toInventoryItemDto({ ...createdWinInventory, item: targetItem })
        : null,
      provably_fair: {
        server_seed_hash: draw.serverSeedHash,
        server_seed_revealed: draw.serverSeed,
        client_seed: draw.clientSeed,
        nonce: draw.nonce,
        roll_basis_points: draw.rollBasisPoints,
      },
      created_at: attemptRecord.created_at.toISOString(),
    };

    const payload = { result: resultDto };

    await saveIdempotencyRecord(
      user.id,
      params.idempotencyKey,
      endpointKey,
      200,
      payload,
      tx
    );

    await writeAuditLog(
      {
        userId: user.id,
        action: isWon ? 'upgrader.win' : 'upgrader.loss',
        entityType: 'upgrader_attempt',
        entityId: attemptRecord.id,
        ipAddress: params.ipAddress,
        metadata: {
          sourceItemSlug: sourceInventory.item.slug,
          targetItemSlug: targetItem.slug,
          chancePercent: calculation.chancePercent,
          rollBasisPoints: draw.rollBasisPoints,
        },
      },
      tx
    );

    return payload;
  });

  return responseBody;
}

/**
 * Получение истории последних попыток апгрейда пользователя
 */
export async function listUserUpgraderHistory(
  userId: string,
  limit = 20
): Promise<{ attempts: UpgraderAttemptResultDto[] }> {
  const records = await prisma.upgraderAttempt.findMany({
    where: { user_id: userId },
    include: {
      source_item: true,
      target_item: true,
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  const attempts: UpgraderAttemptResultDto[] = records.map((rec) => ({
    attempt_id: rec.id,
    status: rec.status,
    chance_percent: rec.chance_percent,
    multiplier: rec.multiplier,
    source_item: toDotaItemDto(rec.source_item),
    target_item: toDotaItemDto(rec.target_item),
    result_inventory_item: null,
    provably_fair: {
      server_seed_hash: rec.server_seed_hash,
      server_seed_revealed: rec.server_seed,
      client_seed: rec.client_seed,
      nonce: rec.nonce,
      roll_basis_points: rec.roll_basis_points,
    },
    created_at: rec.created_at.toISOString(),
  }));

  return { attempts };
}