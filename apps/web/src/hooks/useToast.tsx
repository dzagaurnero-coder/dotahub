import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { cn } from '@/lib/formatters';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; iconColor: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    border: 'border-dh-success/40 bg-dh-surface',
    iconColor: 'text-dh-success',
    Icon: CheckCircle2,
  },
  error: {
    border: 'border-dh-danger/45 bg-dh-surface',
    iconColor: 'text-dh-danger',
    Icon: AlertCircle,
  },
  warning: {
    border: 'border-dh-warning/40 bg-dh-surface',
    iconColor: 'text-dh-warning',
    Icon: TriangleAlert,
  },
  info: {
    border: 'border-dh-indigo/40 bg-dh-surface',
    iconColor: 'text-dh-indigo',
    Icon: Info,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prefersReducedMotion = useReducedMotionSafe();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant, durationMs = 4500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newItem: ToastItem = { id, title, description, variant, durationMs };

      setToasts((prev) => [...prev.slice(-4), newItem]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
      warning: (title, description) => toast({ title, description, variant: 'warning' }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
      dismiss,
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const style = VARIANT_STYLES[item.variant];
            const IconComponent = style.Icon;

            return (
              <motion.div
                key={item.id}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                role="status"
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-dh border p-4 shadow-dh-card',
                  style.border
                )}
              >
                <IconComponent className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-dh-text">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Закрыть уведомление"
                  className="rounded-md p-1 text-dh-textMuted transition-colors hover:bg-dh-surfaceElevated hover:text-dh-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('Хук useToast должен использоваться внутри ToastProvider');
  }
  return context;
}