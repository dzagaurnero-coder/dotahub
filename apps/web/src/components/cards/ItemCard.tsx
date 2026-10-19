import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye } from 'lucide-react';
import {
  getRarityMeta,
  ITEM_TYPE_LABELS_RU,
  type DotaItemDto,
  type KnownItemType,
} from '@dotahub/shared';
import { SafeImage } from '@/components/ui/SafeImage';
import { Badge } from '@/components/ui/Badge';
import { cn, formatRub } from '@/lib/formatters';

export interface ItemCardProps {
  item: DotaItemDto;
  dropChancePercent?: number;
  subtitleOverride?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  linkToDetail?: boolean;
  compact?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  dropChancePercent,
  subtitleOverride,
  isSelected = false,
  onSelect,
  linkToDetail = true,
  compact = false,
}) => {
  const rarityMeta = getRarityMeta(item.rarity);
  const slotLabel =
    ITEM_TYPE_LABELS_RU[item.item_type as KnownItemType] || item.item_type || 'Предмет';

  const cardContent = (
    <>
      <div
        className=" inset-x-0 top-0 h-1 w-full rounded-t-dh"
        style={{ backgroundColor: rarityMeta.colorHex }}
      />
      <div className={cn('flex flex-1 flex-col justify-between', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-center justify-between gap-1.5">
          <Badge variant="rarity" rarityCode={item.rarity} dot>
            {rarityMeta.labelRu}
          </Badge>
          {dropChancePercent !== undefined ? (
            <span className="font-mono text-xs font-semibold text-dh-textMuted">
              {dropChancePercent.toFixed(2)}%
            </span>
          ) : (
            isSelected && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dh-lime text-dh-bg">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
            )
          )}
        </div>

        <div className={cn('my-3 flex items-center justify-center', compact ? 'h-20' : 'h-28')}>
          <SafeImage
            src={item.image_url}
            alt={item.localized_name}
            loading="lazy"
            className={cn(
              'object-contain transition-transform duration-300 group-hover:scale-105',
              compact ? 'h-16 w-24' : 'h-24 w-32'
            )}
          />
        </div>

        <div className="space-y-2">
          <div>
            <p className="truncate text-[11px] font-medium text-dh-textMuted">
              {subtitleOverride || `${item.hero_name || 'Общий предмет'} • ${slotLabel}`}
            </p>
            <h4 className="truncate text-sm font-semibold text-dh-text group-hover:text-dh-lime transition-colors">
              {item.localized_name}
            </h4>
          </div>

          <div className="flex items-center justify-between border-t border-dh-border/70 pt-2">
            <span className="font-mono text-xs font-bold text-dh-text">
              {formatRub(item.estimated_value_minor)}
            </span>
            {linkToDetail && !onSelect && (
              <span className="inline-flex items-center gap-1 text-[11px] text-dh-textMuted group-hover:text-dh-text">
                <Eye className="h-3 w-3" />
                Обзор
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const wrapperClasses = cn(
    'group relative flex flex-col overflow-hidden rounded-dh border bg-dh-surface transition-all duration-200 text-left w-full',
    isSelected
      ? 'border-dh-lime ring-1 ring-dh-lime bg-dh-surfaceElevated'
      : 'border-dh-border hover:-translate-y-0.5 hover:border-dh-textMuted/50'
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={wrapperClasses}>
        {cardContent}
      </button>
    );
  }

  if (linkToDetail) {
    return (
      <Link to={`/items/${item.slug}`} className={wrapperClasses}>
        {cardContent}
      </Link>
    );
  }

  return <div className={wrapperClasses}>{cardContent}</div>;
};