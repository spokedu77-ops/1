'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSession = pathname.startsWith('/spokedu-master/spomove/session');

  if (isSession) {
    return (
      <div className="min-h-dvh bg-black" style={{ fontFamily: 'var(--spm-font-body)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh justify-center bg-black">
      <div
        className="relative flex min-h-dvh w-full flex-col overflow-hidden"
        style={{
          maxWidth: 390,
          background: 'var(--spm-bg)',
          color: 'var(--spm-t)',
          fontFamily: 'var(--spm-font-body)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.95)',
        }}
      >
        <StatusBar />
        <main
          className="min-h-0 flex-1 overflow-hidden"
          style={{ height: 'calc(100dvh - 48px - 68px)', background: 'var(--spm-bg)' }}
        >
          {children}
        </main>
        <TabBar />
      </div>
    </div>
  );
}
