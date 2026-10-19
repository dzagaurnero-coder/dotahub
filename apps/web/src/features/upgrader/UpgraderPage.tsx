import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Backpack,
  CheckCircle2,
  Flame,
  History,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  calculateUpgraderChance,
  getRarityMeta,
  UPGRADER_CONSTRAINTS,
  type DotaItemDto,
  type InventoryItemDto,
  type UpgraderAttemptResultDto,
} from '@dotahub/shared';
import { api, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { UpgraderWheel } from '@/features/upgrader/UpgraderWheel';
import { ItemCard } from '@/components/cards/ItemCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  cn,
  formatDateTimeRu,
  formatRub,
  generateIdempotencyKey,
} from '@/lib/formatters';

const MULTIPLIER_PRESETS = [1.5, 2, 5, 10] as const;

export const UpgraderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const preselectedInventoryId = searchParams.get('source');

  const [selectedSource, setSelectedSource] = useState<InventoryItemDto | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<DotaItemDto | null>(null);
  const [targetSearch, setTargetSearch] = useState('');
  const [activeMultiplierPreset, setActiveMultiplierPreset] = useState<number | null>(null);

  const [fastMode, setFastMode] = useState(false);
  const [showFairness, setShowFairness] = useState(false);
  const [clientSeed, setClientSeed] = useState(() =>
    Math.random().toString(36).slice(2, 14)
  );

  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<UpgraderAttemptResultDto | null>(null);
  const [lastOutcome, setLastOutcome] = useState<'won' | 'lost' | null>(null);
  const [lastRollBasisPoints, setLastRollBasisPoints] = useState<number | null>(null);

  // 1. Загружаем доступные предметы инвентаря пользователя
  const { data: inventoryData, isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory', 'upgrader-available'],
    queryFn: () =>
      api.inventory.list({
        status: 'available',
        sort: 'price_desc',
        page: 1,
        pageSize: 48,
      }),
    enabled: isAuthenticated,
  });

  const availableInventory = useMemo(() => {
    const items = inventoryData?.items ?? [];
    return items.filter(
      (inv) =>
        inv.status === 'available' &&
        inv.item.estimated_value_minor !== null &&
        inv.item.estimated_value_minor > 0
    );
  }, [inventoryData]);

  // Автоматический выбор предмета из URL (?source=...)
  useEffect(() => {
    if (!preselectedInventoryId || availableInventory.length === 0) return;
    const found = availableInventory.find((inv) => inv.id === preselectedInventoryId);
    if (found) {
      setSelectedSource(found);
    }
  }, [preselectedInventoryId, availableInventory]);

  // 2. Загружаем каталог потенциальных целевых предметов
  const minTargetPriceMinor = useMemo(() => {
    const sourceVal = selectedSource?.item.estimated_value_minor ?? 0;
    if (sourceVal <= 0) return 1000;
    return Math.ceil(sourceVal * UPGRADER_CONSTRAINTS.MIN_TARGET_MULTIPLIER);
  }, [selectedSource]);

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['items', 'upgrader-targets', minTargetPriceMinor, targetSearch],
    queryFn: () =>
      api.items.list({
        minPriceMinor: minTargetPriceMinor,
        search: targetSearch.trim() || undefined,
        sort: 'price_asc',
        page: 1,
        pageSize: 48,
      }),
  });

  const targetCandidates = useMemo(() => {
    const list = catalogData?.items ?? [];
    return list.filter(
      (it) => it.estimated_value_minor !== null && it.estimated_value_minor >= minTargetPriceMinor
    );
  }, [catalogData, minTargetPriceMinor]);

  // 3. Загружаем историю попыток апгрейда
  const { data: historyData } = useQuery({
    queryKey: ['upgrader', 'history'],
    queryFn: () => api.upgrader.history(),
    enabled: isAuthenticated,
  });

  // Расчёт вероятности и множителя для выбранной пары предметов
  const calculation = useMemo(() => {
    const sourceVal = selectedSource?.item.estimated_value_minor ?? 0;
    const targetVal = selectedTarget?.estimated_value_minor ?? 0;
    if (sourceVal <= 0 || targetVal <= 0) {
      return null;
    }
    return calculateUpgraderChance(sourceVal, targetVal);
  }, [selectedSource, selectedTarget]);

  // Выбор целевого предмета по кнопке множителя (x1.5, x2, x5, x10)
  const handleSelectMultiplierPreset = (mult: number) => {
    setActiveMultiplierPreset(mult);
    const sourceVal = selectedSource?.item.estimated_value_minor ?? 0;
    if (sourceVal <= 0 || targetCandidates.length === 0) return;

    const desiredValue = sourceVal * mult;
    let closestItem: DotaItemDto | null = null;
    let smallestDiff = Number.POSITIVE_INFINITY;

    for (const candidate of targetCandidates) {
      const val = candidate.estimated_value_minor ?? 0;
      if (val < minTargetPriceMinor) continue;
      const diff = Math.abs(val - desiredValue);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestItem = candidate;
      }
    }

    if (closestItem) {
      setSelectedTarget(closestItem);
      setLastOutcome(null);
      setLastRollBasisPoints(null);
    }
  };

  // Мутация запуска апгрейда на сервере
  const attemptMutation = useMutation({
    mutationFn: () => {
      if (!selectedSource || !selectedTarget) {
        throw new Error('Выберите исходный и целевой предметы');
      }
      return api.upgrader.attempt({
        inventoryItemId: selectedSource.id,
        targetItemId: selectedTarget.id,
        idempotencyKey: generateIdempotencyKey('upgrader'),
        clientSeed: clientSeed.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      const attempt = res.result;
      setLastRollBasisPoints(attempt.provably_fair.roll_basis_points);

      if (fastMode) {
        setIsSpinning(false);
        setPendingAttempt(null);
        finalizeAttemptUI(attempt);
      } else {
        setLastOutcome(null);
        setPendingAttempt(attempt);
        setIsSpinning(true);
      }
    },
    onError: (err: unknown) => {
      setIsSpinning(false);
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось выполнить попытку апгрейда.';
      toast.error('Ошибка Upgrader', message);
    },
  });

  const finalizeAttemptUI = (attempt: UpgraderAttemptResultDto) => {
    const isWon = attempt.status === 'won';
    setLastOutcome(isWon ? 'won' : 'lost');

    if (isWon) {
      toast.success(
        'Апгрейд успешен!',
        `Вы получили ${attempt.target_item.localized_name} (${formatRub(attempt.target_item.estimated_value_minor)})!`
      );
    } else {
      toast.warning(
        'Апгрейд не удался',
        `Выпало число ${(attempt.provably_fair.roll_basis_points / 100).toFixed(2)}% при шансе ${attempt.chance_percent.toFixed(2)}%.`
      );
    }

    setSelectedSource(null);
    if (preselectedInventoryId) {
      searchParams.delete('source');
      setSearchParams(searchParams, { replace: true });
    }

    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['upgrader', 'history'] });
    void queryClient.invalidateQueries({ queryKey: ['balance'] });
  };

  const handleWheelSpinComplete = () => {
    setIsSpinning(false);
    if (pendingAttempt) {
      const completed = pendingAttempt;
      setPendingAttempt(null);
      finalizeAttemptUI(completed);
    }
  };

  const canRunUpgrade =
    Boolean(selectedSource) &&
    Boolean(selectedTarget) &&
    Boolean(calculation?.isValid) &&
    !isSpinning &&
    !attemptMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Шапка страницы Upgrader */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 md:flex-row md:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Flame className="h-4 w-4" />
            Интерактивное улучшение предметов
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Апгрейдер предметов Dota 2
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-dh-textMuted sm:text-sm">
            Выберите предмет из своего виртуального инвентаря и желаемый предмет из каталога.
            Допустимый диапазон шанса: от {UPGRADER_CONSTRAINTS.MIN_CHANCE_PERCENT}% до{' '}
            {UPGRADER_CONSTRAINTS.MAX_CHANCE_PERCENT}%.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isSpinning}
            onClick={() => setFastMode((prev) => !prev)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-dh border px-3.5 text-xs font-semibold transition-colors',
              fastMode
                ? 'border-dh-indigo bg-dh-indigo/15 text-dh-indigo'
                : 'border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
            )}
          >
            <Zap className="h-4 w-4" />
            <span>Быстрый режим: {fastMode ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFairness((prev) => !prev)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-dh border px-3.5 text-xs font-semibold transition-colors',
              showFairness
                ? 'border-dh-lime bg-dh-surfaceElevated text-dh-lime'
                : 'border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
            )}
          >
            <ShieldCheck className="h-4 w-4 text-dh-lime" />
            <span>Provably Fair</span>
          </button>
        </div>
      </div>

      {/* Панель настройки Client Seed */}
      {showFairness && (
        <div className="rounded-dh-lg border border-dh-lime/30 bg-dh-surface p-5 shadow-dh-card space-y-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-dh-text">
                Настройка клиентского сида (HMAC-SHA256)
              </h2>
              <p className="text-xs text-dh-textMuted">
                Сервер вычисляет результат попытки в закрытой транзакции БД до запуска анимации
                колеса.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientSeed(Math.random().toString(36).slice(2, 14))}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Сменить сид
            </Button>
          </div>
          <div className="max-w-md">
            <Input
              label="Client Seed"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              maxLength={64}
            />
          </div>
        </div>
      )}

      {/* Верхняя арена Upgrader: Ваш предмет — Колесо — Целевой предмет */}
      <section className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Левый слот: Исходный предмет из инвентаря */}
        <div className="flex flex-col justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card lg:col-span-4 min-h-[340px]">
          <div className="flex items-center justify-between border-b border-dh-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-dh-textMuted">
              1. Ваш предмет
            </span>
            {selectedSource && (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  setSelectedSource(null);
                  setLastOutcome(null);
                }}
                className="text-xs font-semibold text-dh-danger hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

          {selectedSource ? (
            <div className="my-auto flex flex-col items-center py-6 text-center">
              <Badge variant="rarity" rarityCode={selectedSource.item.rarity} dot>
                {getRarityMeta(selectedSource.item.rarity).labelRu}
              </Badge>
              <SafeImage
                src={selectedSource.item.image_url}
                alt={selectedSource.item.localized_name}
                className="my-4 h-28 w-40 object-contain drop-shadow-md"
              />
              <h3 className="font-display text-base font-bold text-dh-text">
                {selectedSource.item.localized_name}
              </h3>
              <p className="text-xs text-dh-textMuted">
                {selectedSource.item.hero_name || 'Универсальный предмет'}
              </p>
              <div className="mt-3 rounded-lg border border-dh-border bg-dh-bgSecondary px-3.5 py-1.5 font-mono text-sm font-bold text-dh-lime">
                {formatRub(selectedSource.item.estimated_value_minor)}
              </div>
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-dh-surfaceElevated text-dh-textMuted">
                <Backpack className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-dh-text">Предмет не выбран</p>
              <p className="mt-1 max-w-xs text-xs text-dh-textMuted">
                Выберите доступный предмет из вашего инвентаря в списке ниже
              </p>
            </div>
          )}

          <div className="border-t border-dh-border pt-3 text-xs text-dh-textMuted flex items-center justify-between">
            <span>Статус слота:</span>
            <span className="font-semibold text-dh-text">
              {selectedSource ? 'Готов к улучшению' : 'Ожидание выбора'}
            </span>
          </div>
        </div>

        {/* Центральный слот: Колесо вероятности и кнопка запуска */}
        <div className="flex flex-col items-center justify-center rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card lg:col-span-4">
          <UpgraderWheel
            chancePercent={calculation?.chancePercent ?? 0}
            multiplier={calculation?.multiplier ?? null}
            isSpinning={isSpinning}
            rollBasisPoints={lastRollBasisPoints}
            lastOutcome={lastOutcome}
            onSpinComplete={handleWheelSpinComplete}
          />

          {/* Быстрые кнопки множителя */}
          <div className="mt-2 grid w-full grid-cols-4 gap-2">
            {MULTIPLIER_PRESETS.map((mult) => (
              <button
                key={mult}
                type="button"
                disabled={!selectedSource || isSpinning}
                onClick={() => handleSelectMultiplierPreset(mult)}
                className={cn(
                  'rounded-lg border py-2 font-mono text-xs font-bold transition-colors disabled:opacity-40',
                  activeMultiplierPreset === mult
                    ? 'border-dh-lime bg-dh-lime text-dh-bg'
                    : 'border-dh-border bg-dh-bgSecondary text-dh-text hover:border-dh-lime/50'
                )}
              >
                x{mult}
              </button>
            ))}
          </div>

          {calculation && !calculation.isValid && (
            <p className="mt-3 text-center text-xs font-medium text-dh-danger">
              {calculation.reasonRu}
            </p>
          )}

          <div className="mt-4 w-full">
            {!isAuthenticated ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => openAuthModal('login')}
                leftIcon={<Lock className="h-4 w-4" />}
              >
                Войти для запуска Upgrader
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canRunUpgrade}
                isLoading={attemptMutation.isPending || isSpinning}
                onClick={() => attemptMutation.mutate()}
                leftIcon={<Flame className="h-5 w-5" />}
              >
                {isSpinning
                  ? 'Вращаем колесо...'
                  : calculation?.isValid
                    ? `Улучшить (${calculation.chancePercent.toFixed(2)}%)`
                    : 'Выберите предметы'}
              </Button>
            )}
          </div>
        </div>

        {/* Правый слот: Желаемый целевой предмет */}
        <div className="flex flex-col justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card lg:col-span-4 min-h-[340px]">
          <div className="flex items-center justify-between border-b border-dh-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-dh-textMuted">
              2. Желаемый предмет
            </span>
            {selectedTarget && (
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  setSelectedTarget(null);
                  setActiveMultiplierPreset(null);
                  setLastOutcome(null);
                }}
                className="text-xs font-semibold text-dh-danger hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

          {selectedTarget ? (
            <div className="my-auto flex flex-col items-center py-6 text-center">
              <Badge variant="rarity" rarityCode={selectedTarget.rarity} dot>
                {getRarityMeta(selectedTarget.rarity).labelRu}
              </Badge>
              <SafeImage
                src={selectedTarget.image_url}
                alt={selectedTarget.localized_name}
                className="my-4 h-28 w-40 object-contain drop-shadow-md"
              />
              <h3 className="font-display text-base font-bold text-dh-text">
                {selectedTarget.localized_name}
              </h3>
              <p className="text-xs text-dh-textMuted">
                {selectedTarget.hero_name || 'Универсальный предмет'}
              </p>
              <div className="mt-3 rounded-lg border border-dh-indigo/40 bg-dh-indigo/10 px-3.5 py-1.5 font-mono text-sm font-bold text-dh-indigo">
                {formatRub(selectedTarget.estimated_value_minor)}
              </div>
            </div>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-dh-surfaceElevated text-dh-indigo">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-dh-text">Цель не выбрана</p>
              <p className="mt-1 max-w-xs text-xs text-dh-textMuted">
                Выберите целевой предмет дороже исходного в правой колонке ниже или нажмите кнопку
                множителя
              </p>
            </div>
          )}

          <div className="border-t border-dh-border pt-3 text-xs text-dh-textMuted flex items-center justify-between">
            <span>Мин. стоимость цели:</span>
            <span className="font-mono font-semibold text-dh-text">
              {selectedSource ? formatRub(minTargetPriceMinor) : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Нижние колонки выбора предметов: Инвентарь слева и Каталог целей справа */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Левая колонка: Доступные предметы инвентаря */}
        <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card space-y-4">
          <div className="flex items-center justify-between border-b border-dh-border pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-dh-text">
                Ваши предметы для апгрейда
              </h2>
              <p className="text-xs text-dh-textMuted">
                Отображаются только доступные предметы со статусом «В наличии»
              </p>
            </div>
            <Badge variant="neutral">{availableInventory.length} шт.</Badge>
          </div>

          {!isAuthenticated ? (
            <EmptyState
              icon={<Lock className="h-8 w-8 text-dh-indigo" />}
              title="Авторизуйтесь для просмотра инвентаря"
              description="Войдите в свой аккаунт, чтобы использовать выбитые из кейсов предметы в Upgrader."
              action={
                <Button variant="primary" size="sm" onClick={() => openAuthModal('login')}>
                  Войти в аккаунт
                </Button>
              }
            />
          ) : isInventoryLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : availableInventory.length === 0 ? (
            <EmptyState
              title="В вашем инвентаре пока нет доступных предметов"
              description="Откройте любой виртуальный кейс, чтобы получить предметы для апгрейда."
              action={
                <Link to="/cases">
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Открыть кейсы
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
              {availableInventory.map((inv) => (
                <ItemCard
                  key={inv.id}
                  item={inv.item}
                  compact
                  isSelected={selectedSource?.id === inv.id}
                  onSelect={() => {
                    if (isSpinning) return;
                    setSelectedSource(inv);
                    setLastOutcome(null);
                    setLastRollBasisPoints(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Правая колонка: Каталог целевых предметов */}
        <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card space-y-4">
          <div className="flex flex-col justify-between gap-3 border-b border-dh-border pb-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-base font-bold text-dh-text">
                Выбор целевого предмета
              </h2>
              <p className="text-xs text-dh-textMuted">
                Предметы из каталога стоимостью от {formatRub(minTargetPriceMinor)}
              </p>
            </div>
            <div className="w-full sm:w-56">
              <Input
                placeholder="Поиск цели..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          {isCatalogLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : targetCandidates.length === 0 ? (
            <EmptyState
              title="Подходящие целевые предметы не найдены"
              description="Попробуйте изменить поисковый запрос или выбрать другой исходный предмет."
            />
          ) : (
            <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
              {targetCandidates.map((targetItem) => (
                <ItemCard
                  key={targetItem.id}
                  item={targetItem}
                  compact
                  isSelected={selectedTarget?.id === targetItem.id}
                  onSelect={() => {
                    if (isSpinning) return;
                    setSelectedTarget(targetItem);
                    setActiveMultiplierPreset(null);
                    setLastOutcome(null);
                    setLastRollBasisPoints(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* История последних апгрейдов пользователя */}
      {isAuthenticated && historyData?.attempts && historyData.attempts.length > 0 && (
        <section className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-4">
          <div className="flex items-center gap-2 border-b border-dh-border pb-3">
            <History className="h-4 w-4 text-dh-lime" />
            <h2 className="font-display text-base font-bold text-dh-text">
              История ваших попыток в Upgrader
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {historyData.attempts.slice(0, 6).map((attempt) => {
              const isWon = attempt.status === 'won';
              return (
                <div
                  key={attempt.attempt_id}
                  className="flex flex-col justify-between rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs font-bold',
                        isWon ? 'text-dh-success' : 'text-dh-danger'
                      )}
                    >
                      {isWon ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {isWon ? 'Успех' : 'Неудача'} ({attempt.chance_percent.toFixed(2)}%)
                    </span>
                    <span className="text-[10px] text-dh-textMuted">
                      {formatDateTimeRu(attempt.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1 truncate text-dh-textMuted">
                      {attempt.source_item.localized_name}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-dh-lime" />
                    <div className="min-w-0 flex-1 truncate text-right font-semibold text-dh-text">
                      {attempt.target_item.localized_name}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-dh-border/70 pt-2 font-mono text-[11px] text-dh-textMuted">
                    <span>x{attempt.multiplier.toFixed(2)}</span>
                    <span>
                      Roll: {(attempt.provably_fair.roll_basis_points / 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};