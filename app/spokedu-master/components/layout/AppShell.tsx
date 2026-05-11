'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TabBar } from './TabBar';
import { useProfile } from '../../store';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const isSession = pathname.startsWith('/spokedu-master/spomove/session');
  const isOnboarding = pathname.startsWith('/spokedu-master/onboarding');
  const isParentView = pathname.startsWith('/spokedu-master/parent');

  useEffect(() => {
    if (!isSession && !isOnboarding && !isParentView && profile && !profile.onboardingDone) {
      router.replace('/spokedu-master/onboarding');
    }
  }, [isOnboarding, isParentView, isSession, profile, router]);

  if (isSession) {
    return (
      <div className="min-h-dvh bg-black" style={{ fontFamily: 'var(--spm-font-body)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col overflow-hidden"
        style={{
          background: 'var(--spm-bg)',
          color: 'var(--spm-t)',
          fontFamily: 'var(--spm-font-body)',
        }}
      >
        <main className="min-h-0 flex-1 overflow-hidden" style={{ background: 'var(--spm-bg)' }}>
          {children}
        </main>
        {isOnboarding || isParentView ? null : <TabBar />}
      </div>
    </div>
  );
}
