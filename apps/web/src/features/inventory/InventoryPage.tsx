import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Backpack,
  Box,
  ChevronLeft,
  ChevronRight,
  Coins,
  Flame,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  getRarityMeta,
  type InventoryItemStatus,
  type InventoryQueryInput,
} from '@dotahub/shared';
import { api, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  cn,
  formatDateTimeRu,
  formatRub,
  generateIdempotencyKey,
} from '@/lib/formatters';

type StatusFilter = 'all' | InventoryItemStatus;

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'available', label: 'В наличии' },
  { id: 'all', label: 'Все предметы' },
  { id: 'upgraded', label: 'Улучшены' },
  { id: 'consumed', label: 'Использованы в Upgrader' },
  { id: 'sold', label: 'Проданы' },
];

const STATUS_BADGE_META: Record<
  InventoryItemStatus,
  { label: string; variant: 'success' | 'indigo' | 'neutral' | 'danger' }
> = {
  available: { label: 'В наличии', variant: 'success' },
  upgraded: { label: 'Получен в Upgrader', variant: 'indigo' },
  consumed: { label: 'Списан в Upgrader', variant: 'danger' },
  sold: { label: 'Продан', variant: 'neutral' },
};

const SOURCE_LABELS_RU: Record<string, string> = {
  case_open: 'Открытие кейса',
  upgrader_win: 'Победа в Upgrader',
  promo_bonus: 'Промо-награда',
  admin_grant: 'Начисление системы',
};

const RARITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Все редкости' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythical', label: 'Mythical' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'ancient', label: 'Ancient' },
  { value: 'immortal', label: 'Immortal' },
  { value: 'arcana', label: 'Arcana' },
];

const SORT_OPTIONS: Array<{
  value: NonNullable<InventoryQueryInput['sort']>;
  label: string;
}> = [
  { value: 'acquired_desc', label: 'Сначала новые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
  { value: 'price_asc', label: 'Сначала доступные' },
];

const PAGE_SIZE = 18;

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { syncDemoBalance } = useAuth();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('available');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [sortBy, setSortBy] =
    useState<NonNullable<InventoryQueryInput['sort']>>('acquired_desc');
  const [page, setPage] = useState<number>(1);
  const [sellingId, setSellingId] = useState<string | null>(null);

  const queryParams = useMemo<Partial<InventoryQueryInput>>(() => {
    const params: Partial<InventoryQueryInput> = {
      page,
      pageSize: PAGE_SIZE,
      sort: sortBy,
    };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    if (rarityFilter !== 'all') {
      params.rarity = rarityFilter as InventoryQueryInput['rarity'];
    }
    return params;
  }, [page, sortBy, statusFilter, rarityFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'list', queryParams],
    queryFn: () => api.inventory.list(queryParams),
  });

  const sellMutation = useMutation({
    mutationFn: (inventoryItemId: string) => {
      setSellingId(inventoryItemId);
      return api.inventory.sell(
        inventoryItemId,
        generateIdempotencyKey('sell_item')
      );
    },
    onSuccess: (res) => {
      syncDemoBalance(res.updatedDemoBalanceMinor);
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(
        'Предмет продан',
        `На ваш демобаланс зачислено ${formatRub(res.creditedAmountMinor)}.`
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось продать предмет.';
      toast.error('Ошибка продажи', message);
    },
    onSettled: () => {
      setSellingId(null);
    },
  });

  const items = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const totalAvailableCount = data?.summary?.totalAvailableCount ?? 0;
  const totalAvailableValueMinor = data?.summary?.totalAvailableValueMinor ?? 0;

  const handleResetFilters = () => {
    setStatusFilter('available');
    setRarityFilter('all');
    setSortBy('acquired_desc');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка и сводная статистика инвентаря */}
      <div className="flex flex-col justify-between gap-6 border-b border-dh-border pb-6 lg:flex-row lg:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Backpack className="h-4 w-4" />
            Личная коллекция
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Мой виртуальный инвентарь
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Управляйте предметами, полученными из кейсов и в модуле Upgrader: улучшайте их или
            обменивайте на виртуальный баланс.
          </p>
        </div>

        {/* Карточки сводки */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <div className="rounded-dh border border-dh-border bg-dh-surface px-4 py-2.5">
            <span className="block text-[11px] text-dh-textMuted">
              Доступно предметов
            </span>
            <span className="font-mono text-base font-extrabold text-dh-text">
              {totalAvailableCount} шт.
            </span>
          </div>

          <div className="rounded-dh border border-dh-border bg-dh-surface px-4 py-2.5">
            <span className="block text-[11px] text-dh-textMuted">
              Стоимость доступных
            </span>
            <span className="font-mono text-base font-extrabold text-dh-lime">
              {formatRub(totalAvailableValueMinor)}
            </span>
          </div>

          <Link to="/upgrader" className="col-span-2 sm:col-span-1">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Flame className="h-4 w-4" />}
            >
              В Апгрейдер
            </Button>
          </Link>
        </div>
      </div>

      {/* Панель фильтрации и сортировки */}
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Вкладки статусов */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                  statusFilter === tab.id
                    ? 'bg-dh-lime text-dh-bg'
                    : 'border border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Сбросить
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-dh-border pt-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-3">
            <Select
              label="Фильтр по редкости"
              value={rarityFilter}
              onChange={(e) => {
                setRarityFilter(e.target.value);
                setPage(1);
              }}
              options={RARITY_OPTIONS}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Сортировка"
              value={sortBy}
              onChange={(e) => {
                setSortBy(
                  e.target.value as NonNullable<InventoryQueryInput['sort']>
                );
                setPage(1);
              }}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Сетка предметов инвентаря */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-64" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Не удалось загрузить инвентарь"
          description="Проверьте подключение к серверу и обновите страницу."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Backpack className="h-10 w-10 text-dh-textMuted" />}
          title={
            statusFilter === 'available'
              ? 'У вас пока нет доступных предметов в инвентаре'
              : 'По выбранному фильтру предметы не найдены'
          }
          description="Откройте любой виртуальный кейс Dota 2, чтобы выбитые предметы появились в вашей коллекции."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/cases">
                <Button
                  variant="primary"
                  leftIcon={<Box className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Перейти к кейсам
                </Button>
              </Link>
              {statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setRarityFilter('all');
                  }}
                >
                  Показать всю историю предметов
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry) => {
              const rarityMeta = getRarityMeta(entry.item.rarity);
              const statusMeta =
                STATUS_BADGE_META[entry.status] ?? STATUS_BADGE_META.available;
              const isAvailable = entry.status === 'available';
              const sellValueMinor = entry.item.estimated_value_minor ?? 0;

              return (
                <div
                  key={entry.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card transition-colors hover:border-dh-textMuted/40"
                >
                  <div
                    className="inset-x-0 top-0 h-1 w-full absolute"
                    style={{ backgroundColor: rarityMeta.colorHex }}
                  />

                  <div className="space-y-4">
                    {/* Верхняя строка: редкость и статус */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="rarity" rarityCode={entry.item.rarity} dot>
                        {rarityMeta.labelRu}
                      </Badge>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>

                    {/* Изображение и название предмета */}
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/items/${entry.item.slug}`}
                        className="flex h-20 w-24 shrink-0 items-center justify-center rounded-dh border border-dh-border bg-dh-bgSecondary p-2"
                      >
                        <SafeImage
                          src={entry.item.image_url}
                          alt={entry.item.localized_name}
                          className="h-16 w-20 object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                      </Link>

                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          to={`/items/${entry.item.slug}`}
                          className="block truncate font-display text-sm font-bold text-dh-text hover:text-dh-lime transition-colors"
                        >
                          {entry.item.localized_name}
                        </Link>
                        <p className="truncate text-xs text-dh-textMuted">
                          {entry.item.hero_name || 'Общий предмет'}
                        </p>
                        <p className="font-mono text-sm font-extrabold text-dh-lime">
                          {formatRub(entry.item.estimated_value_minor)}
                        </p>
                      </div>
                    </div>

                    {/* Метаданные получения */}
                    <div className="flex items-center justify-between rounded-lg bg-dh-bgSecondary px-3 py-2 text-[11px] text-dh-textMuted">
                      <span>
                        Источник:{' '}
                        <strong className="font-medium text-dh-text">
                          {SOURCE_LABELS_RU[entry.acquired_source] ??
                            entry.acquired_source}
                        </strong>
                      </span>
                      <span>{formatDateTimeRu(entry.acquired_at)}</span>
                    </div>
                  </div>

                  {/* Действия для доступного предмета */}
                  {isAvailable ? (
                    <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-dh-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          sellValueMinor <= 0 || sellMutation.isPending
                        }
                        isLoading={sellingId === entry.id}
                        onClick={() => sellMutation.mutate(entry.id)}
                        leftIcon={<Coins className="h-3.5 w-3.5 text-dh-lime" />}
                      >
                        Продать ({formatRub(sellValueMinor)})
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={sellMutation.isPending}
                        onClick={() =>
                          navigate(
                            `/upgrader?source=${encodeURIComponent(entry.id)}`
                          )
                        }
                        leftIcon={<Flame className="h-3.5 w-3.5" />}
                      >
                        В Апгрейдер
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-dh-border pt-3 flex items-center justify-between text-xs text-dh-textMuted">
                      <span>Предмет больше не активен</span>
                      <Link
                        to={`/items/${entry.item.slug}`}
                        className="font-semibold text-dh-indigo hover:underline"
                      >
                        Карточка в каталоге →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Постраничная навигация */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-dh-border pt-6 sm:flex-row">
              <p className="text-xs text-dh-textMuted">
                Показана страница{' '}
                <span className="font-mono font-bold text-dh-text">{page}</span> из{' '}
                <span className="font-mono font-bold text-dh-text">
                  {totalPages}
                </span>{' '}
                (всего записей: {totalItems})
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Назад
                </Button>
                <span className="rounded-lg border border-dh-border bg-dh-surface px-3.5 py-1.5 font-mono text-xs font-bold text-dh-lime">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};