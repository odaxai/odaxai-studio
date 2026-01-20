// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import './globals.css';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { AppLayout } from '@/components/layout/app-layout';
import { LocalSearchProvider as SearchProvider } from '@/context/SearchContext';

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Odax Studio',
  description: 'Local AI Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body className={`${montserrat.className} h-full bg-black`}>
        <SearchProvider>
          <AppLayout>{children}</AppLayout>
        </SearchProvider>
      </body>
    </html>
  );
}
