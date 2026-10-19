import React from 'react';
import { getRarityMeta } from '@dotahub/shared';
import { cn } from '@/lib/formatters';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'rarity' | 'category' | 'success' | 'danger' | 'neutral' | 'indigo';
  rarityCode?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  rarityCode,
  dot = false,
  ...props
}) => {
  let customStyle = {};
  let variantClasses = 'bg-dh-surfaceElevated text-dh-textMuted border-dh-border';

  if (variant === 'rarity' && rarityCode) {
    const meta = getRarityMeta(rarityCode);
    customStyle = {
      color: meta.colorHex,
      borderColor: `${meta.colorHex}40`,
      backgroundColor: `${meta.colorHex}15`,
    };
  } else {
    switch (variant) {
      case 'success':
        variantClasses = 'bg-dh-success/15 text-dh-success border-dh-success/30';
        break;
      case 'danger':
        variantClasses = 'bg-dh-danger/15 text-dh-danger border-dh-danger/30';
        break;
      case 'indigo':
        variantClasses = 'bg-dh-indigo/15 text-dh-indigo border-dh-indigo/30';
        break;
      case 'category':
        variantClasses = 'bg-dh-surfaceElevated text-dh-text border-dh-border font-medium';
        break;
      default:
        variantClasses = 'bg-dh-surfaceElevated text-dh-textMuted border-dh-border';
        break;
    }
  }

  return (
    <span
      style={customStyle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        variantClasses,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={
            variant === 'rarity' && rarityCode
              ? { backgroundColor: getRarityMeta(rarityCode).colorHex }
              : undefined
          }
        />
      )}
      <span>{children}</span>
    </span>
  );
};