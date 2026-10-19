import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  getRarityMeta,
  ITEM_TYPE_LABELS_RU,
  rubToMinorUnits,
  type ItemsCatalogQueryInput,
  type KnownItemType,
} from '@dotahub/shared';
import { api } from '@/lib/api-client';
import { ItemCard } from '@/components/cards/ItemCard';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/formatters';

const RARITY_CODES = [
  'common',
  'uncommon',
  'rare',
  'mythical',
  'legendary',
  'ancient',
  'immortal',
  'arcana',
] as const;

const QUALITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Все качества' },
  { value: 'standard', label: 'Standard (Стандартное)' },
  { value: 'inscribed', label: 'Inscribed (Руны статистики)' },
  { value: 'exalted', label: 'Exalted (Возвышенное)' },
  { value: 'corrupted', label: 'Corrupted (Искажённое)' },
  { value: 'autographed', label: 'Autographed (С автографом)' },
  { value: 'infused', label: 'Infused (Насыщенное)' },
  { value: 'genuine', label: 'Genuine (Подлинное)' },
  { value: 'auspicious', label: 'Auspicious (Благоприятное)' },
  { value: 'unusual', label: 'Unusual (Необычное)' },
];

const SORT_OPTIONS: Array<{
  value: NonNullable<ItemsCatalogQueryInput['sort']>;
  label: string;
}> = [
  { value: 'price_desc', label: 'Сначала дорогие' },
  { value: 'price_asc', label: 'Сначала доступные' },
  { value: 'rarity_desc', label: 'По редкости (Arcana → Common)' },
  { value: 'name_asc', label: 'По названию (А–Я)' },
];

const PAGE_SIZE = 24;

export const ItemsCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || '';
  const urlHero = searchParams.get('hero') || 'all';
  const urlRarity = searchParams.get('rarity') || 'all';
  const urlQuality = searchParams.get('quality') || 'all';
  const urlItemType = searchParams.get('type') || 'all';
  const urlSort =
    (searchParams.get('sort') as ItemsCatalogQueryInput['sort'] | null) || 'price_desc';
  const urlPage = Math.max(1, Number(searchParams.get('page') || '1') || 1);

  const [searchText, setSearchText] = useState(urlSearch);
  const [selectedHero, setSelectedHero] = useState(urlHero);
  const [selectedRarity, setSelectedRarity] = useState(urlRarity);
  const [selectedQuality, setSelectedQuality] = useState(urlQuality);
  const [selectedType, setSelectedType] = useState(urlItemType);
  const [sortBy, setSortBy] = useState<NonNullable<ItemsCatalogQueryInput['sort']>>(urlSort);
  const [minPriceRub, setMinPriceRub] = useState('');
  const [maxPriceRub, setMaxPriceRub] = useState('');
  const [page, setPage] = useState(urlPage);

  // Синхронизация при поиске из глобального Header
  useEffect(() => {
    setSearchText(urlSearch);
    setPage(1);
  }, [urlSearch]);

  const slotOptions = useMemo<SelectOption[]>(() => {
    const entries = Object.entries(ITEM_TYPE_LABELS_RU) as Array<[KnownItemType, string]>;
    return [
      { value: 'all', label: 'Все слоты и типы' },
      ...entries.map(([value, label]) => ({ value, label })),
    ];
  }, []);

  const queryInput = useMemo<Partial<ItemsCatalogQueryInput>>(() => {
    const params: Partial<ItemsCatalogQueryInput> = {
      page,
      pageSize: PAGE_SIZE,
      sort: sortBy,
    };

    if (searchText.trim()) {
      params.search = searchText.trim();
    }
    if (selectedHero !== 'all') {
      params.heroSlug = selectedHero;
    }
    if (selectedRarity !== 'all') {
      params.rarity = selectedRarity as ItemsCatalogQueryInput['rarity'];
    }
    if (selectedQuality !== 'all') {
      params.quality = selectedQuality as ItemsCatalogQueryInput['quality'];
    }
    if (selectedType !== 'all') {
      params.itemType = selectedType;
    }

    const minVal = Number(minPriceRub);
    if (!Number.isNaN(minVal) && minVal > 0) {
      params.minPriceMinor = rubToMinorUnits(minVal);
    }

    const maxVal = Number(maxPriceRub);
    if (!Number.isNaN(maxVal) && maxVal > 0) {
      params.maxPriceMinor = rubToMinorUnits(maxVal);
    }

    return params;
  }, [
    page,
    sortBy,
    searchText,
    selectedHero,
    selectedRarity,
    selectedQuality,
    selectedType,
    minPriceRub,
    maxPriceRub,
  ]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['items', 'catalog', queryInput],
    queryFn: () => api.items.list(queryInput),
  });

  const heroesOptions = useMemo<SelectOption[]>(() => {
    const heroes = data?.heroes ?? [];
    return [
      { value: 'all', label: 'Все герои Dota 2' },
      ...heroes.map((h) => ({
        value: h.slug,
        label: h.localized_name,
      })),
    ];
  }, [data?.heroes]);

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (!val || val === 'all') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedHero('all');
    setSelectedRarity('all');
    setSelectedQuality('all');
    setSelectedType('all');
    setSortBy('price_desc');
    setMinPriceRub('');
    setMaxPriceRub('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const itemsList = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Заголовок каталога предметов */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Sparkles className="h-4 w-4" />
            База данных косметики
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Каталог предметов Dota 2
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Структурированный справочник внутриигровых предметов с фильтрацией по героям,
            редкостям, качествам и слотам.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="font-mono">
            Всего предметов: {totalItems}
          </Badge>
        </div>
      </div>

      {/* Панель фильтрации */}
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card space-y-5">
        {/* Быстрый фильтр по редкостям Dota 2 */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-dh-textMuted">
            Фильтр по редкости предмета
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRarity('all');
                setPage(1);
                updateUrlParams({ rarity: null, page: '1' });
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                selectedRarity === 'all'
                  ? 'bg-dh-lime text-dh-bg'
                  : 'border border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
              )}
            >
              Все редкости
            </button>

            {RARITY_CODES.map((code) => {
              const meta = getRarityMeta(code);
              const isSelected = selectedRarity === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    const nextVal = isSelected ? 'all' : code;
                    setSelectedRarity(nextVal);
                    setPage(1);
                    updateUrlParams({ rarity: nextVal, page: '1' });
                  }}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${meta.colorHex}25`,
                          borderColor: meta.colorHex,
                          color: meta.colorHex,
                        }
                      : undefined
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    !isSelected &&
                      'border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.colorHex }}
                  />
                  <span>{meta.labelRu}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Основная сетка контролов фильтрации */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="lg:col-span-4">
            <Input
              label="Поиск по названию или герою"
              placeholder="Dragonclaw Hook, Manifold Paradox, Pudge..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Герой Dota 2"
              value={selectedHero}
              onChange={(e) => {
                setSelectedHero(e.target.value);
                setPage(1);
                updateUrlParams({ hero: e.target.value, page: '1' });
              }}
              options={heroesOptions}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Слот / тип предмета"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
                updateUrlParams({ type: e.target.value, page: '1' });
              }}
              options={slotOptions}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Качество"
              value={selectedQuality}
              onChange={(e) => {
                setSelectedQuality(e.target.value);
                setPage(1);
                updateUrlParams({ quality: e.target.value, page: '1' });
              }}
              options={QUALITY_OPTIONS}
            />
          </div>
        </div>

        {/* Нижний ряд фильтров: Цена, Сортировка и Сброс */}
        <div className="grid grid-cols-1 gap-4 border-t border-dh-border pt-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="grid grid-cols-2 gap-2.5 lg:col-span-4">
            <Input
              label="Цена от (₽)"
              type="number"
              min="0"
              placeholder="0"
              value={minPriceRub}
              onChange={(e) => {
                setMinPriceRub(e.target.value);
                setPage(1);
              }}
            />
            <Input
              label="Цена до (₽)"
              type="number"
              min="0"
              placeholder="50000"
              value={maxPriceRub}
              onChange={(e) => {
                setMaxPriceRub(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="lg:col-span-4">
            <Select
              label="Сортировка каталога"
              value={sortBy}
              onChange={(e) => {
                const nextSort = e.target.value as NonNullable<ItemsCatalogQueryInput['sort']>;
                setSortBy(nextSort);
                setPage(1);
                updateUrlParams({ sort: nextSort, page: '1' });
              }}
              options={SORT_OPTIONS}
            />
          </div>

          <div className="flex justify-end lg:col-span-4">
            <Button
              variant="outline"
              size="md"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Сбросить все фильтры
            </Button>
          </div>
        </div>
      </div>

      {/* Сетка карточек предметов */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Не удалось загрузить каталог предметов"
          description="Проверьте соединение с сервером API и попробуйте обновить страницу."
        />
      ) : itemsList.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-10 w-10 text-dh-textMuted" />}
          title="Предметы по вашему запросу не найдены"
          description="Попробуйте ослабить фильтры по редкости, герою или диапазону стоимости."
          action={
            <Button variant="primary" onClick={handleResetFilters}>
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {itemsList.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-dh-border pt-6 sm:flex-row">
              <p className="text-xs text-dh-textMuted">
                Страница <span className="font-mono font-bold text-dh-text">{page}</span> из{' '}
                <span className="font-mono font-bold text-dh-text">{totalPages}</span> (всего{' '}
                {totalItems} предметов)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const prevPage = Math.max(1, page - 1);
                    setPage(prevPage);
                    updateUrlParams({ page: String(prevPage) });
                  }}
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
                  onClick={() => {
                    const nextPage = Math.min(totalPages, page + 1);
                    setPage(nextPage);
                    updateUrlParams({ page: String(nextPage) });
                  }}
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