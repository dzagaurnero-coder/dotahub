import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Sparkles, XCircle } from 'lucide-react';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { cn } from '@/lib/formatters';

export interface UpgraderWheelProps {
  chancePercent: number;
  multiplier: number | null;
  isSpinning: boolean;
  rollBasisPoints: number | null;
  lastOutcome: 'won' | 'lost' | null;
  onSpinComplete: () => void;
}

const SIZE = 280;
const STROKE_WIDTH = 16;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const UpgraderWheel: React.FC<UpgraderWheelProps> = ({
  chancePercent,
  multiplier,
  isSpinning,
  rollBasisPoints,
  lastOutcome,
  onSpinComplete,
}) => {
  const prefersReducedMotion = useReducedMotionSafe();
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [spinCount, setSpinCount] = useState<number>(0);

  const clampedChance = Math.max(0, Math.min(85, chancePercent));
  const strokeDashoffset = CIRCUMFERENCE - (clampedChance / 100) * CIRCUMFERENCE;

  useEffect(() => {
    if (isSpinning && rollBasisPoints !== null) {
      const nextSpinIndex = spinCount + 1;
      setSpinCount(nextSpinIndex);

      // Угол на окружности (0..360°), строго соответствующий серверному roll_basis_points (0..9999)
      const targetAngle = (rollBasisPoints / 10000) * 360;
      const fullRotations = nextSpinIndex * 360 * 6;
      setRotationDeg(fullRotations + targetAngle);
    }
  }, [isSpinning, rollBasisPoints]);

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      {/* Внешнее фоновое свечение в зависимости от состояния */}
      <div
        className={cn(
          'pointer-events-none absolute h-56 w-56 rounded-full blur-3xl transition-colors duration-500',
          lastOutcome === 'won' && !isSpinning
            ? 'bg-dh-success/25'
            : lastOutcome === 'lost' && !isSpinning
              ? 'bg-dh-danger/25'
              : clampedChance > 0
                ? 'bg-dh-lime/15'
                : 'bg-dh-indigo/10'
        )}
      />

      <div className="relative flex h-[280px] w-[280px] items-center justify-center">
        {/* Векторное кольцо вероятности (начало сектора в верхней точке 12 часов) */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90 transform"
          aria-hidden="true"
        >
          {/* Базовая подложка кольца */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="transparent"
            stroke="#1B202B"
            strokeWidth={STROKE_WIDTH}
          />

          {/* Активный сектор выигрыша */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="transparent"
            stroke={
              lastOutcome === 'lost' && !isSpinning
                ? '#FF5D68'
                : lastOutcome === 'won' && !isSpinning
                  ? '#45D483'
                  : '#B7FF45'
            }
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            className="transition-all duration-300"
          />
        </svg>

        {/* Вращающийся указатель (стрелка) */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ rotate: 0 }}
          animate={{ rotate: rotationDeg }}
          transition={
            isSpinning
              ? prefersReducedMotion
                ? { duration: 0.05 }
                : { duration: 4.2, ease: [0.14, 0.85, 0.24, 1] }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (isSpinning) {
              onSpinComplete();
            }
          }}
        >
          <div className="mx-auto flex h-1/2 w-4 flex-col items-center justify-start pt-1">
            <div className="h-5 w-1.5 rounded-full bg-dh-text shadow-dh-lime ring-2 ring-dh-bg" />
          </div>
        </motion.div>

        {/* Центральный информационный диск */}
        <div className="relative z-10 flex h-48 w-48 flex-col items-center justify-center rounded-full border border-dh-border bg-dh-bgSecondary p-4 text-center shadow-dh-card">
          {!isSpinning && lastOutcome === 'won' ? (
            <div className="flex flex-col items-center text-dh-success">
              <CheckCircle2 className="mb-1 h-7 w-7" />
              <span className="font-display text-lg font-extrabold uppercase tracking-wide">
                Успех!
              </span>
              <span className="mt-0.5 text-[11px] text-dh-textMuted">
                Roll: {rollBasisPoints !== null ? (rollBasisPoints / 100).toFixed(2) : '0.00'}%
              </span>
            </div>
          ) : !isSpinning && lastOutcome === 'lost' ? (
            <div className="flex flex-col items-center text-dh-danger">
              <XCircle className="mb-1 h-7 w-7" />
              <span className="font-display text-lg font-extrabold uppercase tracking-wide">
                Неудача
              </span>
              <span className="mt-0.5 text-[11px] text-dh-textMuted">
                Roll: {rollBasisPoints !== null ? (rollBasisPoints / 100).toFixed(2) : '0.00'}%
              </span>
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-dh-textMuted">
                <Flame className="h-3.5 w-3.5 text-dh-lime" />
                Шанс апгрейда
              </span>
              <span className="mt-1 font-mono text-3xl font-extrabold text-dh-text">
                {clampedChance.toFixed(2)}%
              </span>
              {multiplier !== null && multiplier > 0 ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-dh-indigo/30 bg-dh-indigo/15 px-2.5 py-0.5 font-mono text-xs font-bold text-dh-indigo">
                  <Sparkles className="h-3 w-3" />
                  x{multiplier.toFixed(2)}
                </span>
              ) : (
                <span className="mt-1.5 text-[11px] text-dh-textMuted">
                  Выберите оба предмета
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};