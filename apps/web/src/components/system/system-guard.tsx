'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, Power } from 'lucide-react';

export function SystemGuard({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isEngineOnline, setIsEngineOnline] = useState(true);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const checkStatus = async () => {
    try {
      // Simple health check or check if we can reach the model API
      // For now we assume if models fetch works, engine is up, or we check a specific flag
      const res = await fetch('/api/models', { method: 'GET' });
      await res.json();
      // If models api returns valid array, system is somewhat online.
      // Better: we assume online unless explicitly stopped.
      // But for the user request "se metto ofline deve rimanere offline", we need a persistent state or active check.
      // We'll trust the user has clicked stop.
      // For this demo, let's use a local storage flag set by the stop button, combined with a ping.

      const manuallyStopped =
        localStorage.getItem('odax_engine_status') === 'stopped';
      if (manuallyStopped) {
        setIsEngineOnline(false);
      } else {
        setIsEngineOnline(true);
      }
    } catch (e) {
      setIsEngineOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Pages that require engine to be ON
  const protectedRoutes = ['/chat', '/ide'];
  const isProtected = protectedRoutes.some((route) =>
    pathname?.includes(route)
  );

  /*
  if (!checking && !isEngineOnline && isProtected) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl z-50 fixed inset-0 text-white p-8">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(220,38,38,0.2)]">
            <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2 tracking-tight">System Offline</h1>
        <p className="text-gray-400 max-w-md text-center mb-8">
          The Neural Engine is currently stopped. Access to Chat and IDE intelligence is restricted to save resources and ensure security.
        </p>
        
        <button 
          onClick={() => router.push('/models')}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
        >
          <Power className="w-4 h-4" />
          Manage Engine in Dashboard
        </button>
      </div>
    );
  }
  */

  return <>{children}</>;
}
