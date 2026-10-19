import { z } from 'zod';
import {
  BALANCE_TYPES,
  CASE_CATEGORIES,
  INVENTORY_ITEM_STATUSES,
  ITEM_QUALITIES,
  ITEM_RARITIES,
  ITEM_TYPES,
  TRANSACTION_TYPES,
} from './constants';

// ==========================================
// ОБЩИЕ ПРИМИТИВЫ И КЛЮЧИ ИДЕМПОТЕНТНОСТИ
// ==========================================

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Ключ идемпотентности должен содержать минимум 8 символов')
  .max(128, 'Ключ идемпотентности слишком длинный')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Недопустимый формат ключа идемпотентности');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

// ==========================================
// АВТОРИЗАЦИЯ И ПРОФИЛЬ
// ==========================================

export const registerRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Введите корректный адрес электронной почты')
    .max(255),
  username: z
    .string()
    .trim()
    .min(3, 'Имя пользователя должно содержать от 3 символов')
    .max(32, 'Имя пользователя не должно превышать 32 символа')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Имя пользователя может содержать только латинские буквы, цифры и символ подчёркивания'
    ),
  display_name: z
    .string()
    .trim()
    .min(2, 'Отображаемое имя должно содержать от 2 символов')
    .max(48, 'Отображаемое имя не должно превышать 48 символов')
    .optional(),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(128, 'Пароль слишком длинный'),
});

export const loginRequestSchema = z.object({
  login: z.string().trim().min(1, 'Укажите email или имя пользователя').max(255),
  password: z.string().min(1, 'Введите пароль').max(128),
});

export const updateProfileRequestSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(48, 'Имя не должно превышать 48 символов')
    .optional(),
  avatar_url: z
    .string()
    .trim()
    .url('Укажите корректный URL изображения')
    .max(512)
    .nullable()
    .optional(),
  client_seed: z
    .string()
    .trim()
    .min(4, 'Client seed должен содержать минимум 4 символа')
    .max(64, 'Client seed не должен превышать 64 символа')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Client seed может содержать только латинские буквы, цифры, - и _')
    .optional(),
  privacy: z
    .object({
      is_profile_public: z.boolean().optional(),
      show_inventory: z.boolean().optional(),
      show_stats: z.boolean().optional(),
    })
    .optional(),
});

// ==========================================
// КАТАЛОГ КЕЙСОВ И ОТКРЫТИЕ КЕЙСА
// ==========================================

export const casesCatalogQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(CASE_CATEGORIES).optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  onlyFavorites: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z
    .enum(['popular', 'newest', 'price_asc', 'price_desc'])
    .default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(20),
});

/**
 * Запрос на открытие кейса. Клиент НЕ передаёт цену или выигранный предмет —
 * только идентификатор кейса и ключ идемпотентности.
 */
export const openCaseRequestSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  clientSeed: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

// ==========================================
// UPGRADER
// ==========================================

/**
 * Запрос на выполнение апгрейда. Вероятность и стоимость рассчитываются
 * исключительно сервером на основании данных из БД.
 */
export const upgraderAttemptRequestSchema = z.object({
  sourceInventoryItemId: z.string().trim().min(1, 'Выберите исходный предмет из инвентаря'),
  targetItemId: z.string().trim().min(1, 'Выберите целевой предмет из каталога'),
  idempotencyKey: idempotencyKeySchema,
});

// ==========================================
// КАТАЛОГ ПРЕДМЕТОВ DOTA 2 И ИМПОРТ
// ==========================================

export const itemsCatalogQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  heroId: z.coerce.number().int().positive().optional(),
  heroName: z.string().trim().max(80).optional(),
  rarity: z.string().trim().max(40).optional(),
  quality: z.string().trim().max(40).optional(),
  itemType: z.string().trim().max(40).optional(),
  minPriceMinor: z.coerce.number().int().min(0).optional(),
  maxPriceMinor: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum(['value_desc', 'value_asc', 'name_asc', 'rarity_desc', 'newest'])
    .default('value_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

export const catalogImportItemSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(200),
  localized_name: z.string().trim().min(1).max(200),
  hero_id: z.number().int().positive().nullable().optional(),
  hero_name: z.string().trim().max(100).nullable().optional(),
  item_type: z.string().trim().min(1).max(60).default('other'),
  rarity: z.string().trim().min(1).max(60).default('common'),
  quality: z.string().trim().min(1).max(60).default('standard'),
  image_url: z.string().trim().min(1).max(1024),
  icon_url: z.string().trim().max(1024).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  source: z.string().trim().min(1).max(120).default('json_catalog'),
  source_updated_at: z.string().datetime().nullable().optional(),
  estimated_value_minor: z.number().int().min(0).nullable().optional(),
  value_currency: z.string().trim().length(3).default('RUB'),
  tradable: z.boolean().default(true),
  marketable: z.boolean().default(true),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// ==========================================
// ИНВЕНТАРЬ
// ==========================================

export const inventoryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  rarity: z.string().trim().max(40).optional(),
  heroName: z.string().trim().max(80).optional(),
  status: z.enum(INVENTORY_ITEM_STATUSES).default('available'),
  sort: z
    .enum(['acquired_desc', 'value_desc', 'value_asc', 'rarity_desc'])
    .default('acquired_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

// ==========================================
// БАЛАНС, ИСТОРИЯ ОПЕРАЦИЙ И БОНУСЫ
// ==========================================

export const transactionsQuerySchema = z.object({
  balanceType: z.enum(BALANCE_TYPES).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const demoTopupRequestSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
});

export const claimDailyBonusRequestSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
});

export const redeemPromoCodeRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Промокод должен содержать от 3 символов')
    .max(32, 'Промокод не должен превышать 32 символа')
    .regex(/^[A-Z0-9_-]+$/, 'Промокод содержит недопустимые символы'),
  idempotencyKey: idempotencyKeySchema,
});

// ==========================================
// АДМИНИСТРАТИВНАЯ ПАНЕЛЬ
// ==========================================

export const adminCaseItemInputSchema = z.object({
  item_id: z.string().trim().min(1),
  drop_chance_percent: z.number().positive().max(100),
  weight: z.number().int().positive().default(100),
  is_featured: z.boolean().default(false),
});

export const adminCaseUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефис'),
  name: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.enum(CASE_CATEGORIES),
  price_minor: z.number().int().min(100, 'Минимальная стоимость кейса — 1 ₽ (100 копеек)'),
  image_url: z.string().trim().min(1).max(1024),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  pool: z
    .array(adminCaseItemInputSchema)
    .min(2, 'В пуле кейса должно быть минимум 2 предмета'),
});

export const adminAdjustDemoBalanceSchema = z.object({
  userId: z.string().trim().min(1),
  deltaMinor: z
    .number()
    .int()
    .refine((val) => val !== 0, 'Сумма изменения не может быть равна нулю'),
  reason: z.string().trim().min(3, 'Укажите причину корректировки для журнала аудита').max(300),
});

export const adminCreatePromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/),
  reward_amount_minor: z.number().int().min(100).max(100_000_000),
  max_activations: z.number().int().min(1).max(1_000_000),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const adminPaymentProviderUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  is_enabled: z.boolean(),
  supported_currencies: z.array(z.string().trim().length(3)).min(1),
  min_amount_minor: z.number().int().min(100),
  max_amount_minor: z.number().int().min(100),
  allowed_methods: z.array(z.string().trim().min(1)).min(1),
  webhook_url: z.string().trim().url().nullable().optional(),
});

export const adminSiteSettingsUpdateSchema = z.object({
  demo_mode_enabled: z.boolean().optional(),
  initial_demo_balance_minor: z.number().int().min(0).max(50_000_000).optional(),
  daily_bonus_amount_minor: z.number().int().min(0).max(5_000_000).optional(),
  upgrader_house_edge_percent: z.number().min(0).max(25).optional(),
});

export type RegisterRequestInput = z.infer<typeof registerRequestSchema>;
export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type UpdateProfileRequestInput = z.infer<typeof updateProfileRequestSchema>;
export type CasesCatalogQueryInput = z.infer<typeof casesCatalogQuerySchema>;
export type OpenCaseRequestInput = z.infer<typeof openCaseRequestSchema>;
export type UpgraderAttemptRequestInput = z.infer<typeof upgraderAttemptRequestSchema>;
export type ItemsCatalogQueryInput = z.infer<typeof itemsCatalogQuerySchema>;
export type CatalogImportItemInput = z.infer<typeof catalogImportItemSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
export type TransactionsQueryInput = z.infer<typeof transactionsQuerySchema>;
export type AdminCaseUpsertInput = z.infer<typeof adminCaseUpsertSchema>;