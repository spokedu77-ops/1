'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from './store';

export default function SpokeduMasterPage() {
  const router = useRouter();
  const profile = useProfile();

  useEffect(() => {
    router.replace(profile?.onboardingDone ? '/spokedu-master/dashboard' : '/spokedu-master/onboarding');
  }, [profile?.onboardingDone, router]);

  return (
    <div className="grid min-h-dvh place-items-center px-6" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <div className="w-full max-w-[420px] text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU MASTER</p>
        <h1 className="mt-3 text-[30px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
          SPOKEDU MASTER로 이동하는 중입니다
        </h1>
        <p className="mt-3 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>
          온보딩 상태를 확인하고 알맞은 시작 화면을 여는 중입니다.
        </p>
        <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full" style={{ background: 'var(--spm-s3)' }}>
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: 'var(--spm-acc)' }} />
        </div>
      </div>
    </div>
  );
}
