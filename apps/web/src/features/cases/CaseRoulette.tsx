import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { DotaItemDto } from '@dotahub/shared';
import { SafeImage } from '@/components/ui/SafeImage';
import { getRarityMeta } from '@dotahub/shared';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { cn } from '@/lib/formatters';

interface CaseRouletteProps {
  pool: DotaItemDto[];
  winningItem: DotaItemDto | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
}

const ITEM_WIDTH = 160;
const TOTAL_ITEMS_IN_STRIP = 60;
const WINNING_INDEX = 48;

export const CaseRoulette: React.FC<CaseRouletteProps> = ({
  pool,
  winningItem,
  isSpinning,
  onSpinComplete,
}) => {
  const prefersReducedMotion = useReducedMotionSafe();
  const [stripItems, setStripItems] = useState<DotaItemDto[]>([]);
  const [offsetPx, setOffsetPx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Формируем ленту предметов для рулетки при старте открытия или смене пула
  useEffect(() => {
    if (!winningItem || pool.length === 0) {
      // Генерируем базовую демоленту
      const demoStrip = Array.from({ length: 40 }, () => {
        return pool[Math.floor(Math.random() * pool.length)] || pool[0];
      });
      setStripItems(demoStrip);
      return;
    }

    const items: DotaItemDto[] = [];
    for (let i = 0; i < TOTAL_ITEMS_IN_STRIP; i++) {
      if (i === WINNING_INDEX) {
        items.push(winningItem);
      } else {
        const randomItem = pool[Math.floor(Math.random() * pool.length)] || winningItem;
        items.push(randomItem);
      }
    }
    setStripItems(items);

    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const targetCenter = WINNING_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2;
      const randomJitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.6);
      const finalOffset = targetCenter - containerWidth / 2 + randomJitter;
      setOffsetPx(finalOffset);
    }
  }, [winningItem, pool]);

  return (
    <div className="relative overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card">
      {/* Указатель центра рулетки */}
      <div className="absolute inset-y-0 left-1/2 z-20 w-1 -translate-x-1/2 bg-dh-lime shadow-dh-lime" />
      <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1 rounded-b-md bg-dh-lime px-2 py-0.5 text-[10px] font-bold text-dh-bg uppercase tracking-widest shadow-dh-lime">
        Выигрыш
      </div>

      {/* Окно рулетки */}
      <div ref={containerRef} className="relative h-44 w-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 flex items-center gap-3"
          initial={{ x: 0 }}
          animate={
            isSpinning && winningItem
              ? { x: -offsetPx }
              : { x: 0 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 5.5, ease: [0.15, 0.85, 0.25, 1] }
          }
          onAnimationComplete={() => {
            if (isSpinning) {
              onSpinComplete();
            }
          }}
        >
          {stripItems.map((item, idx) => {
            const rarityMeta = getRarityMeta(item.rarity);
            return (
              <div
                key={`${item.id}_${idx}`}
                style={{ width: ITEM_WIDTH, minWidth: ITEM_WIDTH }}
                className={cn(
                  'relative flex h-36 flex-col justify-between rounded-dh border bg-dh-bgSecondary p-3 text-left transition-all',
                  winningItem && idx === WINNING_INDEX && isSpinning === false
                    ? 'border-dh-lime ring-2 ring-dh-lime bg-dh-surfaceElevated'
                    : 'border-dh-border'
                )}
              >
                <div
                  className="inset-x-0 top-0 h-1 rounded-t-dh"
                  style={{ backgroundColor: rarityMeta.colorHex }}
                />
                <div className="flex h-20 items-center justify-center">
                  <SafeImage
                    src={item.image_url}
                    alt={item.localized_name}
                    className="h-16 w-20 object-contain"
                  />
                </div>
                <div>
                  <p className="truncate text-[10px] font-medium text-dh-textMuted">
                    {rarityMeta.labelRu}
                  </p>
                  <h4 className="truncate text-xs font-bold text-dh-text">
                    {item.localized_name}
                  </h4>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};