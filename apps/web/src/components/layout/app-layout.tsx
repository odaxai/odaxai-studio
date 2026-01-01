'use client';

// import { usePathname } from 'next/navigation';
import { BrowserTopBar } from '@/components/navigation/browser-top-bar';
import { SystemGuard } from '@/components/system/system-guard';

export function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  // const pathname = usePathname();
  // const showTopBar = pathname !== '/ide';

  return (
    <>
      {/* System Guard Wraps everything to protect routes */}
      <SystemGuard>

          {/* The Native Browser Bar - Always visible but styled differently */}
          <BrowserTopBar />

          {/* Main Application Area */}
          {/* Always pt-11 since top bar is h-11 */}
          <main className="h-screen w-screen overflow-hidden pt-11 bg-black text-white">
            {children}
          </main>

      </SystemGuard>
    </>
  );
}
