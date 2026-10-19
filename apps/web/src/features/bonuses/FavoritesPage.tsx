import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Layers } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CaseCard } from '@/components/cards/CaseCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export const FavoritesPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases', 'favorites'],
    queryFn: () => api.cases.listFavorites(),
    enabled: isAuthenticated,
  });

  const toggleMutation = useMutation({
    mutationFn: (caseId: string) => api.cases.toggleFavorite(caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.info('Список избранных кейсов обновлён');
    },
    onError: (err: Error) => {
      toast.error('Не удалось обновить избранное', err.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Heart className="h-10 w-10 text-dh-danger" />}
          title="Войдите, чтобы сохранять избранные кейсы"
          description="Авторизованные пользователи могут добавлять любимые кейсы Dota 2 в закладки для быстрого доступа с любого устройства."
          action={
            <Button variant="primary" onClick={() => openAuthModal('login')}>
              Войти в аккаунт
            </Button>
          }
        />
      </div>
    );
  }

  const favoriteCases = data?.cases ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-dh-lime">
            Персональная подборка
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Избранные кейсы
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Быстрый доступ к отмеченным вами кейсам DotaHub.
          </p>
        </div>
        <Link to="/cases">
          <Button variant="outline" size="sm" leftIcon={<Layers className="h-4 w-4" />}>
            Весь каталог кейсов
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Не удалось загрузить избранные кейсы"
          description="Проверьте подключение к серверу и попробуйте обновить страницу."
        />
      ) : favoriteCases.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-10 w-10 text-dh-textMuted" />}
          title="У вас пока нет избранных кейсов"
          description="Нажмите на иконку сердечка на карточке любого кейса в каталоге, чтобы добавить его сюда."
          action={
            <Link to="/cases">
              <Button variant="primary">Выбрать кейсы в каталоге</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {favoriteCases.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              caseData={{ ...caseItem, is_favorite: true }}
              onToggleFavorite={(caseId) => toggleMutation.mutate(caseId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};