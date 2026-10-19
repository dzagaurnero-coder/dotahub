export const CURRENCY = {
  CODE: 'RUB',
  SYMBOL: '₽',
  MINOR_UNITS_PER_MAJOR: 100,
} as const;

export const ITEM_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'mythical',
  'legendary',
  'ancient',
  'immortal',
  'arcana',
] as const;

export type KnownItemRarity = (typeof ITEM_RARITIES)[number];

export interface RarityMeta {
  code: KnownItemRarity | string;
  labelRu: string;
  labelEn: string;
  colorHex: string;
  weight: number;
}

export const RARITY_META_MAP: Record<KnownItemRarity, RarityMeta> = {
  common: {
    code: 'common',
    labelRu: 'Common',
    labelEn: 'Common',
    colorHex: '#B0C3D9',
    weight: 10,
  },
  uncommon: {
    code: 'uncommon',
    labelRu: 'Uncommon',
    labelEn: 'Uncommon',
    colorHex: '#5E98D9',
    weight: 20,
  },
  rare: {
    code: 'rare',
    labelRu: 'Rare',
    labelEn: 'Rare',
    colorHex: '#4B69FF',
    weight: 30,
  },
  mythical: {
    code: 'mythical',
    labelRu: 'Mythical',
    labelEn: 'Mythical',
    colorHex: '#8847FF',
    weight: 40,
  },
  legendary: {
    code: 'legendary',
    labelRu: 'Legendary',
    labelEn: 'Legendary',
    colorHex: '#D32CE6',
    weight: 50,
  },
  ancient: {
    code: 'ancient',
    labelRu: 'Ancient',
    labelEn: 'Ancient',
    colorHex: '#EB4B4B',
    weight: 60,
  },
  immortal: {
    code: 'immortal',
    labelRu: 'Immortal',
    labelEn: 'Immortal',
    colorHex: '#E4AE39',
    weight: 70,
  },
  arcana: {
    code: 'arcana',
    labelRu: 'Arcana',
    labelEn: 'Arcana',
    colorHex: '#ADE55C',
    weight: 80,
  },
};

export function getRarityMeta(rarity: string | null | undefined): RarityMeta {
  if (!rarity) {
    return RARITY_META_MAP.common;
  }
  const normalized = rarity.toLowerCase().trim() as KnownItemRarity;
  if (normalized in RARITY_META_MAP) {
    return RARITY_META_MAP[normalized];
  }
  return {
    code: normalized,
    labelRu: rarity,
    labelEn: rarity,
    colorHex: '#969CAA',
    weight: 15,
  };
}

export const ITEM_QUALITIES = [
  'standard',
  'inscribed',
  'genuine',
  'auspicious',
  'corrupted',
  'exalted',
  'autographed',
  'unusual',
  'infused',
  'heroic',
  'legacy',
] as const;

export type KnownItemQuality = (typeof ITEM_QUALITIES)[number];

export const QUALITY_LABELS_RU: Record<KnownItemQuality, string> = {
  standard: 'Стандартное',
  inscribed: 'Inscribed (Руны)',
  genuine: 'Genuine (Подлинное)',
  auspicious: 'Auspicious (Благоприятное)',
  corrupted: 'Corrupted (Порочное)',
  exalted: 'Exalted (Превознесённое)',
  autographed: 'Autographed (С автографом)',
  unusual: 'Unusual (Необычное)',
  infused: 'Infused (Насыщенное)',
  heroic: 'Heroic (Героическое)',
  legacy: 'Legacy (Наследие)',
};

export const ITEM_TYPES = [
  'weapon',
  'head',
  'armor',
  'back',
  'shoulder',
  'arms',
  'belt',
  'legs',
  'offhand',
  'mount',
  'courier',
  'ward',
  'bundle',
  'taunt',
  'announcer',
  'hud_skin',
  'emblem',
  'cursor_pack',
  'music',
  'other',
] as const;

export type KnownItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS_RU: Record<KnownItemType, string> = {
  weapon: 'Оружие',
  head: 'Голова',
  armor: 'Броня',
  back: 'Спина',
  shoulder: 'Плечи',
  arms: 'Руки',
  belt: 'Пояс',
  legs: 'Ноги',
  offhand: 'Левая рука',
  mount: 'Ездовое животное',
  courier: 'Курьер',
  ward: 'Вард',
  bundle: 'Набор (Сет)',
  taunt: 'Насмешка',
  announcer: 'Комментатор',
  hud_skin: 'Скин интерфейса',
  emblem: 'Эмблема эффекта',
  cursor_pack: 'Набор курсоров',
  music: 'Музыкальный набор',
  other: 'Аксессуар',
};

export const CASE_CATEGORIES = [
  'popular',
  'new',
  'budget',
  'premium',
  'rarity',
  'themed',
  'event',
] as const;

export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export const CASE_CATEGORY_LABELS_RU: Record<CaseCategory, string> = {
  popular: 'Популярные',
  new: 'Новые',
  budget: 'Бюджетные',
  premium: 'Премиальные',
  rarity: 'По редкости',
  themed: 'По тематике',
  event: 'Событийные',
};

export const TRANSACTION_TYPES = [
  'demo_credit',
  'demo_debit',
  'case_open',
  'upgrader_win',
  'upgrader_loss',
  'daily_bonus',
  'promo_code',
  'refund',
  'adjustment',
  'payment',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS_RU: Record<TransactionType, string> = {
  demo_credit: 'Пополнение демобаланса',
  demo_debit: 'Списание демобаланса',
  case_open: 'Открытие кейса',
  upgrader_win: 'Успешный апгрейд',
  upgrader_loss: 'Неудачный апгрейд',
  daily_bonus: 'Ежедневная награда',
  promo_code: 'Активация промокода',
  refund: 'Возврат средств',
  adjustment: 'Корректировка администратором',
  payment: 'Платежное пополнение',
};

export const BALANCE_TYPES = ['demo', 'real'] as const;
export type BalanceType = (typeof BALANCE_TYPES)[number];

export const TRANSACTION_STATUSES = [
  'pending',
  'completed',
  'failed',
  'cancelled',
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const INVENTORY_ITEM_STATUSES = [
  'available',
  'used_in_upgrader',
  'locked',
] as const;
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number];

export const INVENTORY_SOURCE_TYPES = [
  'case_open',
  'upgrader',
  'promo_code',
  'daily_bonus',
  'admin_grant',
] as const;
export type InventorySourceType = (typeof INVENTORY_SOURCE_TYPES)[number];

export const INVENTORY_SOURCE_LABELS_RU: Record<InventorySourceType, string> = {
  case_open: 'Выпал из кейса',
  upgrader: 'Получен в Upgrader',
  promo_code: 'Бонус по промокоду',
  daily_bonus: 'Ежедневный бонус',
  admin_grant: 'Выдан администратором',
};

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_UPGRADER_CONFIG = {
  MIN_CHANCE_PERCENT: 1,
  MAX_CHANCE_PERCENT: 85,
  HOUSE_EDGE_PERCENT: 5,
} as const;