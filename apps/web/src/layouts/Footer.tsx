import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-dh-border bg-dh-bgSecondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-dh-lime text-dh-bg font-display font-extrabold text-lg">
                D
              </div>
              <span className="font-display text-xl font-extrabold tracking-tight text-dh-text">
                Dota<span className="text-dh-lime">Hub</span>
              </span>
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-dh-textMuted">
              Современная игровая платформа, посвящённая косметическим предметам Dota 2: открытие
              виртуальных кейсов с открытыми вероятностями, интерактивный Upgrader и полный
              структурированный каталог предметов.
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg border border-dh-border bg-dh-surface px-3 py-1.5 text-xs text-dh-textMuted">
              <ShieldCheck className="h-4 w-4 text-dh-lime" />
              <span>Проверяемая случайность HMAC-SHA256 • Прозрачные шансы 100%</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-dh-text">Навигация</h3>
            <ul className="mt-3 space-y-2 text-xs text-dh-textMuted">
              <li>
                <Link to="/cases" className="hover:text-dh-lime transition-colors">
                  Каталог кейсов
                </Link>
              </li>
              <li>
                <Link to="/upgrader" className="hover:text-dh-lime transition-colors">
                  Апгрейдер предметов
                </Link>
              </li>
              <li>
                <Link to="/items" className="hover:text-dh-lime transition-colors">
                  Каталог предметов Dota 2
                </Link>
              </li>
              <li>
                <Link to="/bonuses" className="hover:text-dh-lime transition-colors">
                  Бонусы и промокоды
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-dh-lime transition-colors">
                  Избранные кейсы
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-dh-text">
              Документы и помощь
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-dh-textMuted">
              <li>
                <Link to="/faq" className="hover:text-dh-lime transition-colors">
                  Частые вопросы (FAQ)
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-dh-lime transition-colors">
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-dh-lime transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-dh-border pt-6 text-[11px] leading-relaxed text-dh-textMuted sm:flex-row sm:items-center">
          <p>
            © {currentYear} DotaHub. Самостоятельный проект. Не связан с Valve Corporation, Steam
            или официальной командой Dota 2. Все игровые названия и изображения предметов являются
            собственностью соответствующих правообладателей.
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-dh-surface px-2.5 py-1 text-dh-indigo">
            <Sparkles className="h-3.5 w-3.5" />
            Виртуальный деморежим активен
          </span>
        </div>
      </div>
    </footer>
  );
};