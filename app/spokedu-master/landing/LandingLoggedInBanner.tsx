'use client';

import Link from 'next/link';
import { useProfile } from '../store';
import { useLandingSession } from './useLandingSession';

export function LandingLoggedInBanner() {
  const profile = useProfile();
  const session = useLandingSession();

  if (session.status !== 'member') return null;

  const destination = session.institution || profile?.onboardingDone
    ? '/spokedu-lab/dashboard'
    : '/spokedu-lab/onboarding';

  return (
    <div
      className="border-b px-[22px] py-3 sm:px-10"
      style={{ background: 'var(--spm-acc-a14)', borderColor: 'var(--spm-acc-a28)' }}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold" style={{ color: 'var(--spm-acc)' }}>
            이미 로그인되어 있습니다
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
            {session.displayName} 계정으로 로그인되어 있습니다.
          </p>
        </div>
        <Link
          href={destination}
          className="spm-btn-primary inline-flex min-h-11 shrink-0 items-center justify-center rounded-[10px] px-5 text-[12px] font-extrabold focus-visible:outline-none"
        >
          앱으로 바로가기
        </Link>
      </div>
    </div>
  );
}
