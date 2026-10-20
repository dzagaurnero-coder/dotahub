import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@/utils/errors';

export function registerErrorMiddleware(app: FastifyInstance): void {
  app.setErrorHandler(
    (
      error: FastifyError | AppError | ZodError | Error,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      // 1. Прикладные ошибки бизнес-логики (AppError и его наследники)
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      }

      // 2. Ошибки валидации входных данных Zod
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const pathKey = issue.path.join('.') || 'root';
          if (!fieldErrors[pathKey]) {
            fieldErrors[pathKey] = [];
          }
          fieldErrors[pathKey].push(issue.message);
        }

        const firstMessage =
          error.issues[0]?.message ||
          'Переданы некорректные параметры запроса.';

        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: firstMessage,
            details: fieldErrors,
          },
        });
      }

      // 3. Ошибки уникальности и целостности Prisma ORM
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return reply.status(409).send({
            error: {
              code: 'CONFLICT',
              message: 'Запись с такими уникальными данными уже существует.',
            },
          });
        }
        if (error.code === 'P2025') {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Запрашиваемая запись не найдена в базе данных.',
            },
          });
        }
      }

      // 4. Ошибка превышения лимита запросов (@fastify/rate-limit)
      if ('statusCode' in error && error.statusCode === 429) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message:
              'Слишком много запросов. Пожалуйста, подождите несколько секунд.',
          },
        });
      }

      // 5. Непредвиденные серверные ошибки
      request.log.error(
        { err: error, url: request.url, method: request.method },
        'Unhandled server error'
      );

      return reply.status(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Внутренняя ошибка сервера. Повторите попытку позже.',
        },
      });
    }
  );

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Маршрут ${request.method} ${request.url} не найден на сервере API.`,
      },
    });
  });
}