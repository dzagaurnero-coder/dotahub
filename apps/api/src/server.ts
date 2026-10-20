import { env } from '@/config/env';
import { disconnectDatabase } from '@/config/prisma';
import { buildApp } from './app';

async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(
      `🚀 Сервер DotaHub API успешно запущен на http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Получен сигнал ${signal}. Завершение работы сервера...`);
    try {
      await app.close();
      await disconnectDatabase();
      console.log('✅ Соединения с базой данных закрыты. Процесс остановлен.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Ошибка при мягком завершении работы:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
}

void startServer();