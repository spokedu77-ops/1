'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CurriculumInquiryForm } from '@/app/spokedu/components/curriculum-inquiry-form';
import { curriculumInquiryHref } from '@/app/spokedu/data/commercial-routes';
import {
  curriculumCommercialModes,
  resolveCurriculumMode,
  type CurriculumCommercialMode,
} from '@/app/spokedu/data/curriculum-commercial-modes';
import styles from '../landing.module.css';

/**
 * `/subscription?mode={mode}#inquiry` destination.
 * `#inquiry` id는 CurriculumInquiryForm이 소유한다 — 래퍼에 중복 id를 두지 않는다.
 * mode가 없거나 유효하지 않으면 `resolveCurriculumMode` 기본값(master).
 */
function SubscriptionInquiryFormWithMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = resolveCurriculumMode(searchParams.get('mode'));
  const formDefaults = curriculumCommercialModes[mode].formDefaults;

  const handleLeadModeChange = useCallback(
    (next: CurriculumCommercialMode) => {
      router.replace(curriculumInquiryHref({ mode: next }), { scroll: false });
    },
    [router],
  );

  return (
    <CurriculumInquiryForm
      leadMode={mode}
      formDefaults={formDefaults}
      onLeadModeChange={handleLeadModeChange}
    />
  );
}

export function SubscriptionInquirySection() {
  return (
    <div className={styles.inquirySection}>
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <SubscriptionInquiryFormWithMode />
      </Suspense>
    </div>
  );
}
