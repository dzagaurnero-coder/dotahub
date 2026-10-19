import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Box,
  Flame,
  Info,
  Layers,
  Shield,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import {
  getRarityMeta,
  ITEM_TYPE_LABELS_RU,
  type KnownItemType,
} from '@dotahub/shared';
import { api } from '@/lib/api-client';
import { CaseCard } from '@/components/cards/CaseCard';
import { ItemCard } from '@/components/cards/ItemCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRub } from '@/lib/formatters';

const QUALITY_LABELS_RU: Record<string, string> = {
  standard: 'Standard (Стандартное)',
  inscribed: 'Inscribed (Руны статистики)',
  exalted: 'Exalted (Возвышенное)',
  corrupted: 'Corrupted (Искажённое)',
  autographed: 'Autographed (С автографом)',
  infused: 'Infused (Насыщенное)',
  genuine: 'Genuine (Подлинное)',
  auspicious: 'Auspicious (Благоприятное)',
  unusual: 'Unusual (Необычное)',
  heroic: 'Heroic (Героическое)',
  elder: 'Elder (Древнее)',
};

export const ItemDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['items', 'detail', slug],
    queryFn: () => api.items.getBySlug(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.item) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Предмет не найден в каталоге"
          description="Возможно, ссылка устарела или предмет был скрыт из активного справочника DotaHub."
          action={
            <Link to="/items">
              <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Вернуться в каталог предметов
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { item, relatedCases, similarItems } = data;
  const rarityMeta = getRarityMeta(item.rarity);
  const slotLabel =
    ITEM_TYPE_LABELS_RU[item.item_type as KnownItemType] || item.item_type || 'Предмет';
  const qualityLabel = QUALITY_LABELS_RU[item.quality] || item.quality;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Хлебные крошки и возврат в каталог */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-dh-textMuted">
          <Link
            to="/items"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dh-border bg-dh-surface px-3 py-1.5 font-semibold text-dh-textMuted hover:text-dh-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Каталог предметов</span>
          </Link>
          {item.hero_slug && item.hero_name && (
            <>
              <span>/</span>
              <Link
                to={`/items?hero=${encodeURIComponent(item.hero_slug)}`}
                className="rounded-lg border border-dh-border bg-dh-surface px-3 py-1.5 font-semibold text-dh-indigo hover:border-dh-indigo/50 transition-colors"
              >
                {item.hero_name}
              </Link>
            </>
          )}
        </div>

        <Link to="/upgrader">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Flame className="h-4 w-4" />}
          >
            Открыть Апгрейдер
          </Button>
        </Link>
      </div>

      {/* Главная карточка предмета */}
      <section className="relative overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 lg:p-10 shadow-dh-card">
        {/* Верхняя полоса цвета редкости */}
        <div
          className="inset-x-0 top-0 h-1.5 w-full absolute"
          style={{ backgroundColor: rarityMeta.colorHex }}
        />

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Визуальная витрина предмета */}
          <div className="relative flex flex-col items-center justify-center rounded-dh-lg border border-dh-border bg-dh-bgSecondary p-8 lg:col-span-5 min-h-[300px]">
            <div
              className="pointer-events-none absolute h-48 w-48 rounded-full opacity-25 blur-3xl"
              style={{ backgroundColor: rarityMeta.colorHex }}
            />
            <SafeImage
              src={item.image_url}
              alt={item.localized_name}
              className="relative z-10 h-48 w-64 object-contain drop-shadow-lg transition-transform duration-300 hover:scale-105"
            />
            <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="rarity" rarityCode={item.rarity} dot>
                {rarityMeta.labelRu}
              </Badge>
              <Badge variant="neutral">{qualityLabel}</Badge>
            </div>
          </div>

          {/* Характеристики и описание предмета */}
          <div className="space-y-6 lg:col-span-7">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-dh-textMuted">
                <span className="inline-flex items-center gap-1 text-dh-lime">
                  <Sparkles className="h-3.5 w-3.5" />
                  Косметический предмет Dota 2
                </span>
                {item.name && item.name !== item.localized_name && (
                  <span className="font-mono text-dh-textMuted">({item.name})</span>
                )}
              </div>

              <h1 className="font-display text-2xl font-extrabold text-dh-text sm:text-3xl lg:text-4xl">
                {item.localized_name}
              </h1>

              {item.description ? (
                <p className="text-sm leading-relaxed text-dh-textMuted">
                  {item.description}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-dh-textMuted">
                  Внутриигровой косметический предмет Dota 2 категории «{slotLabel}» редкости{' '}
                  {rarityMeta.labelRu}.
                </p>
              )}
            </div>

            {/* Таблица атрибутов */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5">
                <User className="h-5 w-5 text-dh-indigo shrink-0" />
                <div>
                  <span className="block text-[11px] text-dh-textMuted">Герой Dota 2</span>
                  <span className="text-sm font-bold text-dh-text">
                    {item.hero_name || 'Общий предмет (Все герои)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5">
                <Layers className="h-5 w-5 text-dh-lime shrink-0" />
                <div>
                  <span className="block text-[11px] text-dh-textMuted">Слот / категория</span>
                  <span className="text-sm font-bold text-dh-text">{slotLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5">
                <Shield className="h-5 w-5 shrink-0" style={{ color: rarityMeta.colorHex }} />
                <div>
                  <span className="block text-[11px] text-dh-textMuted">Редкость</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: rarityMeta.colorHex }}
                  >
                    {rarityMeta.labelRu}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5">
                <Tag className="h-5 w-5 text-dh-textMuted shrink-0" />
                <div>
                  <span className="block text-[11px] text-dh-textMuted">Качество</span>
                  <span className="text-sm font-bold text-dh-text">{qualityLabel}</span>
                </div>
              </div>
            </div>

            {/* Блок ориентировочной стоимости и действий */}
            <div className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-bgSecondary p-5 sm:flex-row sm:items-center">
              <div>
                <span className="block text-xs text-dh-textMuted">
                  Ориентировочная оценка в демоконтуре
                </span>
                <span className="mt-0.5 block font-mono text-2xl font-extrabold text-dh-lime">
                  {formatRub(item.estimated_value_minor)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {relatedCases.length > 0 && (
                  <a href="#item-cases">
                    <Button variant="primary" leftIcon={<Box className="h-4 w-4" />}>
                      Кейсы с предметом ({relatedCases.length})
                    </Button>
                  </a>
                )}
                <Link to="/upgrader">
                  <Button variant="outline" leftIcon={<Flame className="h-4 w-4 text-dh-indigo" />}>
                    В Апгрейдер
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-dh-textMuted">
              <Info className="h-4 w-4 shrink-0 text-dh-indigo" />
              <span>
                Оценка стоимости рассчитывается для механик виртуальных кейсов и Upgrader внутри
                платформы DotaHub.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Секция кейсов, в которых выпадает этот предмет */}
      <section id="item-cases" className="space-y-5">
        <div className="border-b border-dh-border pb-3">
          <h2 className="font-display text-xl font-extrabold text-dh-text">
            В каких кейсах содержится «{item.localized_name}»
          </h2>
          <p className="mt-0.5 text-xs text-dh-textMuted">
            Коллекции DotaHub, в пуле которых можно получить данный предмет
          </p>
        </div>

        {relatedCases.length === 0 ? (
          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 text-sm text-dh-textMuted">
            Сейчас этот предмет не входит в пул активных кейсов, но доступен в качестве цели в{' '}
            <Link to="/upgrader" className="font-semibold text-dh-lime hover:underline">
              Апгрейдере
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseData={caseItem} />
            ))}
          </div>
        )}
      </section>

      {/* Секция похожих предметов */}
      {similarItems.length > 0 && (
        <section className="space-y-5">
          <div className="border-b border-dh-border pb-3">
            <h2 className="font-display text-xl font-extrabold text-dh-text">
              Похожие предметы Dota 2
            </h2>
            <p className="mt-0.5 text-xs text-dh-textMuted">
              Предметы того же героя или близкой редкости из каталога
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {similarItems.slice(0, 6).map((simItem) => (
              <ItemCard key={simItem.id} item={simItem} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};