import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Box,
  Flame,
  Gift,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CASE_CATEGORY_LABELS_RU,
  getRarityMeta,
  type CaseCategory,
} from '@dotahub/shared';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CaseCard } from '@/components/cards/CaseCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatRub } from '@/lib/formatters';

type CategoryFilter = 'all' | 'featured' | CaseCategory;

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Все кейсы' },
  { id: 'featured', label: 'Популярные' },
  { id: 'budget', label: CASE_CATEGORY_LABELS_RU.budget },
  { id: 'heroic', label: CASE_CATEGORY_LABELS_RU.heroic },
  { id: 'immortal', label: CASE_CATEGORY_LABELS_RU.immortal },
  { id: 'arcana', label: CASE_CATEGORY_LABELS_RU.arcana },
];

export const HomePage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases', 'home'],
    queryFn: () => api.cases.list({ sort: 'featured' }),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (caseId: string) => api.cases.toggleFavorite(caseId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.info(
        res.isFavorite
          ? 'Кейс добавлен в избранное'
          : 'Кейс удалён из избранного'
      );
    },
    onError: (err: Error) => {
      toast.error('Ошибка обновления избранного', err.message);
    },
  });

  const handleToggleFavorite = (caseId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    toggleFavoriteMutation.mutate(caseId);
  };

  const allCases = data?.cases ?? [];
  const recentOpenings = data?.recentOpenings ?? [];

  const filteredCases = useMemo(() => {
    if (activeCategory === 'all') return allCases;
    if (activeCategory === 'featured') {
      return allCases.filter((item) => item.is_featured);
    }
    return allCases.filter((item) => item.category === activeCategory);
  }, [allCases, activeCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Живая лента последних открытий */}
      <section aria-label="Последние выбитые предметы">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-dh-textMuted">
            <span className="h-2 w-2 rounded-full bg-dh-lime animate-pulse" />
            <span>Прямой эфир открытий</span>
          </div>
          <Link
            to="/cases"
            className="text-xs font-semibold text-dh-indigo hover:text-dh-indigoHover transition-colors"
          >
            Все кейсы →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : recentOpenings.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recentOpenings.slice(0, 6).map((entry) => {
              const rarityMeta = getRarityMeta(entry.item_rarity);
              return (
                <Link
                  key={entry.id}
                  to={`/cases/${entry.case_slug}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-dh border border-dh-border bg-dh-surface p-2.5 transition-colors hover:border-dh-textMuted/60 hover:bg-dh-surfaceElevated"
                >
                  <div
                    className="inset-y-0 left-0 w-1 shrink-0 rounded-full self-stretch"
                    style={{ backgroundColor: rarityMeta.colorHex }}
                  />
                  <SafeImage
                    src={entry.item_image_url}
                    alt={entry.item_name}
                    className="h-11 w-14 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-dh-text group-hover:text-dh-lime transition-colors">
                      {entry.item_name}
                    </p>
                    <p className="truncate text-[11px] text-dh-textMuted">
                      {entry.user_display_name} • {entry.case_name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-bold text-dh-text">
                      {formatRub(entry.price_minor)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-dh border border-dh-border bg-dh-surface px-4 py-3 text-xs text-dh-textMuted">
            Лента открытий готова к работе — откройте первый кейс, чтобы ваш дроп появился в эфире!
          </div>
        )}
      </section>

      {/* Главный Hero-баннер */}
      <section className="relative overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-10 lg:p-12 shadow-dh-card">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-dh-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-dh-indigo/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="indigo">
                <Sparkles className="h-3.5 w-3.5" />
                Виртуальный деморежим 2 500 ₽ при старте
              </Badge>
              <Badge variant="neutral">
                <ShieldCheck className="h-3.5 w-3.5 text-dh-lime" />
                Provably Fair HMAC-SHA256
              </Badge>
            </div>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-dh-text sm:text-4xl lg:text-5xl">
              Виртуальные кейсы и{' '}
              <span className="text-dh-lime">Апгрейдер</span> предметов Dota 2
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-dh-textMuted sm:text-base">
              Открывайте тематические коллекции от бюджетных наборов до Immortal и Arcana с
              полностью прозрачными шансами 100%, улучшайте предметы в интерактивном Upgrader и
              исследуйте структурированный каталог косметики Dota 2.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/cases">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Box className="h-5 w-5" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Смотреть кейсы
                </Button>
              </Link>
              <Link to="/upgrader">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Flame className="h-5 w-5" />}
                >
                  Перейти в Апгрейдер
                </Button>
              </Link>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => openAuthModal('register')}
                  leftIcon={<Gift className="h-5 w-5 text-dh-lime" />}
                >
                  Получить 2 500 ₽ демо
                </Button>
              )}
            </div>
          </div>

          {/* Правая информационная панель преимуществ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
            <div className="rounded-dh border border-dh-border bg-dh-bgSecondary/90 p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-dh-text">
                <Zap className="h-4 w-4 text-dh-lime" />
                <span>Точные вероятности 100%</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                Внутри каждого кейса опубликован полный список предметов и точный процент выпадения.
              </p>
            </div>

            <div className="rounded-dh border border-dh-border bg-dh-bgSecondary/90 p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-dh-text">
                <Flame className="h-4 w-4 text-dh-indigo" />
                <span>Честный Upgrader (1% – 85%)</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                Серверный расчёт шанса по стоимости предметов и мгновенная криптографическая проверка.
              </p>
            </div>

            <div className="rounded-dh border border-dh-border bg-dh-bgSecondary/90 p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-dh-text">
                <Layers className="h-4 w-4 text-dh-success" />
                <span>Каталог предметов Dota 2</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                Фильтрация по героям, редкостям, качествам и слотам экипировки с защитой от дублей.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Секция витрины кейсов */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-dh-text">
              Коллекции виртуальных кейсов
            </h2>
            <p className="mt-1 text-xs text-dh-textMuted">
              Выберите подходящую категорию или откройте полный каталог с расширенной сортировкой
            </p>
          </div>

          {/* Переключатель категорий */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeCategory === tab.id
                    ? 'bg-dh-lime text-dh-bg'
                    : 'border border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Не удалось загрузить витрину кейсов"
            description="Проверьте соединение с сервером API и обновите страницу."
          />
        ) : filteredCases.length === 0 ? (
          <EmptyState
            title="В этой категории пока нет активных кейсов"
            description="Попробуйте переключить вкладку фильтра или перейти в общий каталог."
            action={
              <Button variant="outline" size="sm" onClick={() => setActiveCategory('all')}>
                Показать все кейсы
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseData={caseItem}
                onToggleFavorite={(caseId) => handleToggleFavorite(caseId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Нижний сплит-блок: Апгрейдер + Каталог предметов */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card">
          <div className="space-y-3">
            <Badge variant="indigo">Интерактивная механика</Badge>
            <h3 className="font-display text-xl font-extrabold text-dh-text">
              Апгрейдер предметов Dota 2
            </h3>
            <p className="text-xs leading-relaxed text-dh-textMuted sm:text-sm">
              Выберите предмет из своего виртуального инвентаря и укажите желаемую цель из каталога
              с множителем x1.5, x2, x5 или x10. Исход определяется атомарно на сервере.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-dh-border">
            <Link to="/upgrader">
              <Button
                variant="secondary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Открыть Upgrader
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card">
          <div className="space-y-3">
            <Badge variant="category">Энциклопедия косметики</Badge>
            <h3 className="font-display text-xl font-extrabold text-dh-text">
              Структурированный каталог предметов
            </h3>
            <p className="text-xs leading-relaxed text-dh-textMuted sm:text-sm">
              Изучайте косметические предметы по героям, редкостям от Common до Arcana, качествам
              (Inscribed, Exalted, Corrupted) и слотам экипировки, а также проверяйте, в каких
              кейсах они содержатся.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-dh-border">
            <Link to="/items">
              <Button
                variant="outline"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Перейти в каталог предметов
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};