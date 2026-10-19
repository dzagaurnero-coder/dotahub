import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
  CASE_CATEGORIES,
  CASE_CATEGORY_LABELS_RU,
  rubToMinorUnits,
  type CaseCategory,
  type CasesCatalogQueryInput,
} from '@dotahub/shared';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CaseCard } from '@/components/cards/CaseCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/formatters';

type SortOption = CasesCatalogQueryInput['sort'];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'featured', label: 'Сначала рекомендуемые' },
  { value: 'price_asc', label: 'Дешевле → Дороже' },
  { value: 'price_desc', label: 'Дороже → Дешевле' },
  { value: 'name_asc', label: 'По названию (А–Я)' },
];

export const CasesCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const initialCategory = (searchParams.get('category') as CaseCategory | null) || 'all';
  const initialSort = (searchParams.get('sort') as SortOption | null) || 'featured';
  const initialSearch = searchParams.get('search') || '';

  const [searchText, setSearchText] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<CaseCategory | 'all'>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [minPriceRub, setMinPriceRub] = useState<string>('');
  const [maxPriceRub, setMaxPriceRub] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const queryParams = useMemo<Partial<CasesCatalogQueryInput>>(() => {
    const params: Partial<CasesCatalogQueryInput> = {
      sort: sortBy,
    };
    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }
    if (searchText.trim()) {
      params.search = searchText.trim();
    }
    const minNum = Number(minPriceRub);
    if (!Number.isNaN(minNum) && minNum > 0) {
      params.minPriceMinor = rubToMinorUnits(minNum);
    }
    const maxNum = Number(maxPriceRub);
    if (!Number.isNaN(maxNum) && maxNum > 0) {
      params.maxPriceMinor = rubToMinorUnits(maxNum);
    }
    if (onlyFavorites) {
      params.favoritesOnly = true;
    }
    return params;
  }, [selectedCategory, sortBy, searchText, minPriceRub, maxPriceRub, onlyFavorites]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases', 'catalog', queryParams],
    queryFn: () => api.cases.list(queryParams),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (caseId: string) => api.cases.toggleFavorite(caseId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.info(
        res.isFavorite ? 'Кейс добавлен в избранное' : 'Кейс удалён из избранного'
      );
    },
    onError: (err: Error) => {
      toast.error('Не удалось обновить избранное', err.message);
    },
  });

  const handleToggleFavorite = (caseId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    toggleFavoriteMutation.mutate(caseId);
  };

  const handleCategoryChange = (cat: CaseCategory | 'all') => {
    setSelectedCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') {
      next.delete('category');
    } else {
      next.set('category', cat);
    }
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedCategory('all');
    setSortBy('featured');
    setMinPriceRub('');
    setMaxPriceRub('');
    setOnlyFavorites(false);
    setSearchParams({}, { replace: true });
  };

  const casesList = data?.cases ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка каталога */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Box className="h-4 w-4" />
            Витрина коллекций
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Каталог виртуальных кейсов Dota 2
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Все кейсы содержат фиксированный пул предметов с проверяемой суммой вероятностей 100%.
          </p>
        </div>
        <div className="text-xs font-mono text-dh-textMuted">
          Найдено коллекций:{' '}
          <span className="font-bold text-dh-lime">{casesList.length}</span>
        </div>
      </div>

      {/* Панель фильтров и сортировки */}
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card space-y-5">
        {/* Категории в виде быстрых вкладок */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={cn(
              'rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
              selectedCategory === 'all'
                ? 'bg-dh-lime text-dh-bg'
                : 'border border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
            )}
          >
            Все категории
          </button>
          {CASE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryChange(category)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                selectedCategory === category
                  ? 'bg-dh-lime text-dh-bg'
                  : 'border border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
              )}
            >
              {CASE_CATEGORY_LABELS_RU[category]}
            </button>
          ))}
        </div>

        {/* Поиск, диапазон цен и сортировка */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="lg:col-span-4">
            <Input
              label="Поиск по названию кейса"
              placeholder="Например: Immortal, Pudge, Arcana..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:col-span-3">
            <Input
              label="Цена от (₽)"
              type="number"
              min="0"
              placeholder="0"
              value={minPriceRub}
              onChange={(e) => setMinPriceRub(e.target.value)}
            />
            <Input
              label="Цена до (₽)"
              type="number"
              min="0"
              placeholder="15000"
              value={maxPriceRub}
              onChange={(e) => setMaxPriceRub(e.target.value)}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Сортировка"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              options={SORT_OPTIONS}
            />
          </div>

          <div className="flex items-center gap-2 lg:col-span-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setOnlyFavorites((prev) => !prev)}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-dh border px-3 text-xs font-semibold transition-colors',
                  onlyFavorites
                    ? 'border-dh-lime bg-dh-lime/15 text-dh-lime'
                    : 'border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Избранные</span>
              </button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={handleResetFilters}
              title="Сбросить все фильтры"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Сброс
            </Button>
          </div>
        </div>
      </div>

      {/* Сетка карточек кейсов */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-72" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Ошибка при загрузке каталога кейсов"
          description="Не удалось получить список коллекций с сервера. Попробуйте обновить страницу."
        />
      ) : casesList.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-10 w-10 text-dh-textMuted" />}
          title="По выбранным параметрам кейсы не найдены"
          description="Попробуйте изменить поисковый запрос, расширить ценовой диапазон или сбросить фильтры."
          action={
            <Button variant="primary" onClick={handleResetFilters}>
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {casesList.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              caseData={caseItem}
              onToggleFavorite={(caseId) => handleToggleFavorite(caseId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};