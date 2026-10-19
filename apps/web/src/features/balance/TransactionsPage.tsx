import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
  ShieldCheck,
} from 'lucide-react';
import type { TransactionType } from '@dotahub/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTimeRu, formatRub } from '@/lib/formatters';

const TYPE_LABELS_RU: Record<TransactionType, string> = {
  deposit: 'Пополнение баланса',
  case_opening: 'Открытие кейса',
  upgrader_bet: 'Ставка в Upgrader',
  upgrader_win: 'Выигрыш в Upgrader',
  item_sale: 'Продажа предмета',
  daily_bonus: 'Ежедневный бонус',
  promo_bonus: 'Активация промокода',
  admin_adjustment: 'Корректировка администратора',
};

const TYPE_META: Record<
  TransactionType,
  { isPositive: boolean; variant: 'success' | 'danger' | 'neutral' | 'indigo' }
> = {
  deposit: { isPositive: true, variant: 'success' },
  case_opening: { isPositive: false, variant: 'danger' },
  upgrader_bet: { isPositive: false, variant: 'danger' },
  upgrader_win: { isPositive: true, variant: 'success' },
  item_sale: { isPositive: true, variant: 'success' },
  daily_bonus: { isPositive: true, variant: 'success' },
  promo_bonus: { isPositive: true, variant: 'success' },
  admin_adjustment: { isPositive: true, variant: 'indigo' },
};

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Все типы операций' },
  { value: 'deposit', label: 'Пополнения' },
  { value: 'case_opening', label: 'Открытия кейсов' },
  { value: 'upgrader_bet', label: 'Ставки в Upgrader' },
  { value: 'upgrader_win', label: 'Выигрыши в Upgrader' },
  { value: 'item_sale', label: 'Продажи предметов' },
  { value: 'daily_bonus', label: 'Ежедневные бонусы' },
  { value: 'promo_bonus', label: 'Промокоды' },
];

const PAGE_SIZE = 15;

export const TransactionsPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', selectedType, page],
    queryFn: () =>
      api.balance.transactions({
        type: selectedType !== 'all' ? (selectedType as TransactionType) : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const transactions = data?.transactions ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка страницы */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <History className="h-4 w-4" />
            Аудит финансовой активности
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            История операций и транзакций
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Полный неизменяемый журнал всех списаний и зачислений на ваш виртуальный демобаланс.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            options={TYPE_OPTIONS}
          />
        </div>
      </div>

      {/* Список транзакций */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Не удалось загрузить историю транзакций"
          description="Проверьте соединение с сервером и обновите страницу."
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<History className="h-10 w-10 text-dh-textMuted" />}
          title="История операций пуста"
          description="Здесь будут отображаться все ваши пополнения, открытия кейсов и операции в Upgrader."
        />
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const meta = TYPE_META[tx.type] ?? { isPositive: true, variant: 'neutral' };
            const labelRu = TYPE_LABELS_RU[tx.type] ?? tx.type;

            return (
              <div
                key={tx.id}
                className="flex flex-col justify-between gap-3 rounded-dh-lg border border-dh-border bg-dh-surface p-4 sm:flex-row sm:items-center shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      meta.isPositive
                        ? 'border-dh-success/30 bg-dh-success/10 text-dh-success'
                        : 'border-dh-danger/30 bg-dh-danger/10 text-dh-danger'
                    }`}
                  >
                    {meta.isPositive ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-dh-text">{labelRu}</span>
                      <Badge variant={meta.variant}>ID: {tx.id.slice(0, 8)}</Badge>
                    </div>
                    <p className="text-xs text-dh-textMuted">
                      {tx.description || 'Операция по виртуальному демоконтуру'} •{' '}
                      {formatDateTimeRu(tx.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-dh-border/70 pt-2 sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span
                      className={`font-mono text-base font-extrabold ${
                        meta.isPositive ? 'text-dh-success' : 'text-dh-danger'
                      }`}
                    >
                      {meta.isPositive ? '+' : '-'}
                      {formatRub(tx.amount_minor)}
                    </span>
                    <span className="block text-[10px] text-dh-textMuted">
                      Баланс после: {formatRub(tx.balance_after_minor)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Постраничная навигация */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-dh-border pt-6 sm:flex-row">
              <p className="text-xs text-dh-textMuted">
                Страница <span className="font-mono font-bold text-dh-text">{page}</span> из{' '}
                <span className="font-mono font-bold text-dh-text">{totalPages}</span> (всего
                записей: {totalCount})
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Назад
                </Button>
                <span className="rounded-lg border border-dh-border bg-dh-surface px-3.5 py-1.5 font-mono text-xs font-bold text-dh-lime">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Защита аудита */}
      <div className="flex items-center gap-2 rounded-dh border border-dh-border bg-dh-surface p-4 text-xs text-dh-textMuted">
        <ShieldCheck className="h-5 w-5 text-dh-lime shrink-0" />
        <span>
          Все финансовые транзакции защищены механизмом идемпотентности и не могут быть удалены
          или изменены пользователем.
        </span>
      </div>
    </div>
  );
};