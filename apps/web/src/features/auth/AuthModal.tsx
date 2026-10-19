import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { loginRequestSchema, registerRequestSchema } from '@dotahub/shared';
import { useAuth } from '@/hooks/useAuth';
import { ApiClientError } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/formatters';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    steamAuthEnabled,
  } = useAuth();

  const [loginValue, setLoginValue] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setFieldErrors({});
      setServerError(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    if (authModalMode === 'login') {
      const parsed = loginRequestSchema.safeParse({
        login: loginValue,
        password,
      });

      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const pathKey = String(issue.path[0] || 'form');
          if (!errors[pathKey]) {
            errors[pathKey] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        await login(parsed.data);
        setPassword('');
      } catch (err) {
        if (err instanceof ApiClientError) {
          setServerError(err.message);
        } else {
          setServerError('Произошла ошибка при входе. Попробуйте ещё раз.');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const parsed = registerRequestSchema.safeParse({
        email,
        username,
        display_name: displayName.trim() ? displayName : undefined,
        password,
      });

      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const pathKey = String(issue.path[0] || 'form');
          if (!errors[pathKey]) {
            errors[pathKey] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        await register(parsed.data);
        setPassword('');
      } catch (err) {
        if (err instanceof ApiClientError) {
          setServerError(err.message);
        } else {
          setServerError('Не удалось завершить регистрацию. Попробуйте позже.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      title={authModalMode === 'login' ? 'Вход в DotaHub' : 'Создание аккаунта'}
      description={
        authModalMode === 'login'
          ? 'Авторизуйтесь для доступа к открытию кейсов, Upgrader и инвентарю'
          : 'Зарегистрируйтесь и получите стартовый виртуальный демобаланс 2 500 ₽'
      }
    >
      {/* Переключатель вкладок Вход / Регистрация */}
      <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-dh bg-dh-bgSecondary p-1 border border-dh-border">
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className={cn(
            'rounded-lg py-2 text-xs font-semibold transition-colors',
            authModalMode === 'login'
              ? 'bg-dh-surfaceElevated text-dh-lime shadow-2xs'
              : 'text-dh-textMuted hover:text-dh-text'
          )}
        >
          Вход в аккаунт
        </button>
        <button
          type="button"
          onClick={() => openAuthModal('register')}
          className={cn(
            'rounded-lg py-2 text-xs font-semibold transition-colors',
            authModalMode === 'register'
              ? 'bg-dh-surfaceElevated text-dh-lime shadow-2xs'
              : 'text-dh-textMuted hover:text-dh-text'
          )}
        >
          Регистрация
        </button>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-dh border border-dh-danger/40 bg-dh-danger/10 p-3 text-xs font-medium text-dh-danger"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {authModalMode === 'login' ? (
          <>
            <Input
              label="Email или имя пользователя"
              placeholder="demo@dotahub.local или demo_player"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              error={fieldErrors.login}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="username"
              required
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="current-password"
              required
            />
          </>
        ) : (
          <>
            <Input
              label="Электронная почта"
              type="email"
              placeholder="player@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
            />
            <Input
              label="Имя пользователя (латиницей)"
              placeholder="invoker_main"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username}
              hint="От 3 до 32 символов: латинские буквы, цифры и _"
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="username"
              required
            />
            <Input
              label="Отображаемое имя (необязательно)"
              placeholder="Invoker Master"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={fieldErrors.display_name}
              autoComplete="nickname"
            />
            <Input
              label="Пароль (минимум 8 символов)"
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              required
            />
          </>
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          {authModalMode === 'login' ? 'Войти в DotaHub' : 'Создать аккаунт'}
        </Button>
      </form>

      {/* Блок статуса интеграции Steam OpenID */}
      <div className="mt-5 border-t border-dh-border pt-4">
        <div className="flex items-center justify-between rounded-dh border border-dh-border bg-dh-bgSecondary p-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-dh-text">Авторизация через Steam OpenID</p>
            <p className="text-[11px] text-dh-textMuted">
              {steamAuthEnabled
                ? 'Официальный вход через аккаунт Steam доступен'
                : 'Статус: Интеграция не настроена (работает локальная демоавторизация)'}
            </p>
          </div>
          {steamAuthEnabled ? (
            <a
              href="/api/auth/steam"
              className="rounded-lg bg-dh-surfaceElevated px-3 py-1.5 text-xs font-semibold text-dh-lime hover:bg-dh-border"
            >
              Steam
            </a>
          ) : (
            <span className="rounded-md border border-dh-border bg-dh-surface px-2 py-1 text-[10px] font-medium text-dh-textMuted">
              Отключено
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-dh-textMuted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-dh-lime" />
          <span>
            Пароли хешируются алгоритмом Argon2id, сессия защищена HTTP-only cookie и CSRF-токеном.
          </span>
        </div>
      </div>
    </Modal>
  );
};