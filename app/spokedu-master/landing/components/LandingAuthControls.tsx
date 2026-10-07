'use client';

import { useState } from 'react';
import { logoutCurrentSession } from '@/app/lib/auth/logoutSession';
import { TrackedLink } from '@/app/spokedu/components/home/tracked-link';
import { useLandingSession } from '../useLandingSession';

export function LandingAuthControls({
  loginHref,
  freeStartHref,
}: {
  loginHref: string;
  freeStartHref: string;
}) {
  const session = useLandingSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutCurrentSession();
    window.location.replace('/spokedu-lab');
  };

  if (session.status === 'checking') return null;

  if (session.status === 'member') {
    return (
      <>
        <TrackedLink href="/spokedu-lab/dashboard" trackLabel="master-commercial-header-dashboard" commercialRoute="curriculum" ctaIntentId="dashboard">
          대시보드
        </TrackedLink>
        <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}>
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </>
    );
  }

  return (
    <>
      <TrackedLink href={loginHref} trackLabel="master-commercial-header-login" commercialRoute="curriculum" ctaIntentId="login">
        로그인
      </TrackedLink>
      <TrackedLink
        href={freeStartHref}
        trackLabel="master-commercial-header-free"
        commercialRoute="curriculum"
        ctaIntentId="free_start"
        className="spm-btn-primary"
      >
        Free로 시작하기
      </TrackedLink>
    </>
  );
}
