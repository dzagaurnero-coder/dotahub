import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Header } from '@/layouts/Header';
import { Footer } from '@/layouts/Footer';
import { AuthModal } from '@/features/auth/AuthModal';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-dh-bg text-dh-text selection:bg-dh-lime selection:text-dh-bg">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
      <ScrollRestoration />
    </div>
  );
};