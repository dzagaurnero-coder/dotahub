import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Box, Flame, Lock, Sparkles, UserCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { ItemCard } from '@/components/cards/ItemCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTimeRu, formatRub } from '@/lib/formatters';

export const PublicProfilePage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile', 'public', id],
    queryFn: () => api.profile.getPublicById(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Lock className="h-10 w-10 text-dh-indigo" />}
          title="Профиль скрыт или не найден"
          description="Пользователь ограничил публичный доступ к своей странице в настройках приватности или указан неверный идентификатор."
          action={
            <Link to="/">
              <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                На главную
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { profile } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Карточка игрока */}
      <div className="flex flex-col justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:flex-row sm:items-center shadow-dh-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dh-border bg-dh-bgSecondary font-display text-2xl font-extrabold text-dh-lime">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-dh-text">
                {profile.display_name}
              </h1>
              <Badge variant="indigo">
                <UserCheck className="h-3 w-3" />
                Участник DotaHub
              </Badge>
            </div>
            <p className="mt-1 text-xs text-dh-textMuted">
              На платформе с {formatDateTimeRu(profile.joined_at)}
            </p>
          </div>
        </div>

        <Link to="/cases">
          <Button variant="outline" size="sm" leftIcon={<Box className="h-4 w-4" />}>
            Каталог кейсов
          </Button>
        </Link>
      </div>

      {/* Статистика (если разрешена настройками приватности) */}
      {profile.stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5">
            <span className="flex items-center gap-1.5 text-xs text-dh-textMuted">
              <Box className="h-4 w-4 text-dh-lime" />
              Открыто кейсов
            </span>
            <p className="mt-1 font-mono text-2xl font-extrabold text-dh-text">
              {profile.stats.cases_opened_count}
            </p>
          </div>

          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5">
            <span className="flex items-center gap-1.5 text-xs text-dh-textMuted">
              <Flame className="h-4 w-4 text-dh-indigo" />
              Успешных апгрейдов
            </span>
            <p className="mt-1 font-mono text-2xl font-extrabold text-dh-text">
              {profile.stats.upgrader_wins_count} / {profile.stats.upgrader_attempts_count}
            </p>
          </div>

          <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-5">
            <span className="flex items-center gap-1.5 text-xs text-dh-textMuted">
              <Sparkles className="h-4 w-4 text-dh-success" />
              Лучший дроп игрока
            </span>
            <p className="mt-1 truncate text-sm font-bold text-dh-lime">
              {profile.stats.best_drop_item
                ? `${profile.stats.best_drop_item.localized_name} (${formatRub(profile.stats.best_drop_item.estimated_value_minor)})`
                : 'Пока нет открытий'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-dh border border-dh-border bg-dh-surface p-4 text-xs text-dh-textMuted">
          Игрок скрыл игровую статистику в настройках приватности.
        </div>
      )}

      {/* Витрина предметов инвентаря (если разрешена) */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-dh-text">
          Витрина инвентаря игрока
        </h2>

        {profile.recent_inventory === null ? (
          <EmptyState
            icon={<Lock className="h-8 w-8 text-dh-textMuted" />}
            title="Инвентарь скрыт владельцем профиля"
            description="Пользователь предпочёл оставить свою коллекцию предметов приватной."
          />
        ) : profile.recent_inventory.length === 0 ? (
          <EmptyState
            title="В публичном инвентаре пока нет предметов"
            description="Игрок ещё не открывал кейсы или обменял все предметы."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {profile.recent_inventory.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};