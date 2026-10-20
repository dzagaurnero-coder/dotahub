import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL обязателен для подключения к PostgreSQL'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_COOKIE_NAME: z.string().default('dotahub_sid'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET должен содержать минимум 16 символов')
    .default('dotahub-local-dev-session-secret-key-2026'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  INITIAL_DEMO_BALANCE_MINOR: z.coerce.number().int().min(0).default(250000),
  DAILY_BONUS_AMOUNT_MINOR: z.coerce.number().int().min(100).default(25000),
  STEAM_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  STEAM_API_KEY: z.string().optional(),
  STEAM_REALM: z.string().optional(),
  STEAM_RETURN_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Ошибка конфигурации переменных окружения (apps/api):');
  for (const issue of parsedEnv.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;