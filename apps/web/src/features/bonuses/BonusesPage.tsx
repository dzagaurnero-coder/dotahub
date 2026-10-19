import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Gift,
  Lock,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatDateTimeRu,
  formatRub,
  generateIdempotencyKey,
} from '@/lib/formatters';

export const BonusesPage: React.FC = () => {
  const { isAuthenticated, openAuthModal, syncDemoBalance } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  const { data: bonusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['bonuses', 'status'],
    queryFn: () => api.bonuses.getStatus(),
    enabled: isAuthenticated,
  });

  const claimDailyMutation = useMutation({
    mutationFn: () => api.bonuses.claimDaily(generateIdempotencyKey('daily')),
    onSuccess: (res) => {
      syncDemoBalance(res.updatedDemoBalanceMinor);
      void queryClient.invalidateQueries({ queryKey: ['bonuses', 'status'] });
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(
        'Ежедневный бонус получен!',
        `На ваш демобаланс зачислено ${formatRub(res.rewardAmountMinor)}.`
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось получить ежедневный бонус.';
      toast.error('Ошибка получения бонуса', message);
    },
  });

  const redeemPromoMutation = useMutation({
    mutationFn: (normalizedCode: string) =>
      api.bonuses.redeemPromo(normalizedCode, generateIdempotencyKey('promo')),
    onSuccess: (res) => {
      syncDemoBalance(res.result.updated_demo_balance_minor);
      setPromoCode('');
      setPromoError(null);
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast.success(
        `Промокод ${res.result.code} активирован!`,
        `Начислено ${formatRub(res.result.reward_amount_minor)} на виртуальный баланс.`
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось активировать промокод.';
      setPromoError(message);
      toast.error('Ошибка активации промокода', message);
    },
  });

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const normalized = promoCode.trim().toUpperCase();
    if (normalized.length < 3 || normalized.length > 32) {
      setPromoError('Введите корректный промокод (от 3 до 32 символов).');
      return;
    }

    redeemPromoMutation.mutate(normalized);
  };

  const status = bonusData?.status;
  const dailyRewardMinor = status?.daily_bonus_amount_minor ?? 25000;
  const canClaimDaily = status?.can_claim_daily ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* Заголовок страницы */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <Gift className="h-4 w-4" />
            Поощрения платформы
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Бонусы и промокоды DotaHub
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-dh-textMuted">
            Получайте регулярное пополнение виртуального демобаланса каждые 24 часа и активируйте
            специальные промокоды для тестирования кейсов и Upgrader.
          </p>
        </div>

        <Badge variant="indigo" className="self-start sm:self-auto px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" />
          Бесплатный демоконтур
        </Badge>
      </div>

      {/* Основные карточки: Ежедневный бонус и Промокод */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Карточка 1: Ежедневный бонус */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-dh-lime/10 blur-3xl" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dh-lime/30 bg-dh-lime/10 text-dh-lime">
                <CalendarClock className="h-6 w-6" />
              </div>
              {isAuthenticated && status && (
                <Badge variant={canClaimDaily ? 'success' : 'neutral'}>
                  {canClaimDaily ? 'Доступно к получению' : 'Ожидание таймера'}
                </Badge>
              )}
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-dh-text">
                Ежедневная награда
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                Каждые 24 часа вы можете запросить фиксированное пополнение виртуального баланса.
                Начисление фиксируется в серверном журнале транзакций.
              </p>
            </div>

            <div className="rounded-dh border border-dh-border bg-dh-bgSecondary p-4">
              <span className="block text-xs text-dh-textMuted">Размер ежедневного бонуса</span>
              <span className="mt-1 block font-mono text-2xl font-extrabold text-dh-lime">
                +{formatRub(dailyRewardMinor)}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-dh-border">
            {!isAuthenticated ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 text-xs text-dh-textMuted">
                  <Lock className="h-4 w-4 text-dh-indigo" />
                  Войдите в аккаунт для активации бонуса
                </span>
                <Button variant="primary" size="md" onClick={() => openAuthModal('login')}>
                  Войти в аккаунт
                </Button>
              </div>
            ) : isStatusLoading ? (
              <Skeleton className="h-11 w-full" />
            ) : canClaimDaily ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={claimDailyMutation.isPending}
                onClick={() => claimDailyMutation.mutate()}
                leftIcon={<Gift className="h-5 w-5" />}
              >
                Забрать {formatRub(dailyRewardMinor)}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="outline" size="lg" fullWidth disabled>
                  Бонус уже получен сегодня
                </Button>
                {status?.next_available_at && (
                  <p className="text-center text-xs text-dh-textMuted">
                    Следующее получение будет доступно:{' '}
                    <span className="font-mono font-semibold text-dh-text">
                      {formatDateTimeRu(status.next_available_at)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Карточка 2: Активация промокода */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-dh-indigo/10 blur-3xl" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dh-indigo/30 bg-dh-indigo/10 text-dh-indigo">
                <Ticket className="h-6 w-6" />
              </div>
              <Badge variant="indigo">Мгновенное зачисление</Badge>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-dh-text">
                Активация промокода
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-dh-textMuted">
                Введите промокод платформы, чтобы получить дополнительные демобаллы. Каждый
                промокод проверяется сервером на срок действия и лимит активаций.
              </p>
            </div>

            <form onSubmit={handlePromoSubmit} className="space-y-4 pt-1" noValidate>
              <Input
                label="Промокод"
                placeholder="Например: DOTAHUB2026"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                error={promoError ?? undefined}
                hint="Допустимы заглавные латинские буквы, цифры, дефис и подчёркивание"
                autoComplete="off"
              />

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                fullWidth
                isLoading={redeemPromoMutation.isPending}
                leftIcon={<CheckCircle2 className="h-5 w-5" />}
              >
                {isAuthenticated ? 'Активировать промокод' : 'Войти и активировать'}
              </Button>
            </form>
          </div>

          <div className="mt-6 border-t border-dh-border pt-4 flex items-center justify-between text-xs text-dh-textMuted">
            <span>Тестовый промокод из сидов БД:</span>
            <button
              type="button"
              onClick={() => {
                setPromoCode('DOTAHUB2026');
                setPromoError(null);
              }}
              className="rounded-md border border-dh-border bg-dh-bgSecondary px-2.5 py-1 font-mono font-semibold text-dh-lime hover:border-dh-lime/50 transition-colors"
            >
              DOTAHUB2026
            </button>
          </div>
        </div>
      </div>

      {/* Информационный блок правил */}
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-dh-lime shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs leading-relaxed text-dh-textMuted">
            <h3 className="text-sm font-bold text-dh-text">
              Правила начисления виртуальных бонусов
            </h3>
            <p>
              Все бонусные начисления зачисляются на виртуальный демобаланс пользователя и сразу
              отображаются в разделе «История операций» (/transactions). Один аккаунт может
              активировать каждый уникальный промокод только один раз. Повторные клики защищены
              ключами идемпотентности.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};