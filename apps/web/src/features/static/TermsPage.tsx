import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-dh-lg border border-dh-border bg-dh-surface p-6 sm:p-8 shadow-dh-card space-y-6">
        <div className="flex items-center gap-3 border-b border-dh-border pb-5">
          <FileText className="h-6 w-6 text-dh-lime shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-extrabold text-dh-text">
              Пользовательское соглашение
            </h1>
            <p className="text-xs text-dh-textMuted">Редакция платформы DotaHub</p>
          </div>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">1. Статус проекта и деморежим</h2>
          <p>
            DotaHub — самостоятельная интерактивная платформа, посвящённая косметическим предметам
            Dota 2. По умолчанию платформа функционирует в виртуальном деморежиме: все демобаллы
            (обозначаемые символом ₽ в демоконтуре), открытия кейсов и предметы в инвентаре являются
            виртуальными и не имеют денежной стоимости за пределами приложения.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">2. Прозрачность механик и вероятностей</h2>
          <p>
            На странице каждого кейса и в модуле Upgrader открыто публикуются точные вероятности
            получения каждого предмета (сумма вероятностей пула всегда составляет 100%). Все расчёты
            выполняются исключительно на сервере с использованием проверяемого алгоритма
            HMAC-SHA256.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-dh-textMuted">
          <h2 className="text-base font-bold text-dh-text">3. Отсутствие аффилированности с Valve</h2>
          <p>
            Проект DotaHub не связан с Valve Corporation, Steam или официальной разработкой Dota 2.
            Названия героев и предметов принадлежат их законным правообладателям и используются
            исключительно в справочно-информационных целях.
          </p>
        </section>

        <div className="flex items-start gap-3 rounded-dh border border-dh-indigo/30 bg-dh-bgSecondary p-4 text-xs text-dh-textMuted">
          <ShieldAlert className="h-5 w-5 text-dh-indigo shrink-0 mt-0.5" />
          <p>
            Запуск реальных платёжных операций допускается только после отдельной юридической
            проверки владельцем платформы, верификации платёжного провайдера и соблюдения возрастных
            и налоговых ограничений применимой юрисдикции.
          </p>
        </div>
      </div>
    </div>
  );
};