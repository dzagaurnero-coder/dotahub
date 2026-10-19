import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/layouts/ProtectedRoute';
import { HomePage } from '@/features/home/HomePage';
import { CasesCatalogPage } from '@/features/cases/CasesCatalogPage';
import { CaseDetailPage } from '@/features/cases/CaseDetailPage';
import { UpgraderPage } from '@/features/upgrader/UpgraderPage';
import { ItemsCatalogPage } from '@/features/items/ItemsCatalogPage';
import { ItemDetailPage } from '@/features/items/ItemDetailPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { PublicProfilePage } from '@/features/profile/PublicProfilePage';
import { BalancePage } from '@/features/balance/BalancePage';
import { TransactionsPage } from '@/features/balance/TransactionsPage';
import { BonusesPage } from '@/features/bonuses/BonusesPage';
import { FavoritesPage } from '@/features/bonuses/FavoritesPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { FaqPage } from '@/features/static/FaqPage';
import { TermsPage } from '@/features/static/TermsPage';
import { PrivacyPage } from '@/features/static/PrivacyPage';
import { NotFoundPage } from '@/features/static/NotFoundPage';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cases', element: <CasesCatalogPage /> },
      { path: 'cases/:slug', element: <CaseDetailPage /> },
      { path: 'upgrader', element: <UpgraderPage /> },
      { path: 'items', element: <ItemsCatalogPage /> },
      { path: 'items/:slug', element: <ItemDetailPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'bonuses', element: <BonusesPage /> },
      { path: 'profile/:id', element: <PublicProfilePage /> },
      {
        path: 'inventory',
        element: (
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'balance',
        element: (
          <ProtectedRoute>
            <BalancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transactions',
        element: (
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      { path: 'faq', element: <FaqPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);