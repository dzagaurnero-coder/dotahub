import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/formatters';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'Деморежим и баланс',
    question: 'Что такое виртуальный деморежим DotaHub?',
    answer:
      'По умолчанию платформа работает в безопасном демонстрационном режиме. При регистрации вы получаете стартовый виртуальный баланс (2 500 ₽), а также можете получать ежедневные бонусы и активировать промокоды. Все демобаллы и предметы используются внутри платформы и не имеют денежной стоимости вне приложения.',
  },
  {
    category: 'Кейсы и вероятности',
    question: 'Как рассчитывается выпадение предмета при открытии кейса?',
    answer:
      'В каждом кейсе заранее задан пул предметов с открытыми вероятностями выпадения, сумма которых строго равна 100%. В момент нажатия кнопки «Открыть» сервер в транзакции базы данных генерирует криптографическое число через HMAC-SHA256 на основе Server Seed, вашего Client Seed и счётчика операций (Nonce). Клиент не может повлиять на выбор предмета.',
  },
  {
    category: 'Upgrader',
    question: 'По какой формуле работает Upgrader?',
    answer:
      'Шанс успешного улучшения рассчитывается сервером по отношению стоимости исходного предмета к стоимости целевого предмета с учётом фиксированной комиссии платформы (House Edge 5%). Минимальный допустимый шанс составляет 1%, максимальный — 85%. Шанс 100% в механике апгрейда не предусмотрен.',
  },
  {
    category: 'Безопасность',
    question: 'Что произойдёт, если во время прокрутки рулетки пропадёт интернет?',
    answer:
      'Результат открытия кейса или апгрейда фиксируется атомарно на сервере в базе данных PostgreSQL до начала клиентской анимации. Даже если вы закроете вкладку или потеряете соединение, выпавший предмет уже будет сохранён в вашем инвентаре, а запись появится в истории операций.',
  },
  {
    category: 'Каталог предметов',
    question: 'Откуда берутся предметы Dota 2 и их ориентировочные цены?',
    answer:
      'Каталог формируется через серверную систему идемпотентного импорта (команда npm run import) из структурированных наборов данных и открытых справочников Dota 2. Если для редкого или архивного предмета рыночная оценка отсутствует, интерфейс явно отображает статус «Цена не указана».',
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-dh-border pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dh-lime">
            <HelpCircle className="h-4 w-4" />
            Справочный центр
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-dh-text sm:text-3xl">
            Частые вопросы (FAQ)
          </h1>
          <p className="mt-1 text-sm text-dh-textMuted">
            Подробные ответы о механике кейсов, Upgrader, безопасности и виртуальном балансе.
          </p>
        </div>
        <Link to="/cases">
          <Button variant="outline" size="sm" leftIcon={<Sparkles className="h-4 w-4 text-dh-lime" />}>
            Перейти к кейсам
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-dh-lg border border-dh-border bg-dh-surface transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-dh-indigo">
                    {item.category}
                  </span>
                  <h2 className="mt-0.5 text-sm font-bold text-dh-text sm:text-base">
                    {item.question}
                  </h2>
                </div>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-dh-textMuted transition-transform duration-200',
                    isOpen && 'rotate-180 text-dh-lime'
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-dh-border/70 bg-dh-bgSecondary/60 px-5 py-4 text-sm leading-relaxed text-dh-textMuted">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-dh-lg border border-dh-border bg-dh-surface p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-dh-lime shrink-0" />
          <p className="text-xs leading-relaxed text-dh-textMuted">
            Все игровые операции защищены ключами идемпотентности (Idempotency-Key) и проверяются на
            стороне сервера.
          </p>
        </div>
        <Link to="/terms" className="shrink-0 text-xs font-semibold text-dh-lime hover:underline">
          Условия использования
        </Link>
      </div>
    </div>
  );
};