import type { ItemQuality, ItemRarity, Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import {
  checkIdempotency,
  saveIdempotencyRecord,
  toCaseSummaryDto,
  toDotaItemDto,
  toInventoryItemDto,
  writeAuditLog,
} from '@/utils/audit';
import type {
  CaseSummaryDto,
  DotaItemDto,
  InventoryItemDto,
  InventoryQueryInput,
  ItemsCatalogQueryInput,
} from '@dotahub/shared';

export interface CatalogItemImportInput {
  external_def_id?: string | null;
  slug?: string;
  name: string;
  localized_name?: string;
  hero_slug?: string | null;
  hero_name?: string | null;
  rarity?: string;
  quality?: string;
  item_type?: string;
  image_url: string;
  description?: string | null;
  estimated_value_minor?: number | null;
}

const VALID_RARITIES = new Set<ItemRarity>([
  'common',
  'uncommon',
  'rare',
  'mythical',
  'legendary',
  'ancient',
  'immortal',
  'arcana',
]);

const VALID_QUALITIES = new Set<ItemQuality>([
  'standard',
  'inscribed',
  'exalted',
  'corrupted',
  'autographed',
  'infused',
  'genuine',
  'auspicious',
  'unusual',
  'heroic',
  'elder',
]);

function normalizeItemSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Выборка каталога косметических предметов Dota 2 с фильтрацией, сортировкой и списком героев
 */
export async function listDotaItemsCatalog(
  query: Partial<ItemsCatalogQueryInput>
): Promise<{
  items: DotaItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  heroes: Array<{ id: string; slug: string; localized_name: string }>;
}> {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(60, Math.max(1, Number(query.pageSize) || 24));
  const skip = (page - 1) * pageSize;

  const where: Prisma.DotaItemWhereInput = {
    is_active: true,
  };

  if (query.search && query.search.trim()) {
    const q = query.search.trim();
    where.OR = [
      { localized_name: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { hero_name: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (query.heroSlug && query.heroSlug.trim()) {
    where.hero_slug = query.heroSlug.trim().toLowerCase();
  }

  if (query.rarity && VALID_RARITIES.has(query.rarity as ItemRarity)) {
    where.rarity = query.rarity as ItemRarity;
  }

  if (query.quality && VALID_QUALITIES.has(query.quality as ItemQuality)) {
    where.quality = query.quality as ItemQuality;
  }

  if (query.itemType && query.itemType.trim()) {
    where.item_type = query.itemType.trim().toLowerCase();
  }

  if (
    typeof query.minPriceMinor === 'number' ||
    typeof query.maxPriceMinor === 'number'
  ) {
    where.estimated_value_minor = { not: null };
    if (typeof query.minPriceMinor === 'number') {
      where.estimated_value_minor.gte = query.minPriceMinor;
    }
    if (typeof query.maxPriceMinor === 'number') {
      where.estimated_value_minor.lte = query.maxPriceMinor;
    }
  }

  let orderBy: Prisma.DotaItemOrderByWithRelationInput[] = [
    { estimated_value_minor: { sort: 'desc', nulls: 'last' } },
    { localized_name: 'asc' },
  ];

  if (query.sort === 'price_asc') {
    orderBy = [
      { estimated_value_minor: { sort: 'asc', nulls: 'last' } },
      { localized_name: 'asc' },
    ];
  } else if (query.sort === 'name_asc') {
    orderBy = [{ localized_name: 'asc' }];
  } else if (query.sort === 'rarity_desc') {
    orderBy = [
      { estimated_value_minor: { sort: 'desc', nulls: 'last' } },
      { localized_name: 'asc' },
    ];
  }

  const [records, total, heroes] = await Promise.all([
    prisma.dotaItem.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.dotaItem.count({ where }),
    prisma.hero.findMany({
      select: { id: true, slug: true, localized_name: true },
      orderBy: { localized_name: 'asc' },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: records.map(toDotaItemDto),
    total,
    page,
    pageSize,
    totalPages,
    heroes,
  };
}

/**
 * Детальная карточка предмета Dota 2 по slug вместе со связанными кейсами и похожими предметами
 */
export async function getDotaItemDetailBySlug(
  slug: string,
  userId?: string | null
): Promise<{
  item: DotaItemDto;
  relatedCases: CaseSummaryDto[];
  similarItems: DotaItemDto[];
}> {
  const item = await prisma.dotaItem.findFirst({
    where: {
      slug: slug.trim().toLowerCase(),
      is_active: true,
    },
  });

  if (!item) {
    throw new NotFoundError('Предмет не найден в активном каталоге DotaHub.');
  }

  let favoriteCaseIds = new Set<string>();
  if (userId) {
    const favs = await prisma.favoriteCase.findMany({
      where: { user_id: userId },
      select: { case_id: true },
    });
    favoriteCaseIds = new Set(favs.map((f) => f.case_id));
  }

  const [poolEntries, similarRecords] = await Promise.all([
    prisma.casePoolItem.findMany({
      where: {
        item_id: item.id,
        case_entity: { is_active: true },
      },
      include: {
        case_entity: {
          include: { _count: { select: { pool: true } } },
        },
      },
    }),
    prisma.dotaItem.findMany({
      where: {
        id: { not: item.id },
        is_active: true,
        OR: [
          ...(item.hero_slug ? [{ hero_slug: item.hero_slug }] : []),
          { rarity: item.rarity },
        ],
      },
      orderBy: { estimated_value_minor: { sort: 'desc', nulls: 'last' } },
      take: 6,
    }),
  ]);

  const relatedCases = poolEntries.map((pe) =>
    toCaseSummaryDto(pe.case_entity, favoriteCaseIds)
  );

  return {
    item: toDotaItemDto(item),
    relatedCases,
    similarItems: similarRecords.map(toDotaItemDto),
  };
}

/**
 * Список предметов инвентаря пользователя со сводной статистикой доступных предметов
 */
export async function listUserInventory(
  userId: string,
  query: Partial<InventoryQueryInput>
): Promise<{
  items: InventoryItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalAvailableCount: number;
    totalAvailableValueMinor: number;
  };
}> {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(60, Math.max(1, Number(query.pageSize) || 18));
  const skip = (page - 1) * pageSize;

  const where: Prisma.InventoryItemWhereInput = {
    user_id: userId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.rarity && VALID_RARITIES.has(query.rarity as ItemRarity)) {
    where.item = {
      rarity: query.rarity as ItemRarity,
    };
  }

  let orderBy: Prisma.InventoryItemOrderByWithRelationInput[] = [
    { acquired_at: 'desc' },
  ];

  if (query.sort === 'price_desc') {
    orderBy = [
      { item: { estimated_value_minor: { sort: 'desc', nulls: 'last' } } },
      { acquired_at: 'desc' },
    ];
  } else if (query.sort === 'price_asc') {
    orderBy = [
      { item: { estimated_value_minor: { sort: 'asc', nulls: 'last' } } },
      { acquired_at: 'desc' },
    ];
  }

  const [records, total, availableRecords] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { item: true },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where: { user_id: userId, status: 'available' },
      include: {
        item: { select: { estimated_value_minor: true } },
      },
    }),
  ]);

  const totalAvailableCount = availableRecords.length;
  const totalAvailableValueMinor = availableRecords.reduce(
    (sum, r) => sum + (r.item.estimated_value_minor ?? 0),
    0
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: records.map(toInventoryItemDto),
    total,
    page,
    pageSize,
    totalPages,
    summary: {
      totalAvailableCount,
      totalAvailableValueMinor,
    },
  };
}

/**
 * Атомарная продажа доступного предмета из инвентаря на виртуальный демобаланс
 */
export async function sellUserInventoryItem(params: {
  userId: string;
  inventoryItemId: string;
  idempotencyKey?: string;
  ipAddress?: string;
}): Promise<{
  soldInventoryItemId: string;
  creditedAmountMinor: number;
  updatedDemoBalanceMinor: number;
}> {
  const endpointKey = `POST:/api/inventory/${params.inventoryItemId}/sell`;

  const cached = await checkIdempotency<{
    soldInventoryItemId: string;
    creditedAmountMinor: number;
    updatedDemoBalanceMinor: number;
  }>(params.userId, params.idempotencyKey, endpointKey);

  if (cached) {
    return cached.body;
  }

  const result = await prisma.$transaction(async (tx) => {
    const invItem = await tx.inventoryItem.findFirst({
      where: {
        id: params.inventoryItemId,
        user_id: params.userId,
      },
      include: { item: true },
    });

    if (!invItem) {
      throw new NotFoundError('Предмет не найден в вашем инвентаре.');
    }

    if (invItem.status !== 'available') {
      throw new BadRequestError(
        'Этот предмет уже продан или использован в Upgrader.'
      );
    }

    const sellAmountMinor = invItem.item.estimated_value_minor ?? 0;
    if (sellAmountMinor <= 0) {
      throw new BadRequestError(
        'Предмет не имеет установленной оценки стоимости для продажи.'
      );
    }

    const user = await tx.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    const updatedBalanceMinor = user.demo_balance_minor + sellAmountMinor;

    await tx.inventoryItem.update({
      where: { id: invItem.id },
      data: { status: 'sold' },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { demo_balance_minor: updatedBalanceMinor },
    });

    await tx.transaction.create({
      data: {
        user_id: user.id,
        type: 'item_sale',
        amount_minor: sellAmountMinor,
        balance_after_minor: updatedBalanceMinor,
        description: `Продажа предмета «${invItem.item.localized_name}» из инвентаря`,
        reference_id: invItem.id,
      },
    });

    const responseBody = {
      soldInventoryItemId: invItem.id,
      creditedAmountMinor: sellAmountMinor,
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
        action: 'inventory.sell',
        entityType: 'inventory_item',
        entityId: invItem.id,
        ipAddress: params.ipAddress,
        metadata: {
          itemSlug: invItem.item.slug,
          creditedAmountMinor: sellAmountMinor,
        },
      },
      tx
    );

    return responseBody;
  });

  return result;
}

/**
 * Идемпотентный пакетный импорт предметов Dota 2 в каталог без создания дублей
 */
export async function importCatalogItemsBatch(
  rawItems: CatalogItemImportInput[]
): Promise<{ importedCount: number }> {
  let importedCount = 0;

  for (const raw of rawItems) {
    const slug = normalizeItemSlug(raw.slug || raw.name);
    if (!slug) continue;

    const rarityNorm = (raw.rarity?.toLowerCase() ?? 'common') as ItemRarity;
    const rarity: ItemRarity = VALID_RARITIES.has(rarityNorm)
      ? rarityNorm
      : 'common';

    const qualityNorm = (raw.quality?.toLowerCase() ?? 'standard') as ItemQuality;
    const quality: ItemQuality = VALID_QUALITIES.has(qualityNorm)
      ? qualityNorm
      : 'standard';

    let heroId: string | null = null;
    let heroName: string | null = raw.hero_name ?? null;

    if (raw.hero_slug) {
      const hero = await prisma.hero.findUnique({
        where: { slug: raw.hero_slug.toLowerCase() },
      });
      if (hero) {
        heroId = hero.id;
        heroName = hero.localized_name;
      }
    }

    const estimatedMinor =
      typeof raw.estimated_value_minor === 'number' &&
      raw.estimated_value_minor >= 0
        ? Math.round(raw.estimated_value_minor)
        : null;

    await prisma.dotaItem.upsert({
      where: { slug },
      update: {
        external_def_id: raw.external_def_id ?? undefined,
        name: raw.name,
        localized_name: raw.localized_name || raw.name,
        hero_id: heroId,
        hero_slug: raw.hero_slug ?? null,
        hero_name: heroName,
        rarity,
        quality,
        item_type: raw.item_type || 'weapon',
        image_url: raw.image_url,
        description: raw.description ?? null,
        estimated_value_minor: estimatedMinor,
        is_active: true,
      },
      create: {
        external_def_id: raw.external_def_id ?? null,
        slug,
        name: raw.name,
        localized_name: raw.localized_name || raw.name,
        hero_id: heroId,
        hero_slug: raw.hero_slug ?? null,
        hero_name: heroName,
        rarity,
        quality,
        item_type: raw.item_type || 'weapon',
        image_url: raw.image_url,
        description: raw.description ?? null,
        estimated_value_minor: estimatedMinor,
        is_active: true,
      },
    });

    importedCount += 1;
  }

  return { importedCount };
}