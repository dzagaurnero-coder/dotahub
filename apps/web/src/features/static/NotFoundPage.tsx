import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-dh-border bg-dh-surface text-dh-lime shadow-dh-card">
        <Compass className="h-10 w-10" />
      </div>
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-dh-indigo">
        Ошибка 404
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-dh-text sm:text-4xl">
        Страница не найдена
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-dh-textMuted">
        Запрошенный адрес не существует или был перемещён. Проверьте правильность URL или перейдите
        в один из основных разделов DotaHub.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            На главную
          </Button>
        </Link>
        <Link to="/cases">
          <Button variant="outline" leftIcon={<Layers className="h-4 w-4" />}>
            Каталог кейсов
          </Button>
        </Link>
      </div>
    </div>
  );
};