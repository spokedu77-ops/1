'use client';

import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '@/app/spokedu/components/home/tracked-link';
import { useLandingSession, type LandingSessionState } from '../useLandingSession';
import styles from '../landing.module.css';

type AuthControlVariant = 'desktop' | 'mobile-primary' | 'mobile-menu';

export function LandingAuthControls({
  loginHref,
  freeStartHref,
  session,
  variant,
  onNavigate,
}: {
  loginHref: string;
  freeStartHref: string;
  session: LandingSessionState;
  variant: AuthControlVariant;
  onNavigate?: () => void;
}) {
  if (session.status === 'checking') {
    return <span className={styles.authLoading} aria-label="로그인 상태 확인 중" aria-busy="true" />;
  }

  if (session.status === 'member') {
    return (
      <TrackedLink
        href="/spokedu-lab/dashboard"
        trackLabel="master-commercial-header-dashboard"
        commercialRoute="curriculum"
        ctaIntentId="dashboard"
        className={variant === 'mobile-menu' ? styles.mobileAccountLink : `${styles.authPrimary} spm-btn-primary`}
        onClick={onNavigate}
      >
        대시보드
      </TrackedLink>
    );
  }

  if (variant === 'mobile-primary') {
    return (
      <TrackedLink
        href={freeStartHref}
        trackLabel="master-commercial-header-free-mobile"
        commercialRoute="curriculum"
        ctaIntentId="free_start"
        className={`${styles.authPrimary} spm-btn-primary`}
      >
        무료로 시작하기
      </TrackedLink>
    );
  }

  if (variant === 'mobile-menu') {
    return (
      <TrackedLink
        href={loginHref}
        trackLabel="master-commercial-header-login-mobile"
        commercialRoute="curriculum"
        ctaIntentId="login"
        className={styles.mobileAccountLink}
        onClick={onNavigate}
      >
        로그인
      </TrackedLink>
    );
  }

  return (
    <>
      <TrackedLink href={loginHref} trackLabel="master-commercial-header-login" commercialRoute="curriculum" ctaIntentId="login" className={styles.authLogin}>
        로그인
      </TrackedLink>
      <TrackedLink
        href={freeStartHref}
        trackLabel="master-commercial-header-free"
        commercialRoute="curriculum"
        ctaIntentId="free_start"
        className={`${styles.authPrimary} spm-btn-primary`}
      >
        무료로 시작하기
      </TrackedLink>
    </>
  );
}

export function LandingConversionActions({
  loginHref,
  freeStartHref,
  placement,
}: {
  loginHref: string;
  freeStartHref: string;
  placement: 'hero' | 'final';
}) {
  const session = useLandingSession();

  if (session.status === 'checking') {
    return <span className={styles.conversionLoading} aria-label="로그인 상태 확인 중" aria-busy="true" />;
  }

  if (session.status === 'member') {
    return (
      <TrackedLink href="/spokedu-lab/dashboard" trackLabel={`master-commercial-${placement}-dashboard`} commercialRoute="curriculum" ctaIntentId="dashboard" className="spm-btn-primary">
        대시보드로 이동 <ArrowRight size={17} aria-hidden />
      </TrackedLink>
    );
  }

  return (
    <>
      <TrackedLink href={freeStartHref} trackLabel={`master-commercial-${placement}-free`} commercialRoute="curriculum" ctaIntentId="free_start" className="spm-btn-primary">
        무료로 시작하기 <ArrowRight size={17} aria-hidden />
      </TrackedLink>
      {placement === 'final' ? (
        <TrackedLink href={loginHref} trackLabel="master-commercial-final-login" commercialRoute="curriculum" ctaIntentId="login" className={styles.finalLoginLink}>
          로그인
        </TrackedLink>
      ) : null}
    </>
  );
}
