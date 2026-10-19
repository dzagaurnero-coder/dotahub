import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, isLoading, isAuthenticated, isAdmin, openAuthModal } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dh-border bg-dh-surface text-dh-lime">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-display text-xl font-bold text-dh-text">Требуется авторизация</h1>
        <p className="mt-2 text-sm text-dh-textMuted">
          Войдите в свой аккаунт DotaHub или создайте новый, чтобы управлять инвентарём, балансом и
          настройками профиля.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" onClick={() => openAuthModal('login')}>
            Войти в аккаунт
          </Button>
          <Button variant="outline" onClick={() => openAuthModal('register')}>
            Регистрация
          </Button>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dh-danger/40 bg-dh-danger/10 text-dh-danger">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="font-display text-xl font-bold text-dh-text">Доступ ограничен</h1>
        <p className="mt-2 text-sm text-dh-textMuted">
          Эта страница доступна только администраторам платформы с подтверждёнными сервером правами.
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button variant="outline">Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};