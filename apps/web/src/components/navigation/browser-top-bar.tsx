// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Code, Box, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrowserTopBar(): JSX.Element {
  const pathname = usePathname();

  const tabs = [
    { name: 'Dashboard', path: '/models', icon: LayoutGrid },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
  ];

  // Always show the top bar, but make it more minimal when in VS Code
  const isInVSCode = pathname === '/ide';

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-11 flex items-center z-50 select-none system-drag-region transition-all backdrop-blur-xl ${
        isInVSCode
          ? 'bg-black/20 opacity-30 hover:opacity-90' // Very transparent, appears on hover
          : 'bg-white/10 dark:bg-black/20 border-b border-white/10 dark:border-white/5'
      }`}
    >
      {/*
         LEFT AREA - Logo + OdaxAI Name (Ultra Compact)
      */}
      <div className="h-full shrink-0 flex items-center pl-4 pr-3 gap-1.5 border-r border-white/10">
        {/* Real OdaxAI Logo - screen blend mode to remove black background */}
        <div className="relative w-7 h-7 shrink-0">
          <img
            src="/odaxai-logo.png"
            alt="OdaxAI"
            className="w-full h-full object-contain"
            style={{
              filter: 'brightness(1.5)', // Slight boost if needed
              mixBlendMode: 'screen', // This makes black transparent
            }}
          />
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[14px] font-bold text-white tracking-tight">
              OdaxAI
            </span>
            <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest ml-0.5">
              Studio
            </span>
          </div>
        </div>
      </div>

      {/* TABS CONTAINER - Apple Style */}
      <div className="flex items-center gap-1 h-full px-1.5 flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={cn(
                'h-7 px-3 rounded-lg flex items-center gap-2 text-[12px] font-medium transition-all duration-200 system-no-drag min-w-fit group',
                isActive
                  ? 'bg-white/20 dark:bg-white/10 text-white dark:text-white shadow-sm backdrop-blur-sm'
                  : 'text-white/70 dark:text-white/60 hover:bg-white/10 hover:text-white/90 hover:backdrop-blur-sm'
              )}
            >
              <tab.icon
                className={cn(
                  'w-3.5 h-3.5 transition-all duration-200',
                  isActive ? 'text-blue-400' : 'group-hover:text-blue-300'
                )}
              />
              <span className="font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
