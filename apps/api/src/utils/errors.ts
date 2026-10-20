export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export class BadRequestError extends AppError {
  constructor(message = 'Некорректные параметры запроса.', details?: Record<string, string[]>) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Необходима авторизация для выполнения этого действия.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Доступ запрещён: недостаточно прав.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Запрашиваемый ресурс не найден.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Конфликт состояния данных.') {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Слишком много запросов. Повторите попытку чуть позже.') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}