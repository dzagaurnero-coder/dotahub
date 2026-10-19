import { CURRENCY, DEFAULT_UPGRADER_CONFIG } from './constants';

/**
 * Проверяет, что переданное значение является корректным целым числом копеек.
 */
export function assertValidMinorAmount(amountMinor: number, allowZero = true): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`Сумма должна быть целым числом копеек, получено: ${amountMinor}`);
  }
  if (allowZero ? amountMinor < 0 : amountMinor <= 0) {
    throw new Error(`Недопустимая сумма в копейках: ${amountMinor}`);
  }
}

/**
 * Переводит рубли (число или строку) в целочисленные копейки без ошибок округления float.
 */
export function rubToMinor(rub: number | string): number {
  const normalized = typeof rub === 'string' ? rub.replace(',', '.').trim() : String(rub);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Некорректное значение суммы в рублях: ${rub}`);
  }
  return Math.round(parsed * CURRENCY.MINOR_UNITS_PER_MAJOR);
}

/**
 * Переводит целочисленные копейки в рубли (только для отображения в UI).
 */
export function minorToRub(amountMinor: number): number {
  return amountMinor / CURRENCY.MINOR_UNITS_PER_MAJOR;
}

export interface FormatRubOptions {
  showKopeks?: boolean;
  includeSymbol?: boolean;
}

/**
 * Форматирует сумму в копейках в строку вида "1 250 ₽" или "1 250,50 ₽".
 * Если стоимость отсутствует (null/undefined), возвращает честный статус.
 */
export function formatRub(
  amountMinor: number | null | undefined,
  options: FormatRubOptions = {}
): string {
  if (amountMinor === null || amountMinor === undefined || !Number.isFinite(amountMinor)) {
    return 'Цена не указана';
  }

  const { showKopeks, includeSymbol = true } = options;
  const hasKopeks = amountMinor % CURRENCY.MINOR_UNITS_PER_MAJOR !== 0;
  const shouldShowDecimals = showKopeks ?? hasKopeks;

  const majorValue = amountMinor / CURRENCY.MINOR_UNITS_PER_MAJOR;

  const formattedNumber = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: shouldShowDecimals ? 2 : 0,
    maximumFractionDigits: shouldShowDecimals ? 2 : 0,
  }).format(majorValue);

  return includeSymbol ? `${formattedNumber} ${CURRENCY.SYMBOL}` : formattedNumber;
}

export interface UpgraderCalculationConfig {
  houseEdgePercent?: number;
  minChancePercent?: number;
  maxChancePercent?: number;
}

export interface UpgraderChanceResult {
  isValid: boolean;
  reason?: string;
  chancePercent: number;
  chanceBasisPoints: number; // от 100 (1.00%) до 8500 (85.00%) из 10000
  multiplier: number;
  sourceValueMinor: number;
  targetValueMinor: number;
  houseEdgePercent: number;
}

/**
 * Единая детерминированная формула расчёта вероятности апгрейда.
 * Используется сервером для определения результата и клиентом для честного предпросмотра.
 * Шанс никогда не может быть 100% — ограничен сверху параметром maxChancePercent (по умолчанию 85%).
 */
export function calculateUpgraderChance(
  sourceValueMinor: number,
  targetValueMinor: number,
  config: UpgraderCalculationConfig = {}
): UpgraderChanceResult {
  const houseEdgePercent = config.houseEdgePercent ?? DEFAULT_UPGRADER_CONFIG.HOUSE_EDGE_PERCENT;
  const minChancePercent = config.minChancePercent ?? DEFAULT_UPGRADER_CONFIG.MIN_CHANCE_PERCENT;
  const maxChancePercent = config.maxChancePercent ?? DEFAULT_UPGRADER_CONFIG.MAX_CHANCE_PERCENT;

  if (
    !Number.isSafeInteger(sourceValueMinor) ||
    !Number.isSafeInteger(targetValueMinor) ||
    sourceValueMinor <= 0 ||
    targetValueMinor <= 0
  ) {
    return {
      isValid: false,
      reason: 'Некорректная стоимость исходного или целевого предмета',
      chancePercent: 0,
      chanceBasisPoints: 0,
      multiplier: 0,
      sourceValueMinor,
      targetValueMinor,
      houseEdgePercent,
    };
  }

  if (targetValueMinor <= sourceValueMinor) {
    return {
      isValid: false,
      reason: 'Целевой предмет должен быть дороже исходного предмета',
      chancePercent: 0,
      chanceBasisPoints: 0,
      multiplier: 0,
      sourceValueMinor,
      targetValueMinor,
      houseEdgePercent,
    };
  }

  const rawRatio = sourceValueMinor / targetValueMinor;
  const edgeFactor = Math.max(0, Math.min(1, (100 - houseEdgePercent) / 100));
  const rawPercent = rawRatio * edgeFactor * 100;

  // Округляем до сотых долей процента (basis points: 1% = 100 bp, 100% = 10000 bp)
  const basisPoints = Math.round(rawPercent * 100);
  const minBp = Math.round(minChancePercent * 100);
  const maxBp = Math.round(maxChancePercent * 100);

  if (basisPoints < minBp) {
    return {
      isValid: false,
      reason: `Шанс апгрейда ниже минимально допустимого порога (${minChancePercent}%)`,
      chancePercent: Number((basisPoints / 100).toFixed(2)),
      chanceBasisPoints: basisPoints,
      multiplier: Number((targetValueMinor / sourceValueMinor).toFixed(2)),
      sourceValueMinor,
      targetValueMinor,
      houseEdgePercent,
    };
  }

  const clampedBp = Math.min(maxBp, basisPoints);
  const finalChancePercent = Number((clampedBp / 100).toFixed(2));
  const multiplier = Number((targetValueMinor / sourceValueMinor).toFixed(2));

  return {
    isValid: true,
    chancePercent: finalChancePercent,
    chanceBasisPoints: clampedBp,
    multiplier,
    sourceValueMinor,
    targetValueMinor,
    houseEdgePercent,
  };
}

/**
 * Проверяет, что сумма вероятностей выпадения предметов в кейсе составляет 100%
 * с допустимой погрешностью округления не более 0.05%.
 */
export function validateCaseProbabilities(dropChancesPercent: number[]): {
  isValid: boolean;
  totalPercent: number;
  error?: string;
} {
  if (!Array.isArray(dropChancesPercent) || dropChancesPercent.length === 0) {
    return {
      isValid: false,
      totalPercent: 0,
      error: 'Список предметов кейса не может быть пустым',
    };
  }

  for (const chance of dropChancesPercent) {
    if (!Number.isFinite(chance) || chance <= 0 || chance > 100) {
      return {
        isValid: false,
        totalPercent: 0,
        error: `Недопустимая вероятность выпадения предмета: ${chance}%`,
      };
    }
  }

  const totalBasisPoints = dropChancesPercent.reduce(
    (sum, current) => sum + Math.round(current * 100),
    0
  );
  const totalPercent = Number((totalBasisPoints / 100).toFixed(2));
  const diffBp = Math.abs(totalBasisPoints - 10000);

  if (diffBp > 5) {
    return {
      isValid: false,
      totalPercent,
      error: `Сумма вероятностей должна составлять 100% (сейчас: ${totalPercent}%)`,
    };
  }

  return {
    isValid: true,
    totalPercent,
  };
}