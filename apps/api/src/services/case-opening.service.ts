import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import {
  createProvablyFairDraw,
  pickWeightedPoolItem,
} from '@/utils/crypto-rng';
import {
  BadRequestError,
  NotFoundError,
} from '@/utils/errors';
import {
  checkIdempotency,
  saveIdempotencyRecord,
  toCaseSummaryDto,
  toDotaItemDto,
  writeAuditLog,
} from '@/utils/audit';
import type {
  CaseDetailDto,
  CaseOpeningResultDto,
  CasesCatalogQueryInput,
  CaseSummaryDto,
  RecentCaseOpeningDto,
} from '@dotahub/shared';

export interface OpenCaseInputOptions {
  idempotencyKey?: string;
  clientSeed?: string;
  fastOpen?: boolean;
  ipAddress?: string;
}

/**
 * Формирование списка последних открытий кейсов для живой ленты
 */
async function fetchRecentOpenings(
  caseId?: string,
  limit = 14
): Promise<RecentCaseOpeningDto[]> {
  const openings = await prisma.caseOpening.findMany({
    where: caseId ? { case_id: caseId } : undefined,
    include: {
      user: { select: { display_name: true } },
      case_entity: { select: { slug: true, name: true, price_minor: true } },
      won_item: {
        select: { localized_name: true, rarity: true, image_url: true },
      },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return openings.map((entry) => ({
    id: entry.id,
    case_slug: entry.case_entity.slug,
    case_name: entry.case_entity.name,
    price_minor: entry.price_minor,
    item_name: entry.won_item.localized_name,
    item_rarity: entry.won_item.rarity,
    item_image_url: entry.won_item.image_url,
    user_display_name: entry.user.display_name,
    opened_at: entry.created_at.toISOString(),
  }));
}

/**
 * Получение списка кейсов с фильтрацией и лентой последних дропов
 */
export async function listCasesCatalog(
  query: Partial<CasesCatalogQueryInput>,
  userId?: string | null
): Promise<{
  cases: CaseSummaryDto[];
  recentOpenings: RecentCaseOpeningDto[];
}> {
  const where: Prisma.CaseEntityWhereInput = {
    is_active: true,
  };

  if (query.category) {
    where.category = query.category;
  }

  if (query.search && query.search.trim()) {
    const q = query.search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { subtitle: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (
    typeof query.minPriceMinor === 'number' ||
    typeof query.maxPriceMinor === 'number'
  ) {
    where.price_minor = {};
    if (typeof query.minPriceMinor === 'number') {
      where.price_minor.gte = query.minPriceMinor;
    }
    if (typeof query.maxPriceMinor === 'number') {
      where.price_minor.lte = query.maxPriceMinor;
    }
  }

  let favoriteCaseIds = new Set<string>();
  if (userId) {
    const favs = await prisma.favoriteCase.findMany({
      where: { user_id: userId },
      select: { case_id: true },
    });
    favoriteCaseIds = new Set(favs.map((f) => f.case_id));
  }

  if (query.onlyFavorites) {
    if (!userId || favoriteCaseIds.size === 0) {
      const recentOpenings = await fetchRecentOpenings(undefined, 12);
      return { cases: [], recentOpenings };
    }
    where.id = { in: Array.from(favoriteCaseIds) };
  }

  let orderBy: Prisma.CaseEntityOrderByWithRelationInput[] = [
    { is_featured: 'desc' },
    { sort_order: 'asc' },
  ];

  if (query.sort === 'price_asc') {
    orderBy = [{ price_minor: 'asc' }];
  } else if (query.sort === 'price_desc') {
    orderBy = [{ price_minor: 'desc' }];
  } else if (query.sort === 'name_asc') {
    orderBy = [{ name: 'asc' }];
  }

  const [caseEntities, recentOpenings] = await Promise.all([
    prisma.caseEntity.findMany({
      where,
      include: {
        _count: { select: { pool: true } },
      },
      orderBy,
    }),
    fetchRecentOpenings(undefined, 14),
  ]);

  const cases = caseEntities.map((c) => toCaseSummaryDto(c, favoriteCaseIds));

  return { cases, recentOpenings };
}

/**
 * Получение детальной информации о кейсе по его slug вместе с пулом вероятностей
 */
export async function getCaseDetailBySlug(
  slug: string,
  userId?: string | null
): Promise<{ caseData: CaseDetailDto }> {
  const caseEntity = await prisma.caseEntity.findFirst({
    where: {
      slug: slug.trim().toLowerCase(),
      is_active: true,
    },
    include: {
      pool: {
        include: { item: true },
        orderBy: { chance_percent: 'asc' },
      },
    },
  });

  if (!caseEntity) {
    throw new NotFoundError('Запрашиваемый кейс не найден или отключён.');
  }

  let isFavorite = false;
  if (userId) {
    const fav = await prisma.favoriteCase.findUnique({
      where: {
        user_id_case_id: {
          user_id: userId,
          case_id: caseEntity.id,
        },
      },
    });
    isFavorite = Boolean(fav);
  }

  const recentOpenings = await fetchRecentOpenings(caseEntity.id, 8);

  const totalWeight = caseEntity.pool.reduce(
    (sum, entry) => sum + Math.max(1, entry.weight),
    0
  );

  const poolDto = caseEntity.pool.map((entry) => {
    const calculatedChance =
      totalWeight > 0
        ? Number(((entry.weight / totalWeight) * 100).toFixed(2))
        : entry.chance_percent;

    return {
      id: entry.id,
      weight: entry.weight,
      chance_percent: calculatedChance,
      item: toDotaItemDto(entry.item),
    };
  });

  const caseData: CaseDetailDto = {
    id: caseEntity.id,
    slug: caseEntity.slug,
    name: caseEntity.name,
    subtitle: caseEntity.subtitle,
    description: caseEntity.description,
    category: caseEntity.category,
    price_minor: caseEntity.price_minor,
    image_url: caseEntity.image_url,
    is_featured: caseEntity.is_featured,
    items_count: poolDto.length,
    is_favorite: isFavorite,
    pool: poolDto,
    recent_openings: recentOpenings,
  };

  return { caseData };
}

/**
 * Переключение кейса в избранном пользователя
 */
export async function toggleUserFavoriteCase(
  userId: string,
  caseId: string
): Promise<{ isFavorite: boolean }> {
  const caseExists = await prisma.caseEntity.findUnique({
    where: { id: caseId },
    select: { id: true },
  });

  if (!caseExists) {
    throw new NotFoundError('Кейс не найден.');
  }

  const existingFav = await prisma.favoriteCase.findUnique({
    where: {
      user_id_case_id: {
        user_id: userId,
        case_id: caseId,
      },
    },
  });

  if (existingFav) {
    await prisma.favoriteCase.delete({ where: { id: existingFav.id } });
    return { isFavorite: false };
  }

  await prisma.favoriteCase.create({
    data: {
      user_id: userId,
      case_id: caseId,
    },
  });

  return { isFavorite: true };
}

/**
 * Атомарное открытие виртуального кейса с проверкой баланса, идемпотентности и HMAC-SHA256
 */
export async function openCaseForUser(
  userId: string,
  slug: string,
  options: OpenCaseInputOptions
): Promise<{ result: CaseOpeningResultDto }> {
  const endpointKey = `POST:/api/cases/${slug}/open`;

  // 1. Проверка ключа идемпотентности
  const cached = await checkIdempotency<{ result: CaseOpeningResultDto }>(
    userId,
    options.idempotencyKey,
    endpointKey
  );
  if (cached) {
    return cached.body;
  }

  const caseEntity = await prisma.caseEntity.findFirst({
    where: {
      slug: slug.trim().toLowerCase(),
      is_active: true,
    },
    include: {
      pool: {
        include: { item: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!caseEntity) {
    throw new NotFoundError('Кейс не найден или временно недоступен.');
  }

  if (caseEntity.pool.length === 0) {
    throw new BadRequestError('Пул предметов этого кейса пуст.');
  }

  // 2. Атомарная транзакция списания баланса, генерации броска и выдачи предмета
  const responsePayload = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    if (user.demo_balance_minor < caseEntity.price_minor) {
      throw new BadRequestError(
        'Недостаточно средств на демобалансе для открытия этого кейса.'
      );
    }

    const nextNonce = user.provably_fair_nonce + 1;
    const updatedBalanceMinor = user.demo_balance_minor - caseEntity.price_minor;

    const draw = createProvablyFairDraw(options.clientSeed, nextNonce);
    const winningPoolEntry = pickWeightedPoolItem(
      caseEntity.pool,
      draw.rollBasisPoints
    );

    await tx.user.update({
      where: { id: user.id },
      data: {
        demo_balance_minor: updatedBalanceMinor,
        provably_fair_nonce: nextNonce,
      },
    });

    const createdInventoryItem = await tx.inventoryItem.create({
      data: {
        user_id: user.id,
        item_id: winningPoolEntry.item.id,
        status: 'available',
        acquired_source: 'case_open',
      },
    });

    const createdOpening = await tx.caseOpening.create({
      data: {
        user_id: user.id,
        case_id: caseEntity.id,
        won_item_id: winningPoolEntry.item.id,
        inventory_item_id: createdInventoryItem.id,
        price_minor: caseEntity.price_minor,
        roll_basis_points: draw.rollBasisPoints,
        server_seed_hash: draw.serverSeedHash,
        server_seed: draw.serverSeed,
        client_seed: draw.clientSeed,
        nonce: draw.nonce,
      },
    });

    await tx.transaction.create({
      data: {
        user_id: user.id,
        type: 'case_opening',
        amount_minor: caseEntity.price_minor,
        balance_after_minor: updatedBalanceMinor,
        description: `Открытие кейса «${caseEntity.name}» — выпал ${winningPoolEntry.item.localized_name}`,
        reference_id: createdOpening.id,
      },
    });

    const resultDto: CaseOpeningResultDto = {
      opening_id: createdOpening.id,
      case_id: caseEntity.id,
      case_slug: caseEntity.slug,
      price_paid_minor: caseEntity.price_minor,
      updated_demo_balance_minor: updatedBalanceMinor,
      inventory_item_id: createdInventoryItem.id,
      won_item: toDotaItemDto(winningPoolEntry.item),
      provably_fair: {
        server_seed_hash: draw.serverSeedHash,
        server_seed_revealed: draw.serverSeed,
        client_seed: draw.clientSeed,
        nonce: draw.nonce,
        roll_basis_points: draw.rollBasisPoints,
      },
      opened_at: createdOpening.created_at.toISOString(),
    };

    const body = { result: resultDto };

    await saveIdempotencyRecord(
      user.id,
      options.idempotencyKey,
      endpointKey,
      200,
      body,
      tx
    );

    await writeAuditLog(
      {
        userId: user.id,
        action: 'case.open',
        entityType: 'case_opening',
        entityId: createdOpening.id,
        ipAddress: options.ipAddress,
        metadata: {
          caseSlug: caseEntity.slug,
          priceMinor: caseEntity.price_minor,
          wonItemSlug: winningPoolEntry.item.slug,
          rollBasisPoints: draw.rollBasisPoints,
        },
      },
      tx
    );

    return body;
  });

  return responsePayload;
}