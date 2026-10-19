import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  formatRub,
  generateIdempotencyKey,
  rubToMinorUnits,
} from '@/lib/formatters';

const PRESET_AMOUNTS_RUB = [500, 1000, 2500, 5000, 10000];

export const BalancePage: React.FC = () => {
  const { user, syncDemoBalance } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedRub, setSelectedRub] = useState<number>(1000);

  const depositMutation = useMutation({
    mutationFn: (amountMinor: number) =>
      api.balance.deposit({
        amountMinor,
        idempotencyKey: generateIdempotencyKey('deposit'),
      }),
    onSuccess: (res) => {
      syncDemoBalance(res.updatedDemoBalanceMinor);
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(
        'Баланс успешно пополнен',
        `На ваш демонстрационный контур зачислено ${formatRub(res.creditedAmountMinor)}.`
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiClientError ? err.message : 'Не удалось пополнить баланс.';
      toast.error('Ошибка пополнения', message);
    },
  });

  const handleDeposit = () => {
    const minor = rubToMinorUnits(selectedRub);
    if (minor <= 0) return;
    depositMutation.mutate(minor);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка страницы */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Wallet className="h-4 w-4" />
            Демонстрационный контур
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Пополнение демобаланса
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Выберите сумму для мгновенного пополнения виртуального баланса и тестирования открытия кейсов
            и Upgrader.
          </p>
        </div>

        <Badge variant="indigo">
          <Sparkles className="h-3.5 w-3.5" />
          Без реальных списаний
        </Badge>
      </div>

      {/* Текущий баланс */}
      <div className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:flex-row sm:items-center shadow-dh-card">
        <div>
          <span className="text-xs text-dh-textMuted">Ваш текущий демобаланс</span>
          <p className="mt-1 font-mono text-3xl font-extrabold text-dh-lime">
            {user ? formatRub(user.demo_balance_minor) : '0 ₽'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-dh-textMuted">
          <ShieldCheck className="h-5 w-5 text-dh-lime shrink-0" />
          <span>Все операции логируются в защищённом журнале транзакций</span>
        </div>
      </div>

      {/* Выбор суммы пополнения */}
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card space-y-6">
        <h2 className="font-display text-lg font-bold text-dh-text">
          Выберите номинал пополнения
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PRESET_AMOUNTS_RUB.map((rub) => (
            <button
              key={rub}
              type="button"
              onClick={() => setSelectedRub(rub)}
              className={cn(
                'flex flex-col items-center justify-center rounded-dh border p-4 text-center transition-all',
                selectedRub === rub
                  ? 'border-dh-lime bg-dh-surfaceElevated ring-1 ring-dh-lime'
                  : 'border-dh-border bg-dh-bgSecondary hover:border-dh-textMuted/50'
              )}
            >
              <span className="font-mono text-xl font-extrabold text-dh-text">
                {rub.toLocaleString('ru-RU')} ₽
              </span>
              <span className="mt-1 text-[10px] text-dh-textMuted uppercase tracking-wider">
                Демо-начисление
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-dh-border pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-dh-textMuted">К зачислению на баланс:</span>
            <span className="block font-mono text-xl font-bold text-dh-lime">
              +{selectedRub.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <Button
            variant="primary"
            size="lg"
            isLoading={depositMutation.isPending}
            onClick={handleDeposit}
            leftIcon={<Zap className="h-5 w-5" />}
          >
            Пополнить демобаланс ({selectedRub.toLocaleString('ru-RU')} ₽)
          </Button>
        </div>
      </div>

      {/* Информационный блок */}
      <div className="flex items-start gap-3 rounded-dh-lg border border-dh-border bg-dh-surface p-5 text-xs text-dh-textMuted">
        <CheckCircle2 className="h-5 w-5 text-dh-lime shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Система пополнения полностью симулирует работу платёжного шлюза для проверки игровой
          математики. После подключения реального эквайринга этот модуль будет заменен на банковские
          вебхуки.
        </p>
      </div>
    </div>
  );
};