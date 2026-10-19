import type {
  AdminCaseUpsertInput,
  AdminDashboardStatsDto,
  ApiErrorResponse,
  AuditLogEntryDto,
  AuthenticatedUserDto,
  BonusStatusDto,
  CaseDetailDto,
  CaseOpeningResultDto,
  CasesCatalogQueryInput,
  CaseSummaryDto,
  CatalogImportReportDto,
  DotaItemDto,
  HeroDto,
  InventoryItemDto,
  InventoryQueryInput,
  ItemsCatalogQueryInput,
  LoginRequestInput,
  OpenCaseRequestInput,
  PaginatedResponse,
  PaymentProviderPublicConfigDto,
  PromoRedeemResultDto,
  PublicProfileDto,
  RecentOpeningFeedEntryDto,
  RegisterRequestInput,
  TransactionDto,
  TransactionsQueryInput,
  UpdateProfileRequestInput,
  UpgraderAttemptRequestInput,
  UpgraderAttemptResultDto,
} from '@dotahub/shared';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

let currentCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  currentCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return currentCsrfToken;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  timeoutMs?: number;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `${normalizedBase}${normalizedPath}`;

  if (!params) {
    return fullPath;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, idempotencyKey, timeoutMs = 15000, headers, ...restInit } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const reqHeaders = new Headers(headers);
  reqHeaders.set('Accept', 'application/json');

  if (body !== undefined) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  if (currentCsrfToken) {
    reqHeaders.set('X-CSRF-Token', currentCsrfToken);
  }

  if (idempotencyKey) {
    reqHeaders.set('Idempotency-Key', idempotencyKey);
  }

  try {
    const response = await fetch(buildUrl(path, params), {
      ...restInit,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const apiErr = payload as ApiErrorResponse | null;
      const message =
        apiErr?.error?.message ||
        (response.status === 401
          ? 'Необходима авторизация для выполнения этого действия'
          : response.status === 403
            ? 'Недостаточно прав доступа'
            : response.status === 429
              ? 'Слишком много запросов. Пожалуйста, подождите несколько секунд'
              : `Ошибка сервера (${response.status})`);
      const code = apiErr?.error?.code || `HTTP_${response.status}`;
      throw new ApiClientError(message, response.status, code, apiErr?.error?.details);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(
        'Превышено время ожидания ответа от сервера. Проверьте соединение.',
        408,
        'TIMEOUT_ERROR'
      );
    }
    throw new ApiClientError(
      'Не удалось связаться с сервером. Проверьте подключение к сети.',
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AuthSessionResponse {
  user: AuthenticatedUserDto | null;
  csrfToken: string;
  steamAuthEnabled: boolean;
}

export interface BalanceOverviewResponse {
  demoBalanceMinor: number;
  realBalanceMinor: number;
  demoModeEnabled: boolean;
  realPaymentsEnabled: boolean;
  providers: PaymentProviderPublicConfigDto[];
  recentTransactions: TransactionDto[];
}

export interface AdminPromoCodeDto {
  id: string;
  code: string;
  reward_amount_minor: number;
  max_activations: number;
  activations_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export const api = {
  auth: {
    me: async (): Promise<AuthSessionResponse> => {
      const res = await request<AuthSessionResponse>('/auth/me', { method: 'GET' });
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
      return res;
    },
    login: async (data: LoginRequestInput): Promise<{ user: AuthenticatedUserDto; csrfToken: string }> => {
      const res = await request<{ user: AuthenticatedUserDto; csrfToken: string }>('/auth/login', {
        method: 'POST',
        body: data,
      });
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
      return res;
    },
    register: async (
      data: RegisterRequestInput
    ): Promise<{ user: AuthenticatedUserDto; csrfToken: string }> => {
      const res = await request<{ user: AuthenticatedUserDto; csrfToken: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: data,
        }
      );
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
      return res;
    },
    logout: async (): Promise<{ success: boolean }> => {
      return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    },
  },

  cases: {
    list: (
      params?: Partial<CasesCatalogQueryInput>
    ): Promise<{ cases: CaseSummaryDto[]; recentOpenings: RecentOpeningFeedEntryDto[] }> =>
      request('/cases', { method: 'GET', params: params as RequestOptions['params'] }),

    getBySlug: (slug: string): Promise<{ caseData: CaseDetailDto }> =>
      request(`/cases/${encodeURIComponent(slug)}`, { method: 'GET' }),

    open: (
      slug: string,
      data: OpenCaseRequestInput
    ): Promise<{ result: CaseOpeningResultDto }> =>
      request(`/cases/${encodeURIComponent(slug)}/open`, {
        method: 'POST',
        body: data,
        idempotencyKey: data.idempotencyKey,
      }),

    toggleFavorite: (caseId: string): Promise<{ isFavorite: boolean }> =>
      request(`/cases/${encodeURIComponent(caseId)}/favorite`, { method: 'POST' }),

    listFavorites: (): Promise<{ cases: CaseSummaryDto[] }> =>
      request('/cases/favorites/list', { method: 'GET' }),
  },

  items: {
    list: (
      params?: Partial<ItemsCatalogQueryInput>
    ): Promise<PaginatedResponse<DotaItemDto> & { heroes: HeroDto[] }> =>
      request('/items', { method: 'GET', params: params as RequestOptions['params'] }),

    getBySlug: (
      slug: string
    ): Promise<{
      item: DotaItemDto;
      relatedCases: CaseSummaryDto[];
      similarItems: DotaItemDto[];
    }> => request(`/items/${encodeURIComponent(slug)}`, { method: 'GET' }),
  },

  inventory: {
    list: (
      params?: Partial<InventoryQueryInput>
    ): Promise<PaginatedResponse<InventoryItemDto>> =>
      request('/inventory', { method: 'GET', params: params as RequestOptions['params'] }),
  },

  upgrader: {
    attempt: (
      data: UpgraderAttemptRequestInput
    ): Promise<{ result: UpgraderAttemptResultDto }> =>
      request('/upgrader/attempt', {
        method: 'POST',
        body: data,
        idempotencyKey: data.idempotencyKey,
      }),

    history: (): Promise<{ attempts: UpgraderAttemptResultDto[] }> =>
      request('/upgrader/history', { method: 'GET' }),
  },

  profile: {
    update: (data: UpdateProfileRequestInput): Promise<{ user: AuthenticatedUserDto }> =>
      request('/profile', { method: 'PATCH', body: data }),

    getPublic: (userIdOrUsername: string): Promise<{ profile: PublicProfileDto }> =>
      request(`/profile/${encodeURIComponent(userIdOrUsername)}`, { method: 'GET' }),
  },

  balance: {
    getOverview: (): Promise<BalanceOverviewResponse> =>
      request('/balance/overview', { method: 'GET' }),

    demoTopup: (
      idempotencyKey: string
    ): Promise<{ demoBalanceMinor: number; transaction: TransactionDto }> =>
      request('/balance/demo-topup', {
        method: 'POST',
        body: { idempotencyKey },
        idempotencyKey,
      }),

    listTransactions: (
      params?: Partial<TransactionsQueryInput>
    ): Promise<PaginatedResponse<TransactionDto>> =>
      request('/balance/transactions', {
        method: 'GET',
        params: params as RequestOptions['params'],
      }),
  },

  bonuses: {
    getStatus: (): Promise<{ status: BonusStatusDto }> =>
      request('/bonuses/status', { method: 'GET' }),

    claimDaily: (
      idempotencyKey: string
    ): Promise<{
      updatedDemoBalanceMinor: number;
      rewardAmountMinor: number;
      nextAvailableAt: string;
    }> =>
      request('/bonuses/daily', {
        method: 'POST',
        body: { idempotencyKey },
        idempotencyKey,
      }),

    redeemPromo: (
      code: string,
      idempotencyKey: string
    ): Promise<{ result: PromoRedeemResultDto }> =>
      request('/bonuses/promo', {
        method: 'POST',
        body: { code, idempotencyKey },
        idempotencyKey,
      }),
  },

  admin: {
    getDashboard: (): Promise<{
      stats: AdminDashboardStatsDto;
      auditLogs: AuditLogEntryDto[];
      promoCodes: AdminPromoCodeDto[];
      providers: PaymentProviderPublicConfigDto[];
      siteSettings: {
        demo_mode_enabled: boolean;
        initial_demo_balance_minor: number;
        daily_bonus_amount_minor: number;
        upgrader_house_edge_percent: number;
      };
    }> => request('/admin/dashboard', { method: 'GET' }),

    listUsers: (): Promise<{ users: AuthenticatedUserDto[] }> =>
      request('/admin/users', { method: 'GET' }),

    adjustUserBalance: (data: {
      userId: string;
      deltaMinor: number;
      reason: string;
    }): Promise<{ demoBalanceMinor: number }> =>
      request('/admin/users/adjust-balance', { method: 'POST', body: data }),

    upsertCase: (
      data: AdminCaseUpsertInput & { id?: string }
    ): Promise<{ caseData: CaseDetailDto }> =>
      request('/admin/cases', { method: 'POST', body: data }),

    toggleCaseActive: (
      caseId: string,
      isActive: boolean
    ): Promise<{ isActive: boolean }> =>
      request(`/admin/cases/${encodeURIComponent(caseId)}/status`, {
        method: 'PATCH',
        body: { is_active: isActive },
      }),

    runCatalogImport: (): Promise<{ report: CatalogImportReportDto }> =>
      request('/admin/catalog/import', { method: 'POST', timeoutMs: 60000 }),

    createPromoCode: (data: {
      code: string;
      reward_amount_minor: number;
      max_activations: number;
      expires_at?: string | null;
      is_active?: boolean;
    }): Promise<{ promoCode: AdminPromoCodeDto }> =>
      request('/admin/promocodes', { method: 'POST', body: data }),

    updateSiteSettings: (data: {
      demo_mode_enabled?: boolean;
      initial_demo_balance_minor?: number;
      daily_bonus_amount_minor?: number;
      upgrader_house_edge_percent?: number;
    }): Promise<{ updated: boolean }> =>
      request('/admin/settings', { method: 'PATCH', body: data }),

    updatePaymentProvider: (
      code: string,
      data: {
        name: string;
        is_enabled: boolean;
        supported_currencies: string[];
        min_amount_minor: number;
        max_amount_minor: number;
        allowed_methods: string[];
        webhook_url?: string | null;
      }
    ): Promise<{ provider: PaymentProviderPublicConfigDto }> =>
      request(`/admin/payment-providers/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: data,
      }),
  },
};