import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card space-y-6">
        <div className="flex items-center gap-3 border-b border-dh-border pb-5">
          <Lock className="h-6 w-6 text-dh-lime shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-extrabold text-dh-text">
              Политика конфиденциальности
            </h1>
            <p className="text-xs text-dh-textMuted">Защита персональных и сессионных данных</p>
          </div>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">1. Какие данные обрабатываются</h2>
          <p>
            Для работы учётной записи сохраняются адрес электронной почты, уникальное имя
            пользователя, криптографический хеш пароля (Argon2id) и история игровых транзакций.
            Пароли никогда не хранятся в открытом виде и не передаются третьим лицам.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">2. Сессии и cookies</h2>
          <p>
            Авторизация осуществляется через защищённые серверные сессии с использованием
            HTTP-only cookies и CSRF-токенов. Мы не сохраняем секретные авторизационные токены в
            localStorage браузера, что защищает аккаунт от кражи сессии при XSS-атаках.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">3. Управление приватностью профиля</h2>
          <p>
            В разделе «Профиль» пользователь может самостоятельно скрыть публичный профиль,
            инвентарь или статистику. Адрес электронной почты, IP-адреса и внутренние платёжные
            идентификаторы никогда не отображаются в публичном профиле.
          </p>
        </section>

        <div className="flex items-center gap-3 rounded-dh border border-dh-border bg-dh-bgSecondary p-4 text-xs text-dh-textMuted">
          <ShieldCheck className="h-5 w-5 text-dh-lime shrink-0" />
          <span>
            Все административные действия и операции с балансом фиксируются в защищённом серверном
            журнале аудита (AuditLog).
          </span>
        </div>
      </div>
    </div>
  );
};