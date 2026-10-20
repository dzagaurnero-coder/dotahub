import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Box,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import {
  CASE_CATEGORIES,
  CASE_CATEGORY_LABELS_RU,
  getRarityMeta,
  ITEM_TYPE_LABELS_RU,
  type CaseCategory,
  type KnownItemType,
} from '@dotahub/shared';
import { api, ApiClientError } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SafeImage } from '@/components/ui/SafeImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  cn,
  formatDateTimeRu,
  formatRub,
  generateIdempotencyKey,
  rubToMinorUnits,
} from '@/lib/formatters';

type AdminTab = 'stats' | 'cases' | 'promos' | 'items';

interface PromoRecordItem {
  id: string;
  code: string;
  reward_amount_minor: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const INITIAL_PROMO_LIST: PromoRecordItem[] = [
  {
    id: 'seed-promo-dotahub2026',
    code: 'DOTAHUB2026',
    reward_amount_minor: 50000,
    max_uses: 1000,
    current_uses: 1,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const REWARD_PRESETS_RUB = [250, 500, 1000, 2500, 5000] as const;

export const AdminPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  // Состояние вкладки кейсов и модального инспектора пула
  const [caseSearch, setCaseSearch] = useState('');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState<string>('all');
  const [inspectedCaseSlug, setInspectedCaseSlug] = useState<string | null>(null);

  // Состояние вкладки промокодов
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoRewardRub, setPromoRewardRub] = useState('500');
  const [promoMaxUses, setPromoMaxUses] = useState('100');
  const [promoFormError, setPromoFormError] = useState<string | null>(null);
  const [createdPromos, setCreatedPromos] = useState<PromoRecordItem[]>(INITIAL_PROMO_LIST);

  // Состояние вкладки аудита предметов
  const [itemSearch, setItemSearch] = useState('');

  // 1. Запрос системной статистики
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.getStats(),
  });

  // 2. Запрос полного списка кейсов для управления и мониторинга ленты открытий
  const { data: casesData, isLoading: isCasesLoading } = useQuery({
    queryKey: ['cases', 'admin-list'],
    queryFn: () => api.cases.list({ sort: 'featured' }),
  });

  // 3. Детальный запрос кейса для модального окна проверки пула вероятностей
  const { data: inspectedCaseData, isLoading: isInspectedCaseLoading } = useQuery({
    queryKey: ['cases', 'detail', inspectedCaseSlug],
    queryFn: () => api.cases.getBySlug(inspectedCaseSlug || ''),
    enabled: Boolean(inspectedCaseSlug),
  });

  // 4. Запрос каталога предметов для вкладки аудита косметики
  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['items', 'admin-audit', itemSearch],
    queryFn: () =>
      api.items.list({
        search: itemSearch.trim() || undefined,
        sort: 'price_desc',
        page: 1,
        pageSize: 18,
      }),
    enabled: activeTab === 'items',
  });

  // Мутация создания нового промокода
  const createPromoMutation = useMutation({
    mutationFn: (payload: {
      code: string;
      rewardAmountMinor: number;
      maxUses: number | null;
    }) =>
      api.admin.createPromo({
        code: payload.code,
        rewardAmountMinor: payload.rewardAmountMinor,
        maxUses: payload.maxUses,
        idempotencyKey: generateIdempotencyKey('admin_promo'),
      }),
    onSuccess: (res) => {
      const created = res.promo;
      setCreatedPromos((prev) => [
        {
          id: created.id || `promo-${Date.now()}`,
          code: created.code,
          reward_amount_minor: created.reward_amount_minor,
          max_uses: created.max_uses ?? null,
          current_uses: created.current_uses ?? 0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        ...prev.filter((p) => p.code !== created.code),
      ]);
      setPromoCodeInput('');
      setPromoFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(
        'Промокод создан',
        `Код ${created.code} на сумму ${formatRub(created.reward_amount_minor)} активирован в системе.`
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Не удалось создать промокод.';
      setPromoFormError(msg);
      toast.error('Ошибка создания промокода', msg);
    },
  });

  const handleCreatePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoFormError(null);

    const normalizedCode = promoCodeInput.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedCode)) {
      setPromoFormError(
        'Код должен содержать от 3 до 32 символов (заглавные латинские буквы, цифры, _ или -).'
      );
      return;
    }

    const rewardNum = Number(promoRewardRub);
    if (Number.isNaN(rewardNum) || rewardNum < 10 || rewardNum > 100000) {
      setPromoFormError('Сумма награды должна быть от 10 ₽ до 100 000 ₽.');
      return;
    }

    const maxUsesNum = promoMaxUses.trim() ? Number(promoMaxUses) : null;
    if (maxUsesNum !== null && (Number.isNaN(maxUsesNum) || maxUsesNum < 1)) {
      setPromoFormError('Лимит активаций должен быть положительным целым числом.');
      return;
    }

    createPromoMutation.mutate({
      code: normalizedCode,
      rewardAmountMinor: rubToMinorUnits(rewardNum),
      maxUses: maxUsesNum ? Math.floor(maxUsesNum) : null,
    });
  };

  const handleGenerateRandomCode = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    setPromoCodeInput(`DH_${randomSuffix}`);
    setPromoFormError(null);
  };

  const handleCopyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.info('Промокод скопирован', `Код ${code} скопирован в буфер обмена.`);
    } catch {
      toast.info('Код промокода', code);
    }
  };

  const allCases = casesData?.cases ?? [];
  const recentOpenings = casesData?.recentOpenings ?? [];

  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      const matchesCategory =
        caseCategoryFilter === 'all' || c.category === caseCategoryFilter;
      const q = caseSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allCases, caseCategoryFilter, caseSearch]);

  const categorySelectOptions = useMemo<SelectOption[]>(() => {
    return [
      { value: 'all', label: 'Все категории кейсов' },
      ...CASE_CATEGORIES.map((cat) => ({
        value: cat,
        label: CASE_CATEGORY_LABELS_RU[cat as CaseCategory],
      })),
    ];
  }, []);

  const stats = statsData?.stats;
  const totalUsersCount = stats?.total_users_count ?? 0;
  const totalCasesOpened = stats?.total_cases_opened ?? 0;
  const totalUpgraderAttempts = stats?.total_upgrader_attempts ?? 0;
  const totalDepositsMinor = stats?.total_deposits_minor ?? 0;

  const inspectedCase = inspectedCaseData?.caseData;
  const inspectedPoolTotalChance = useMemo(() => {
    if (!inspectedCase?.pool) return 0;
    return inspectedCase.pool.reduce((acc, item) => acc + item.chance_percent, 0);
  }, [inspectedCase]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка административной панели */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dh-indigo/40 bg-dh-indigo/15 text-dh-indigo shadow-dh-card">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-dh-indigo">
                Панель управления системой
              </span>
              <Badge variant="success">RBAC: Admin</Badge>
            </div>
            <h1 className="mt-0.5 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
              Административный контур DotaHub
            </h1>
          </div>
        </div>

        {/* Переключатель разделов админ-панели */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'stats', label: 'Аналитика', icon: BarChart3 },
              { id: 'cases', label: `Кейсы (${allCases.length})`, icon: Box },
              { id: 'promos', label: 'Промокоды', icon: Ticket },
              { id: 'items', label: 'Каталог Dota 2', icon: Sparkles },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-dh px-3.5 py-2 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-dh-lime text-dh-bg font-bold shadow-dh-lime'
                    : 'border border-dh-border bg-dh-surface text-dh-textMuted hover:text-dh-text'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ВКЛАДКА 1: АНАЛИТИКА И МОНИТОРИНГ */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-dh-text">
                Ключевые показатели платформы
              </h2>
              <p className="text-xs text-dh-textMuted">
                Агрегированные данные из PostgreSQL по пользователям, кейсам, Upgrader и демобалансу
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={isStatsFetching}
              onClick={() => void refetchStats()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Обновить метрики
            </Button>
          </div>

          {isStatsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-dh-textMuted">
                  <Users className="h-4 w-4 text-dh-lime" />
                  Всего пользователей
                </span>
                <p className="font-mono text-3xl font-extrabold text-dh-text">
                  {totalUsersCount.toLocaleString('ru-RU')}
                </p>
                <p className="text-[11px] text-dh-textMuted">
                  Активных учётных записей в БД
                </p>
              </div>

              <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-dh-textMuted">
                  <Box className="h-4 w-4 text-dh-indigo" />
                  Открыто кейсов
                </span>
                <p className="font-mono text-3xl font-extrabold text-dh-text">
                  {totalCasesOpened.toLocaleString('ru-RU')}
                </p>
                <p className="text-[11px] text-dh-textMuted">
                  Транзакций с проверкой HMAC-SHA256
                </p>
              </div>

              <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-dh-textMuted">
                  <Zap className="h-4 w-4 text-dh-success" />
                  Попыток в Upgrader
                </span>
                <p className="font-mono text-3xl font-extrabold text-dh-text">
                  {totalUpgraderAttempts.toLocaleString('ru-RU')}
                </p>
                <p className="text-[11px] text-dh-textMuted">
                  Атомарных расчётов апгрейда (1%–85%)
                </p>
              </div>

              <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-dh-textMuted">
                  <ShieldCheck className="h-4 w-4 text-dh-lime" />
                  Оборот демопополнений
                </span>
                <p className="font-mono text-3xl font-extrabold text-dh-lime">
                  {formatRub(totalDepositsMinor)}
                </p>
                <p className="text-[11px] text-dh-textMuted">
                  Суммарно начислено в демоконтуре
                </p>
              </div>
            </div>
          )}

          {/* Статус защитных подсистем и живой эфир открытий */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-4 lg:col-span-5">
              <h3 className="font-display text-base font-bold text-dh-text">
                Состояние узлов безопасности
              </h3>
              <div className="space-y-3">
                {[
                  {
                    title: 'Генератор Provably Fair (HMAC-SHA256)',
                    desc: 'Серверный расчёт ServerSeed + ClientSeed + Nonce',
                    status: 'Активен',
                  },
                  {
                    title: 'Контроль идемпотентности (Idempotency-Key)',
                    desc: 'Защита от двойных списаний и гонок запросов',
                    status: 'Активен',
                  },
                  {
                    title: 'Финансовая математика (Minor Units)',
                    desc: 'Все балансы и цены хранятся в целых копейках',
                    status: 'Проверено',
                  },
                  {
                    title: 'Сессионная защита (Argon2id + HTTP-only)',
                    desc: 'Токены защищены от чтения через XSS',
                    status: 'Активен',
                  },
                ].map((node) => (
                  <div
                    key={node.title}
                    className="flex items-center justify-between gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-dh-text">{node.title}</p>
                      <p className="text-[11px] text-dh-textMuted">{node.desc}</p>
                    </div>
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      {node.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-4 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-dh-text">
                    Последние открытия кейсов на платформе
                  </h3>
                  <p className="text-xs text-dh-textMuted">
                    Оперативный мониторинг выпавших предметов в реальном времени
                  </p>
                </div>
                <Badge variant="neutral">{recentOpenings.length} записей</Badge>
              </div>

              {recentOpenings.length === 0 ? (
                <EmptyState
                  title="Открытий пока не зафиксировано"
                  description="Как только игроки откроют первые кейсы, записи появятся в журнале мониторинга."
                />
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {recentOpenings.map((entry) => {
                    const rarityMeta = getRarityMeta(entry.item_rarity);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SafeImage
                            src={entry.item_image_url}
                            alt={entry.item_name}
                            className="h-10 w-14 shrink-0 object-contain"
                          />
                          <div className="min-w-0">
                            <p
                              className="truncate text-xs font-bold"
                              style={{ color: rarityMeta.colorHex }}
                            >
                              {entry.item_name}
                            </p>
                            <p className="truncate text-[11px] text-dh-textMuted">
                              Игрок: <strong className="text-dh-text">{entry.user_display_name}</strong> • Кейс: {entry.case_name}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block font-mono text-xs font-bold text-dh-lime">
                            {formatRub(entry.price_minor)}
                          </span>
                          <span className="block text-[10px] text-dh-textMuted">
                            {formatDateTimeRu(entry.opened_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 2: УПРАВЛЕНИЕ КЕЙСАМИ И АУДИТ ПУЛОВ */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs">
              <Input
                label="Поиск кейса по названию или slug"
                placeholder="Immortal, Arcana, pudge..."
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="w-full sm:w-64">
              <Select
                label="Фильтр категории"
                value={caseCategoryFilter}
                onChange={(e) => setCaseCategoryFilter(e.target.value)}
                options={categorySelectOptions}
              />
            </div>
          </div>

          {isCasesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <EmptyState
              title="Кейсы по заданному фильтру не найдены"
              description="Попробуйте сбросить строку поиска или выбрать другую категорию."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCases.map((caseItem) => {
                const categoryLabel =
                  CASE_CATEGORY_LABELS_RU[caseItem.category] ?? caseItem.category;
                return (
                  <div
                    key={caseItem.id}
                    className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-4 sm:flex-row sm:items-center shadow-2xs"
                  >
                    <div className="flex items-center gap-4">
                      <SafeImage
                        src={caseItem.image_url}
                        alt={caseItem.name}
                        className="h-14 w-14 shrink-0 object-contain"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-dh-text">
                            {caseItem.name}
                          </h3>
                          <Badge variant={caseItem.is_featured ? 'indigo' : 'category'}>
                            {categoryLabel}
                          </Badge>
                          {caseItem.is_featured && (
                            <Badge variant="success">Featured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-dh-textMuted font-mono">
                          slug: /cases/{caseItem.slug} • Предметов в пуле: {caseItem.items_count} шт.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dh-border/70 pt-3 sm:border-0 sm:pt-0">
                      <div className="sm:text-right mr-2">
                        <span className="block text-[10px] uppercase text-dh-textMuted">
                          Цена открытия
                        </span>
                        <span className="font-mono text-sm font-extrabold text-dh-lime">
                          {formatRub(caseItem.price_minor)}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectedCaseSlug(caseItem.slug)}
                        leftIcon={<Eye className="h-3.5 w-3.5 text-dh-lime" />}
                      >
                        Инспекция пула (100%)
                      </Button>

                      <Link to={`/cases/${caseItem.slug}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                          Открыть
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ВКЛАДКА 3: УПРАВЛЕНИЕ ПРОМОКОДАМИ */}
      {activeTab === 'promos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Левая колонка: Форма создания промокода */}
          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-5 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-dh-border pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-dh-text">
                  Выпуск нового промокода
                </h2>
                <p className="text-xs text-dh-textMuted">
                  Мгновенная регистрация кода в базе данных PostgreSQL
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateRandomCode}
                className="rounded-lg border border-dh-border bg-dh-bgSecondary px-2.5 py-1 text-[11px] font-semibold text-dh-lime hover:border-dh-lime/50 transition-colors"
              >
                Сгенерировать код
              </button>
            </div>

            {promoFormError && (
              <div
                role="alert"
                className="rounded-dh border border-dh-danger/40 bg-dh-danger/10 p-3 text-xs font-medium text-dh-danger"
              >
                {promoFormError}
              </div>
            )}

            <form onSubmit={handleCreatePromoSubmit} className="space-y-4" noValidate>
              <Input
                label="Код промокода (A-Z, 0-9, _, -)"
                placeholder="Например: INTERNATIONAL2026"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                maxLength={32}
                required
              />

              <div className="space-y-2">
                <Input
                  label="Сумма бонуса (₽)"
                  type="number"
                  min="10"
                  max="100000"
                  value={promoRewardRub}
                  onChange={(e) => setPromoRewardRub(e.target.value)}
                  required
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {REWARD_PRESETS_RUB.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPromoRewardRub(String(preset))}
                      className={cn(
                        'rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors',
                        Number(promoRewardRub) === preset
                          ? 'border-dh-lime bg-dh-lime/15 text-dh-lime'
                          : 'border-dh-border bg-dh-bgSecondary text-dh-textMuted hover:text-dh-text'
                      )}
                    >
                      +{preset} ₽
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Лимит активаций (оставьте пустым для безлимитного)"
                type="number"
                min="1"
                placeholder="100"
                value={promoMaxUses}
                onChange={(e) => setPromoMaxUses(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={createPromoMutation.isPending}
                leftIcon={<PlusCircle className="h-4 w-4" />}
              >
                Создать и активировать промокод
              </Button>
            </form>
          </div>

          {/* Правая колонка: Реестр выпущенных промокодов */}
          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 shadow-dh-card space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-dh-border pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-dh-text">
                  Реестр промокодов платформы
                </h2>
                <p className="text-xs text-dh-textMuted">
                  Нажмите на код, чтобы скопировать и протестировать его на странице «Бонусы»
                </p>
              </div>
              <Badge variant="indigo">{createdPromos.length} активных</Badge>
            </div>

            <div className="space-y-3">
              {createdPromos.map((promo) => (
                <div
                  key={promo.id}
                  className="flex flex-col justify-between gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => void handleCopyPromoCode(promo.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dh-lime/40 bg-dh-surface px-3 py-1 font-mono text-xs font-extrabold text-dh-lime hover:bg-dh-surfaceElevated transition-colors"
                      >
                        <span>{promo.code}</span>
                        <Copy className="h-3 w-3" />
                      </button>
                      <Badge variant="success">Активен</Badge>
                    </div>
                    <p className="text-[11px] text-dh-textMuted">
                      Лимит использований:{' '}
                      <strong className="font-mono text-dh-text">
                        {promo.max_uses ? `${promo.current_uses} / ${promo.max_uses}` : 'Без лимита'}
                      </strong>{' '}
                      • Создан: {formatDateTimeRu(promo.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="block text-[10px] uppercase text-dh-textMuted">
                        Награда
                      </span>
                      <span className="font-mono text-base font-extrabold text-dh-lime">
                        +{formatRub(promo.reward_amount_minor)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 4: АУДИТ КАТАЛОГА ПРЕДМЕТОВ DOTA 2 */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-5 shadow-dh-card sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-md">
              <Input
                label="Быстрый поиск предмета в БД"
                placeholder="Dragonclaw Hook, Arcana, Pudge..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="neutral" className="font-mono">
                В каталоге: {itemsData?.total ?? 0} шт.
              </Badge>
              <Link to="/items">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  Витрина каталога
                </Button>
              </Link>
            </div>
          </div>

          {isItemsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (itemsData?.items ?? []).length === 0 ? (
            <EmptyState
              title="Предметы не найдены"
              description="Измените поисковый запрос или выполните идемпотентный импорт каталога (npm run import)."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(itemsData?.items ?? []).map((item) => {
                const rarityMeta = getRarityMeta(item.rarity);
                const slotLabel =
                  ITEM_TYPE_LABELS_RU[item.item_type as KnownItemType] ||
                  item.item_type ||
                  'Предмет';
                return (
                  <Link
                    key={item.id}
                    to={`/items/${item.slug}`}
                    className="flex items-center gap-3.5 rounded-dh border border-dh-border bg-dh-surface p-3.5 transition-colors hover:border-dh-lime/50"
                  >
                    <SafeImage
                      src={item.image_url}
                      alt={item.localized_name}
                      className="h-14 w-20 shrink-0 rounded bg-dh-bgSecondary p-1 object-contain"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="rarity" rarityCode={item.rarity}>
                          {rarityMeta.labelRu}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-dh-lime">
                          {formatRub(item.estimated_value_minor)}
                        </span>
                      </div>
                      <h4 className="truncate text-xs font-bold text-dh-text">
                        {item.localized_name}
                      </h4>
                      <p className="truncate text-[11px] text-dh-textMuted">
                        {item.hero_name || 'Общий предмет'} • {slotLabel}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно инспекции пула предметов кейса */}
      <Modal
        isOpen={Boolean(inspectedCaseSlug)}
        onClose={() => setInspectedCaseSlug(null)}
        title={
          inspectedCase
            ? `Инспекция пула: ${inspectedCase.name}`
            : 'Загрузка состава кейса...'
        }
        description="Проверка весов предметов и контрольной суммы вероятностей (100.00%)"
        maxWidthClass="max-w-2xl"
      >
        {isInspectedCaseLoading || !inspectedCase ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-dh border border-dh-border bg-dh-bgSecondary p-3.5 text-xs">
              <span className="flex items-center gap-1.5 text-dh-textMuted">
                <Layers className="h-4 w-4 text-dh-lime" />
                Предметов в пуле: <strong className="text-dh-text">{inspectedCase.pool.length}</strong>
              </span>
              <span className="font-mono font-bold text-dh-success">
                Контрольная сумма: {inspectedPoolTotalChance.toFixed(2)}%
              </span>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {inspectedCase.pool.map((entry) => {
                const rarityMeta = getRarityMeta(entry.item.rarity);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeImage
                        src={entry.item.image_url}
                        alt={entry.item.localized_name}
                        className="h-9 w-12 shrink-0 object-contain"
                      />
                      <div className="min-w-0">
                        <p
                          className="truncate text-xs font-bold"
                          style={{ color: rarityMeta.colorHex }}
                        >
                          {entry.item.localized_name}
                        </p>
                        <p className="text-[11px] text-dh-textMuted">
                          {rarityMeta.labelRu} • Оценка: {formatRub(entry.item.estimated_value_minor)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className="block text-xs font-extrabold text-dh-lime">
                        {entry.chance_percent.toFixed(2)}%
                      </span>
                      <span className="block text-[10px] text-dh-textMuted">
                        Вес: {entry.weight}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link to={`/cases/${inspectedCase.slug}`}>
                <Button variant="secondary" size="sm">
                  Перейти на страницу кейса
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectedCaseSlug(null)}
              >
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};