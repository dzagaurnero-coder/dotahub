import type {
  CaseEntity,
  CasePoolItem,
  DotaItem,
  InventoryItem,
  Prisma,
  Transaction,
  User,
} from '@prisma/client';
import type {
  CaseSummaryDto,
  DotaItemDto,
  InventoryItemDto,
  TransactionDto,
  UserProfileDto,
} from '@dotahub/shared';
import { prisma } from '@/config/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StoredIdempotencyResult<T = unknown> {
  statusCode: number;
  body: T;
}

/**
 * Запись события в неизменяемый журнал аудита (AuditLog)
 */
export async function writeAuditLog(
  input: AuditLogInput,
  db: DbClient = prisma
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        user_id: input.userId ?? null,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        ip_address: input.ipAddress ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (err) {
    // Ошибка логирования не должна прерывать уже зафиксированную пользовательскую операцию
    console.warn('⚠️ Не удалось записать событие в AuditLog:', err);
  }
}

/**
 * Проверка ключа идемпотентности (Idempotency-Key) для предотвращения повторного списания
 */
export async function checkIdempotency<T = unknown>(
  userId: string,
  key: string | undefined | null,
  endpoint: string
): Promise<StoredIdempotencyResult<T> | null> {
  if (!key || !key.trim()) {
    return null;
  }

  const normalizedKey = key.trim().slice(0, 128);
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      user_id_key: {
        user_id: userId,
        key: normalizedKey,
      },
    },
  });

  if (!existing) {
    return null;
  }

  if (existing.expires_at <= new Date()) {
    await prisma.idempotencyRecord
      .delete({ where: { id: existing.id } })
      .catch(() => {});
    return null;
  }

  if (existing.endpoint !== endpoint) {
    return null;
  }

  try {
    return {
      statusCode: existing.status_code,
      body: JSON.parse(existing.response_json) as T,
    };
  } catch {
    return null;
  }
}

/**
 * Сохранение ответа идемпотентной операции (по умолчанию на 24 часа)
 */
export async function saveIdempotencyRecord(
  userId: string,
  key: string | undefined | null,
  endpoint: string,
  statusCode: number,
  responseBody: unknown,
  db: DbClient = prisma,
  ttlHours = 24
): Promise<void> {
  if (!key || !key.trim()) {
    return;
  }

  const normalizedKey = key.trim().slice(0, 128);
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  const serialized = JSON.stringify(responseBody);

  await db.idempotencyRecord
    .upsert({
      where: {
        user_id_key: {
          user_id: userId,
          key: normalizedKey,
        },
      },
      update: {
        endpoint,
        status_code: statusCode,
        response_json: serialized,
        expires_at: expiresAt,
      },
      create: {
        user_id: userId,
        key: normalizedKey,
        endpoint,
        status_code: statusCode,
        response_json: serialized,
        expires_at: expiresAt,
      },
    })
    .catch(() => {});
}

/**
 * Маппер модели User -> UserProfileDto (скрывает password_hash и внутренние поля)
 */
export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    demo_balance_minor: user.demo_balance_minor,
    avatar_url: user.avatar_url,
    steam_trade_url: user.steam_trade_url,
    is_public_profile: user.is_public_profile,
    show_public_inventory: user.show_public_inventory,
    show_public_stats: user.show_public_stats,
    created_at: user.created_at.toISOString(),
  };
}

/**
 * Маппер модели DotaItem -> DotaItemDto
 */
export function toDotaItemDto(item: DotaItem): DotaItemDto {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    localized_name: item.localized_name,
    hero_id: item.hero_id,
    hero_slug: item.hero_slug,
    hero_name: item.hero_name,
    rarity: item.rarity,
    quality: item.quality,
    item_type: item.item_type,
    image_url: item.image_url,
    description: item.description,
    estimated_value_minor: item.estimated_value_minor,
  };
}

/**
 * Маппер модели CaseEntity -> CaseSummaryDto
 */
export function toCaseSummaryDto(
  caseEntity: CaseEntity & {
    _count?: { pool: number };
    pool?: CasePoolItem[];
  },
  favoriteIds?: Set<string>
): CaseSummaryDto {
  const itemsCount =
    caseEntity._count?.pool ??
    (Array.isArray(caseEntity.pool) ? caseEntity.pool.length : 0);

  return {
    id: caseEntity.id,
    slug: caseEntity.slug,
    name: caseEntity.name,
    subtitle: caseEntity.subtitle,
    description: caseEntity.description,
    category: caseEntity.category,
    price_minor: caseEntity.price_minor,
    image_url: caseEntity.image_url,
    is_featured: caseEntity.is_featured,
    items_count: itemsCount,
    is_favorite: favoriteIds ? favoriteIds.has(caseEntity.id) : false,
  };
}

/**
 * Маппер модели InventoryItem -> InventoryItemDto
 */
export function toInventoryItemDto(
  inv: InventoryItem & { item: DotaItem }
): InventoryItemDto {
  return {
    id: inv.id,
    user_id: inv.user_id,
    status: inv.status,
    acquired_source: inv.acquired_source as InventoryItemDto['acquired_source'],
    acquired_at: inv.acquired_at.toISOString(),
    item: toDotaItemDto(inv.item),
  };
}

/**
 * Маппер модели Transaction -> TransactionDto
 */
export function toTransactionDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    user_id: tx.user_id,
    type: tx.type,
    amount_minor: tx.amount_minor,
    balance_after_minor: tx.balance_after_minor,
    description: tx.description,
    reference_id: tx.reference_id,
    created_at: tx.created_at.toISOString(),
  };
}