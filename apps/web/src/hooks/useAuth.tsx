import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedUserDto,
  LoginRequestInput,
  RegisterRequestInput,
} from '@dotahub/shared';
import { api, setCsrfToken, type AuthSessionResponse } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';

export type AuthModalMode = 'login' | 'register';

interface AuthContextValue {
  user: AuthenticatedUserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  steamAuthEnabled: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  login: (data: LoginRequestInput) => Promise<AuthenticatedUserDto>;
  register: (data: RegisterRequestInput) => Promise<AuthenticatedUserDto>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  syncDemoBalance: (newDemoBalanceMinor: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const { data, isLoading, refetch } = useQuery<AuthSessionResponse>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => api.auth.me(),
    staleTime: 60_000,
    retry: false,
  });

  const user = data?.user ?? null;
  const steamAuthEnabled = data?.steamAuthEnabled ?? false;

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const login = useCallback(
    async (input: LoginRequestInput): Promise<AuthenticatedUserDto> => {
      const response = await api.auth.login(input);
      queryClient.setQueryData<AuthSessionResponse>(AUTH_QUERY_KEY, (prev) => ({
        user: response.user,
        csrfToken: response.csrfToken,
        steamAuthEnabled: prev?.steamAuthEnabled ?? false,
      }));
      setIsAuthModalOpen(false);
      toast.success(
        `С возвращением, ${response.user.display_name}!`,
        'Сессия успешно активирована.'
      );
      return response.user;
    },
    [queryClient, toast]
  );

  const register = useCallback(
    async (input: RegisterRequestInput): Promise<AuthenticatedUserDto> => {
      const response = await api.auth.register(input);
      queryClient.setQueryData<AuthSessionResponse>(AUTH_QUERY_KEY, (prev) => ({
        user: response.user,
        csrfToken: response.csrfToken,
        steamAuthEnabled: prev?.steamAuthEnabled ?? false,
      }));
      setIsAuthModalOpen(false);
      toast.success(
        'Аккаунт DotaHub создан!',
        'Стартовый виртуальный демобаланс зачислен на ваш счёт.'
      );
      return response.user;
    },
    [queryClient, toast]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.auth.logout();
    } finally {
      setCsrfToken(null);
      queryClient.setQueryData<AuthSessionResponse>(AUTH_QUERY_KEY, (prev) => ({
        user: null,
        csrfToken: '',
        steamAuthEnabled: prev?.steamAuthEnabled ?? false,
      }));
      queryClient.removeQueries({ queryKey: ['inventory'] });
      queryClient.removeQueries({ queryKey: ['balance'] });
      toast.info('Вы вышли из аккаунта');
    }
  }, [queryClient, toast]);

  const refreshSession = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  const syncDemoBalance = useCallback(
    (newDemoBalanceMinor: number): void => {
      queryClient.setQueryData<AuthSessionResponse>(AUTH_QUERY_KEY, (prev) => {
        if (!prev || !prev.user) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            demo_balance_minor: newDemoBalanceMinor,
          },
        };
      });
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      steamAuthEnabled,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      logout,
      refreshSession,
      syncDemoBalance,
    }),
    [
      user,
      isLoading,
      steamAuthEnabled,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      logout,
      refreshSession,
      syncDemoBalance,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Хук useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}