import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Backpack,
  CheckCircle2,
  Flame,
  Heart,
  Layers,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  CASE_CATEGORY_LABELS_RU,
  getRarityMeta,
  type CaseOpeningResultDto,
  type DotaItemDto,
} from '@dotahub/shared';
import { api, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CaseRoulette } from '@/features/cases/CaseRoulette';
import { ItemCard } from '@/components/cards/ItemCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  cn,
  formatDateTimeRu,
  formatRub,
  generateIdempotencyKey,
} from '@/lib/formatters';

export const CaseDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, openAuthModal, syncDemoBalance } = useAuth();
  const toast = useToast();

  const [fastOpen, setFastOpen] = useState(false);
  const [clientSeed, setClientSeed] = useState(() =>
    Math.random().toString(36).slice(2, 14)
  );
  const [showFairnessConfig, setShowFairnessConfig] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingResult, setPendingResult] = useState<CaseOpeningResultDto | null>(null);
  const [revealedResult, setRevealedResult] = useState<CaseOpeningResultDto | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases', 'detail', slug],
    queryFn: () => api.cases.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const caseData = data?.caseData;

  const poolItems = useMemo<DotaItemDto[]>(() => {
    if (!caseData?.pool) return [];
    return caseData.pool.map((entry) => entry.item);
  }, [caseData]);

  const totalChancePercent = useMemo<number>(() => {
    if (!caseData?.pool) return 0;
    return caseData.pool.reduce((acc, entry) => acc + entry.chance_percent, 0);
  }, [caseData]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: (caseId: string) => api.cases.toggleFavorite(caseId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.info(
        res.isFavorite ? 'Кейс добавлен в избранное' : 'Кейс удалён из избранного'
      );
    },
    onError: (err: Error) => {
      toast.error('Не удалось обновить избранное', err.message);
    },
  });

  const openCaseMutation = useMutation({
    mutationFn: () =>
      api.cases.open(slug, {
        idempotencyKey: generateIdempotencyKey('open_case'),
        clientSeed: clientSeed.trim() || undefined,
        fastOpen,
      }),
    onSuccess: (res) => {
      const openingResult = res.result;
      syncDemoBalance(openingResult.updated_demo_balance_minor);

      if (fastOpen) {
        setPendingResult(null);
        setIsSpinning(false);
        setRevealedResult(openingResult);
        void queryClient.invalidateQueries({ queryKey: ['cases', 'detail', slug] });
        void queryClient.invalidateQueries({ queryKey: ['inventory'] });
        void queryClient.invalidateQueries({ queryKey: ['balance'] });
      } else {
        setRevealedResult(null);
        setPendingResult(openingResult);
        setIsSpinning(true);
      }
    },
    onError: (err: unknown) => {
      setIsSpinning(false);
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Не удалось выполнить открытие кейса.';
      toast.error('Ошибка открытия кейса', message);
    },
  });

  const handleSpinComplete = () => {
    setIsSpinning(false);
    if (pendingResult) {
      setRevealedResult(pendingResult);
      void queryClient.invalidateQueries({ queryKey: ['cases', 'detail', slug] });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['balance'] });
    }
  };

  const handleOpenClick = () => {
    if (!caseData || isSpinning || openCaseMutation.isPending) return;

    if (!isAuthenticated || !user) {
      openAuthModal('login');
      return;
    }

    if (user.demo_balance_minor < caseData.price_minor) {
      toast.warning(
        'Недостаточно средств на демобалансе',
        `Для открытия требуется ${formatRub(caseData.price_minor)}. Пополните виртуальный баланс или активируйте бонус.`
      );
      return;
    }

    openCaseMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Кейс не найден или временно отключён"
          description="Проверьте адрес страницы или выберите другую коллекцию в каталоге DotaHub."
          action={
            <Link to="/cases">
              <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Вернуться в каталог кейсов
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const categoryLabel =
    CASE_CATEGORY_LABELS_RU[caseData.category] ?? caseData.category;
  const hasEnoughBalance =
    isAuthenticated && user ? user.demo_balance_minor >= caseData.price_minor : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Верхняя навигация и заголовок кейса */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/cases"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dh-border bg-dh-surface px-3 py-1.5 text-xs font-semibold text-dh-textMuted hover:text-dh-text transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Каталог кейсов</span>
            </Link>
            <Badge variant={caseData.is_featured ? 'indigo' : 'category'}>
              {caseData.is_featured && <Sparkles className="h-3 w-3 text-dh-indigo" />}
              {categoryLabel}
            </Badge>
            <Badge variant="neutral">
              <Layers className="h-3 w-3 text-dh-lime" />
              Предметов в пуле: {caseData.pool.length}
            </Badge>
          </div>

          <h1 className="font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            {caseData.name}
          </h1>
          {caseData.description && (
            <p className="max-w-2xl text-xs leading-relaxed text-dh-textMuted sm:text-sm">
              {caseData.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              toggleFavoriteMutation.mutate(caseData.id);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-dh border px-3.5 py-2 text-xs font-semibold transition-colors',
              caseData.is_favorite
                ? 'border-dh-danger/40 bg-dh-danger/15 text-dh-danger'
                : 'border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
            )}
          >
            <Heart className={cn('h-4 w-4', caseData.is_favorite && 'fill-current')} />
            <span>{caseData.is_favorite ? 'В избранном' : 'В избранное'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFairnessConfig((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-2 rounded-dh border px-3.5 py-2 text-xs font-semibold transition-colors',
              showFairnessConfig
                ? 'border-dh-lime bg-dh-surfaceElevated text-dh-lime'
                : 'border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
            )}
          >
            <ShieldCheck className="h-4 w-4 text-dh-lime" />
            <span>Provably Fair</span>
          </button>
        </div>
      </div>

      {/* Панель настройки Client Seed для Provably Fair */}
      {showFairnessConfig && (
        <div className="rounded-dh-lg border border-dh-lime/30 bg-dh-surface p-5 shadow-dh-card space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-dh-text flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-dh-lime" />
                Криптографическая проверка честности (HMAC-SHA256)
              </h2>
              <p className="mt-0.5 text-xs text-dh-textMuted">
                Вы можете задать собственный клиентский сид (Client Seed) перед открытием. Результат
                вычисляется на сервере по формуле HMAC-SHA256(ServerSeed, ClientSeed:Nonce).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientSeed(Math.random().toString(36).slice(2, 14))}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Сгенерировать новый сид
            </Button>
          </div>

          <div className="max-w-md">
            <Input
              label="Ваш Client Seed"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Введите произвольную строку (до 64 символов)"
              maxLength={64}
            />
          </div>
        </div>
      )}

      {/* Секция рулетки и управления открытием */}
      <section className="space-y-5">
        <CaseRoulette
          pool={poolItems}
          winningItem={pendingResult?.won_item ?? revealedResult?.won_item ?? null}
          isSpinning={isSpinning}
          onSpinComplete={handleSpinComplete}
        />

        {/* Панель кнопки открытия и переключателя быстрого режима */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card sm:flex-row">
          <div className="flex items-center gap-4">
            <SafeImage
              src={caseData.image_url}
              alt={caseData.name}
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div>
              <span className="block text-xs text-dh-textMuted">Стоимость открытия</span>
              <span className="font-mono text-2xl font-extrabold text-dh-lime">
                {formatRub(caseData.price_minor)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
            {/* Переключатель быстрого открытия */}
            <button
              type="button"
              disabled={isSpinning || openCaseMutation.isPending}
              onClick={() => setFastOpen((prev) => !prev)}
              className={cn(
                'inline-flex h-12 items-center gap-2 rounded-dh border px-4 text-xs font-semibold transition-colors disabled:opacity-50',
                fastOpen
                  ? 'border-dh-indigo bg-dh-indigo/15 text-dh-indigo'
                  : 'border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
              )}
            >
              <Zap className="h-4 w-4" />
              <span>Быстрое открытие: {fastOpen ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>

            {!isAuthenticated ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => openAuthModal('login')}
                leftIcon={<Lock className="h-4 w-4" />}
              >
                Войти и открыть за {formatRub(caseData.price_minor)}
              </Button>
            ) : hasEnoughBalance ? (
              <Button
                variant="primary"
                size="lg"
                isLoading={openCaseMutation.isPending || isSpinning}
                onClick={handleOpenClick}
                leftIcon={<Sparkles className="h-5 w-5" />}
              >
                {isSpinning
                  ? 'Открываем кейс...'
                  : `Открыть за ${formatRub(caseData.price_minor)}`}
              </Button>
            ) : (
              <Link to="/balance">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Wallet className="h-5 w-5" />}
                >
                  Пополнить демобаланс ({formatRub(caseData.price_minor)})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Содержимое кейса (Пул предметов с точными вероятностями) */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-2 border-b border-dh-border pb-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-xl font-extrabold text-dh-text">
              Содержимое кейса и вероятности выпадения
            </h2>
            <p className="text-xs text-dh-textMuted">
              Каждый предмет имеет фиксированный вес и прозрачный шанс получения
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-dh-border bg-dh-surface px-3 py-1.5 text-xs font-mono text-dh-textMuted">
            <CheckCircle2 className="h-3.5 w-3.5 text-dh-success" />
            <span>Сумма вероятностей пула: {totalChancePercent.toFixed(2)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {caseData.pool.map((entry) => (
            <ItemCard
              key={entry.id}
              item={entry.item}
              dropChancePercent={entry.chance_percent}
            />
          ))}
        </div>
      </section>

      {/* Последние открытия этого кейса */}
      {caseData.recent_openings && caseData.recent_openings.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-dh-text">
            Недавние выигрыши в этом кейсе
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {caseData.recent_openings.slice(0, 8).map((opening) => {
              const rarityMeta = getRarityMeta(opening.item_rarity);
              return (
                <div
                  key={opening.id}
                  className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-surface p-3"
                >
                  <SafeImage
                    src={opening.item_image_url}
                    alt={opening.item_name}
                    className="h-12 w-16 shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-bold"
                      style={{ color: rarityMeta.colorHex }}
                    >
                      {opening.item_name}
                    </p>
                    <p className="truncate text-[11px] text-dh-textMuted">
                      Игрок: {opening.user_display_name}
                    </p>
                    <p className="text-[10px] text-dh-textMuted">
                      {formatDateTimeRu(opening.opened_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Модальное окно результата открытия кейса */}
      <Modal
        isOpen={Boolean(revealedResult)}
        onClose={() => setRevealedResult(null)}
        title="Предмет получен!"
        description="Предмет автоматически добавлен в ваш виртуальный инвентарь"
        maxWidthClass="max-w-lg"
      >
        {revealedResult && (
          <div className="space-y-5">
            <div className="flex flex-col items-center rounded-dh-lg border border-dh-border bg-dh-bgSecondary p-6 text-center">
              <Badge
                variant="rarity"
                rarityCode={revealedResult.won_item.rarity}
                dot
                className="mb-3"
              >
                {getRarityMeta(revealedResult.won_item.rarity).labelRu}
              </Badge>

              <SafeImage
                src={revealedResult.won_item.image_url}
                alt={revealedResult.won_item.localized_name}
                className="my-2 h-32 w-44 object-contain drop-shadow-md"
              />

              <h3 className="mt-2 font-display text-lg font-extrabold text-dh-text">
                {revealedResult.won_item.localized_name}
              </h3>
              <p className="text-xs text-dh-textMuted">
                {revealedResult.won_item.hero_name || 'Универсальный предмет Dota 2'}
              </p>

              <div className="mt-3 rounded-lg border border-dh-border bg-dh-surface px-4 py-1.5 font-mono text-sm font-bold text-dh-lime">
                Оценка: {formatRub(revealedResult.won_item.estimated_value_minor)}
              </div>
            </div>

            {/* Криптографический блок Provably Fair */}
            <div className="rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5 text-[11px] space-y-1.5 font-mono text-dh-textMuted">
              <div className="flex items-center justify-between text-dh-text font-sans font-semibold text-xs pb-1 border-b border-dh-border">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-dh-lime" />
                  Данные проверки Provably Fair
                </span>
                <span className="font-mono text-[11px] text-dh-lime">
                  Roll: {(revealedResult.provably_fair.roll_basis_points / 100).toFixed(2)}%
                </span>
              </div>
              <p className="truncate">
                <span className="text-dh-text">Server Hash:</span>{' '}
                {revealedResult.provably_fair.server_seed_hash}
              </p>
              <p className="truncate">
                <span className="text-dh-text">Server Seed:</span>{' '}
                {revealedResult.provably_fair.server_seed_revealed}
              </p>
              <p className="truncate">
                <span className="text-dh-text">Client Seed:</span>{' '}
                {revealedResult.provably_fair.client_seed} (Nonce:{' '}
                {revealedResult.provably_fair.nonce})
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Button
                variant="primary"
                onClick={() => {
                  setRevealedResult(null);
                }}
              >
                Открыть ещё раз
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const invId = revealedResult.inventory_item_id;
                  setRevealedResult(null);
                  navigate(`/upgrader?source=${encodeURIComponent(invId)}`);
                }}
                leftIcon={<Flame className="h-4 w-4" />}
              >
                В Апгрейдер
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRevealedResult(null);
                  navigate('/inventory');
                }}
                leftIcon={<Backpack className="h-4 w-4" />}
              >
                Инвентарь
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};