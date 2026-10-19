import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Backpack,
  ExternalLink,
  Eye,
  History,
  Link2,
  LogOut,
  Save,
  Shield,
  User,
  Wallet,
} from 'lucide-react';
import { updateProfileSchema, type UpdateProfileInput } from '@dotahub/shared';
import { api, ApiClientError } from '@/lib/api-client';
import { AUTH_QUERY_KEY, useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn, formatDateTimeRu, formatRub } from '@/lib/formatters';

export const ProfilePage: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [steamTradeUrl, setSteamTradeUrl] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showPublicInventory, setShowPublicInventory] = useState(true);
  const [showPublicStats, setShowPublicStats] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setAvatarUrl(user.avatar_url ?? '');
      setSteamTradeUrl(user.steam_trade_url ?? '');
      setIsPublicProfile(user.is_public_profile);
      setShowPublicInventory(user.show_public_inventory);
      setShowPublicStats(user.show_public_stats);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfileInput) => api.profile.updateMe(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, (prev: unknown) => {
        if (!prev || typeof prev !== 'object') return prev;
        return { ...(prev as Record<string, unknown>), user: res.user };
      });
      toast.success('Профиль обновлён', 'Ваши настройки успешно сохранены.');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError ? err.message : 'Не удалось сохранить настройки профиля.';
      toast.error('Ошибка сохранения', msg);
    },
  });

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = updateProfileSchema.safeParse({
      display_name: displayName.trim(),
      avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
      steam_trade_url: steamTradeUrl.trim() ? steamTradeUrl.trim() : null,
      is_public_profile: isPublicProfile,
      show_public_inventory: showPublicInventory,
      show_public_stats: showPublicStats,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    updateMutation.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Шапка личного кабинета */}
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dh-border bg-dh-surface font-display text-2xl font-extrabold text-dh-lime">
            {user.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-dh-text">
                {user.display_name}
              </h1>
              <Badge variant={isAdmin ? 'indigo' : 'neutral'}>
                {isAdmin ? 'Администратор' : 'Игрок'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-dh-textMuted">
              @{user.username} • {user.email} • Регистрация: {formatDateTimeRu(user.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to={`/profile/${user.id}`}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-4 w-4 text-dh-indigo" />}
            >
              Публичный профиль
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void logout()}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Выйти
          </Button>
        </div>
      </div>

      {/* Быстрые карточки аккаунта */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-5">
          <div>
            <span className="text-xs text-dh-textMuted">Виртуальный демобаланс</span>
            <p className="mt-1 font-mono text-xl font-extrabold text-dh-lime">
              {formatRub(user.demo_balance_minor)}
            </p>
          </div>
          <Link to="/balance">
            <Button variant="primary" size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
              Пополнить
            </Button>
          </Link>
        </div>

        <Link
          to="/inventory"
          className="flex items-center justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-5 transition-colors hover:border-dh-lime/50"
        >
          <div>
            <span className="text-xs text-dh-textMuted">Коллекция предметов</span>
            <p className="mt-1 font-display text-base font-bold text-dh-text">
              Открыть инвентарь →
            </p>
          </div>
          <Backpack className="h-6 w-6 text-dh-indigo" />
        </Link>

        <Link
          to="/transactions"
          className="flex items-center justify-between rounded-dh-lg border border-dh-border bg-dh-surface p-5 transition-colors hover:border-dh-lime/50"
        >
          <div>
            <span className="text-xs text-dh-textMuted">Финансовый журнал</span>
            <p className="mt-1 font-display text-base font-bold text-dh-text">
              История операций →
            </p>
          </div>
          <History className="h-6 w-6 text-dh-lime" />
        </Link>
      </div>

      {/* Форма редактирования профиля и приватности */}
      <form
        onSubmit={handleSubmit}
        className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card space-y-6"
        noValidate
      >
        <div className="border-b border-dh-border pb-4">
          <h2 className="font-display text-lg font-bold text-dh-text">
            Основные данные и настройки приватности
          </h2>
          <p className="text-xs text-dh-textMuted">
            Ваш email и внутренние данные безопасности никогда не отображаются другим игрокам.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Отображаемое имя"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.display_name}
            leftIcon={<User className="h-4 w-4" />}
            required
          />

          <Input
            label="Ссылка на изображение аватара (URL)"
            placeholder="https://example.com/avatar.png"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            error={fieldErrors.avatar_url}
          />

          <div className="sm:col-span-2">
            <Input
              label="Steam Trade URL (необязательно)"
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
              value={steamTradeUrl}
              onChange={(e) => setSteamTradeUrl(e.target.value)}
              error={fieldErrors.steam_trade_url}
              leftIcon={<Link2 className="h-4 w-4" />}
              hint="Хранится в защищённом профиле и не публикуется в открытом доступе"
            />
          </div>
        </div>

        {/* Переключатели приватности */}
        <div className="space-y-3 border-t border-dh-border pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-dh-textMuted flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-dh-lime" />
            Видимость публичного профиля (/profile/{user.id})
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Публичный профиль открыт',
                checked: isPublicProfile,
                onChange: setIsPublicProfile,
              },
              {
                label: 'Показывать инвентарь',
                checked: showPublicInventory,
                onChange: setShowPublicInventory,
              },
              {
                label: 'Показывать статистику',
                checked: showPublicStats,
                onChange: setShowPublicStats,
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => item.onChange(!item.checked)}
                className={cn(
                  'flex items-center justify-between rounded-dh border p-3.5 text-left text-xs font-semibold transition-colors',
                  item.checked
                    ? 'border-dh-lime/50 bg-dh-lime/10 text-dh-text'
                    : 'border-dh-border bg-dh-bgSecondary text-dh-textMuted'
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                    item.checked ? 'bg-dh-lime text-dh-bg' : 'bg-dh-surface text-dh-textMuted'
                  )}
                >
                  {item.checked ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-dh-border pt-5">
          <span className="inline-flex items-center gap-1.5 text-xs text-dh-textMuted">
            <Shield className="h-4 w-4 text-dh-lime" />
            Защищено серверной сессией
          </span>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Сохранить изменения
          </Button>
        </div>
      </form>
    </div>
  );
};