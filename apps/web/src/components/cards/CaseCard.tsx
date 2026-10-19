import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Layers, Sparkles } from 'lucide-react';
import { CASE_CATEGORY_LABELS_RU, type CaseSummaryDto } from '@dotahub/shared';
import { SafeImage } from '@/components/ui/SafeImage';
import { Badge } from '@/components/ui/Badge';
import { cn, formatRub } from '@/lib/formatters';

export interface CaseCardProps {
  caseData: CaseSummaryDto;
  onToggleFavorite?: (caseId: string, e: React.MouseEvent) => void;
}

export const CaseCard: React.FC<CaseCardProps> = ({ caseData, onToggleFavorite }) => {
  const categoryLabel = CASE_CATEGORY_LABELS_RU[caseData.category] ?? caseData.category;

  return (
    <Link
      to={`/cases/${caseData.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card transition-all duration-200 hover:-translate-y-1 hover:border-dh-lime/50 hover:shadow-dh-card-hover"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-dh-indigo/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex items-center justify-between gap-2">
        <Badge variant={caseData.is_featured ? 'indigo' : 'category'}>
          {caseData.is_featured && <Sparkles className="h-3 w-3 text-dh-indigo" />}
          {categoryLabel}
        </Badge>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(caseData.id, e);
            }}
            aria-label={caseData.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            className={cn(
              'rounded-lg border p-1.5 transition-colors',
              caseData.is_favorite
                ? 'border-dh-danger/40 bg-dh-danger/15 text-dh-danger'
                : 'border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
            )}
          >
            <Heart className={cn('h-4 w-4', caseData.is_favorite && 'fill-current')} />
          </button>
        )}
      </div>

      <div className="relative my-5 flex h-36 items-center justify-center">
        <SafeImage
          src={caseData.image_url}
          alt={caseData.name}
          loading="lazy"
          className="h-32 w-32 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="relative z-10 space-y-3">
        <div>
          <h3 className="truncate font-display text-base font-bold text-dh-text group-hover:text-dh-lime transition-colors">
            {caseData.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-dh-textMuted">
            {caseData.subtitle || `Пул предметов: ${caseData.items_count} шт.`}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-dh-border/80 pt-3">
          <div>
            <span className="block text-[11px] text-dh-textMuted">Стоимость</span>
            <span className="font-mono text-sm font-bold text-dh-text">
              {formatRub(caseData.price_minor)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-dh-textMuted">
              <Layers className="h-3.5 w-3.5" />
              {caseData.items_count}
            </span>
            <span className="rounded-lg bg-dh-lime px-3 py-1.5 text-xs font-semibold text-dh-bg transition-colors group-hover:bg-dh-limeHover">
              Открыть
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};