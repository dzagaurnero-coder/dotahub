import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Backpack,
  Box,
  Flame,
  Gift,
  Heart,
  History,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Sparkles,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn, formatRub } from '@/lib/formatters';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { to: '/cases', label: 'Кейсы', icon: Box },
  { to: '/upgrader', label: 'Апгрейдер', icon: Flame },
  { to: '/items', label: 'Предметы', icon: Sparkles },
  { to: '/bonuses', label: 'Бонусы', icon: Gift },
];

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/items?search=${encodeURIComponent(trimmed)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    } else {
      navigate('/items');
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dh-border bg-dh-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Левая часть: логотип и фирменный знак */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="group flex items-center gap-2.5 focus:outline-none"
            aria-label="DotaHub — На главную"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-dh-lime font-display text-lg font-extrabold text-dh-bg shadow-dh-lime transition-transform duration-200 group-hover:scale-105">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-extrabold leading-none tracking-tight text-dh-text">
                Dota<span className="text-dh-lime">Hub</span>
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-dh-textMuted">
                Dota 2 Cases
              </span>
            </div>
          </Link>
        </div>

        {/* Центральная часть: основная навигация (Desktop) */}
        <nav aria-label="Основная навигация" className="hidden md:flex md:items-center md:gap-1">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-dh px-3.5 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-dh-surfaceElevated text-dh-lime'
                      : 'text-dh-textMuted hover:bg-dh-surface hover:text-dh-text'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Правая часть: поиск, избранное, баланс и профиль */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Кнопка поиска */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            aria-label="Поиск предметов и кейсов"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-dh border transition-colors',
              isSearchOpen
                ? 'border-dh-lime bg-dh-surfaceElevated text-dh-lime'
                : 'border-dh-border bg-dh-surface text-dh-textMuted hover:border-dh-textMuted/50 hover:text-dh-text'
            )}
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Кнопка избранного */}
          <NavLink
            to="/favorites"
            aria-label="Избранные кейсы"
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-dh border transition-colors',
                isActive
                  ? 'border-dh-lime bg-dh-surfaceElevated text-dh-lime'
                  : 'border-dh-border bg-dh-surface text-dh-textMuted hover:border-dh-textMuted/50 hover:text-dh-text'
              )
            }
          >
            <Heart className="h-4 w-4" />
          </NavLink>

          {isAuthenticated && user ? (
            <>
              {/* Виджет баланса и кнопка пополнения */}
              <div className="flex items-center rounded-dh border border-dh-border bg-dh-surface p-1 pl-3">
                <Link
                  to="/balance"
                  className="mr-2.5 flex flex-col text-left"
                  title="Виртуальный демобаланс"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-dh-textMuted">
                    Демобаланс
                  </span>
                  <span className="font-mono text-xs font-bold text-dh-lime sm:text-sm">
                    {formatRub(user.demo_balance_minor)}
                  </span>
                </Link>
                <Link
                  to="/balance"
                  aria-label="Пополнить баланс"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-dh-lime text-dh-bg transition-colors hover:bg-dh-limeHover"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                </Link>
              </div>

              {/* Быстрый переход в инвентарь */}
              <NavLink
                to="/inventory"
                title="Мой инвентарь"
                className={({ isActive }) =>
                  cn(
                    'hidden h-10 items-center gap-1.5 rounded-dh border px-3 text-xs font-semibold transition-colors lg:inline-flex',
                    isActive
                      ? 'border-dh-lime bg-dh-surfaceElevated text-dh-lime'
                      : 'border-dh-border bg-dh-surface text-dh-text hover:bg-dh-surfaceElevated'
                  )
                }
              >
                <Backpack className="h-4 w-4 text-dh-indigo" />
                <span>Инвентарь</span>
              </NavLink>

              {/* Кнопка админ-панели (только для подтверждённых администраторов) */}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  title="Административная панель"
                  className={({ isActive }) =>
                    cn(
                      'hidden h-10 w-10 items-center justify-center rounded-dh border transition-colors sm:flex',
                      isActive
                        ? 'border-dh-indigo bg-dh-indigo/20 text-dh-indigo'
                        : 'border-dh-indigo/40 bg-dh-indigo/10 text-dh-indigo hover:bg-dh-indigo/20'
                    )
                  }
                >
                  <Shield className="h-4 w-4" />
                </NavLink>
              )}

              {/* Аватар / переход в профиль */}
              <Link
                to="/profile"
                className="flex h-10 items-center gap-2 rounded-dh border border-dh-border bg-dh-surface px-2.5 transition-colors hover:border-dh-lime/50 hover:bg-dh-surfaceElevated"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-dh-indigo/20 text-xs font-bold text-dh-indigo">
                  {user.display_name.slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden max-w-[100px] truncate text-xs font-semibold text-dh-text xl:inline">
                  {user.display_name}
                </span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => openAuthModal('login')}>
                Войти
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => openAuthModal('register')}
              >
                Регистрация
              </Button>
            </div>
          )}

          {/* Кнопка мобильного меню */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Открыть меню навигации"
            aria-expanded={isMobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-dh border border-dh-border bg-dh-surface text-dh-text md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Выпадающая строка быстрого поиска */}
      {isSearchOpen && (
        <div className="border-t border-dh-border bg-dh-bgSecondary px-4 py-3">
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-textMuted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск предметов Dota 2 по названию или герою (например: Dragonclaw Hook, Pudge, Arcana)..."
                autoFocus
                className="h-10 w-full rounded-dh border border-dh-border bg-dh-surface pl-10 pr-4 text-sm text-dh-text placeholder:text-dh-textMuted focus:border-dh-lime focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Найти
            </Button>
          </form>
        </div>
      )}

      {/* Компактная мобильная навигация */}
      {isMobileMenuOpen && (
        <div className="border-t border-dh-border bg-dh-bgSecondary px-4 py-4 md:hidden">
          <nav className="flex flex-col space-y-1">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold',
                      isActive
                        ? 'bg-dh-surfaceElevated text-dh-lime'
                        : 'text-dh-textMuted hover:bg-dh-surface hover:text-dh-text'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {isAuthenticated && user && (
              <>
                <div className="my-2 border-t border-dh-border" />
                <NavLink
                  to="/inventory"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold text-dh-textMuted hover:bg-dh-surface hover:text-dh-text"
                >
                  <Backpack className="h-4 w-4 text-dh-indigo" />
                  <span>Инвентарь</span>
                </NavLink>
                <NavLink
                  to="/balance"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold text-dh-textMuted hover:bg-dh-surface hover:text-dh-text"
                >
                  <Wallet className="h-4 w-4 text-dh-lime" />
                  <span>Баланс ({formatRub(user.demo_balance_minor)})</span>
                </NavLink>
                <NavLink
                  to="/transactions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold text-dh-textMuted hover:bg-dh-surface hover:text-dh-text"
                >
                  <History className="h-4 w-4" />
                  <span>История операций</span>
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold text-dh-textMuted hover:bg-dh-surface hover:text-dh-text"
                >
                  <User className="h-4 w-4" />
                  <span>Профиль ({user.display_name})</span>
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-dh px-3.5 py-2.5 text-sm font-semibold text-dh-indigo hover:bg-dh-surface"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Админ-панель</span>
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-dh px-3.5 py-2.5 text-left text-sm font-semibold text-dh-danger hover:bg-dh-surface"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};