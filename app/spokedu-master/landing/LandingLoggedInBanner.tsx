'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useProfile } from '../store';

type BannerState = 'checking' | 'guest' | 'member';

export function LandingLoggedInBanner() {
  const profile = useProfile();
  const [state, setState] = useState<BannerState>('checking');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setEmail(session.user.email ?? '');
          setState('member');
          return;
        }
        setState('guest');
      } catch {
        if (!cancelled) setState('guest');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== 'member') return null;

  const destination = profile?.onboardingDone
    ? '/spokedu-master/dashboard'
    : '/spokedu-master/onboarding';

  return (
    <div
      className="border-b px-[22px] py-3 sm:px-10"
      style={{ background: 'var(--spm-acc-a14)', borderColor: 'var(--spm-acc-a28)' }}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-black" style={{ color: 'var(--spm-acc)' }}>
            이미 로그인되어 있습니다
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
            {email || 'MASTER 계정'}으로 SPOKEDU MASTER를 계속할 수 있습니다.
          </p>
        </div>
        <Link
          href={destination}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-[12px] font-black text-white"
          style={{ background: 'var(--spm-acc)' }}
        >
          앱으로 바로가기
        </Link>
      </div>
    </div>
  );
}
