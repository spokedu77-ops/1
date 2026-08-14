'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { curriculumPage } from '../data/curriculum-page';
import {
  curriculumCommercialModes,
  curriculumModeScrollTarget,
  curriculumSubmitLabel,
  isCurriculumCommercialMode,
  resolveCurriculumMode,
  type CurriculumCommercialMode,
} from '../data/curriculum-commercial-modes';
import { getPublicProductContract } from '../data/public-product-contract';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import { trackCommercialEvent } from '../lib/commercial-events';
import { marketingBody, marketingCardStatic } from '../lib/ui-classes';
import { CurriculumInquiryForm } from './curriculum-inquiry-form';
import { LandingProcessOnePager } from './landing-process-one-pager';
import { SubscriptionV17Page } from './subscription-v17/subscription-v17-page';

const publicProduct = getPublicProductContract();

export default function CurriculumLanding() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const modeParam = searchParams.get('mode');
  const mode = resolveCurriculumMode(modeParam);
  const active = curriculumCommercialModes[mode];
  const reducedMotion = useReducedMotion();
  const scrolledForMode = useRef<string | null>(null);

  const setMode = useCallback(
    (next: CurriculumCommercialMode, hash?: string) => {
      trackCommercialEvent({ name: 'selection_changed', route: 'curriculum', selectionId: next });
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', next);
      const targetHash = hash ?? curriculumModeScrollTarget(next);
      router.replace(`${pathname}?${params.toString()}#${targetHash}`, { scroll: false });
      window.requestAnimationFrame(() => {
        document.getElementById(targetHash)?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    },
    [pathname, reducedMotion, router, searchParams],
  );

  useEffect(() => {
    captureAcquisitionFromLocation();
  }, []);

  useEffect(() => {
    const raw = searchParams.get('mode');
    if (!raw || scrolledForMode.current === raw) return;
    scrolledForMode.current = raw;
    const target = curriculumModeScrollTarget(mode);
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }, [mode, reducedMotion, searchParams]);

  const showInquiry = Boolean(modeParam && isCurriculumCommercialMode(modeParam));
  const inquiry = showInquiry ? (
    <div id="inquiry" className="scroll-mt-24 pt-8" data-mode-section={active.sectionId}>
      <div className={`${marketingCardStatic} p-5 sm:p-8`}>
        <LandingProcessOnePager data={curriculumPage.processOnePager} />
        <div className="mt-8">
          <p className={`${marketingBody} mb-4`}>
            현재 문의 모드: <strong className="[color:var(--spokedu-marketing-color-navy)]">{active.title}</strong> — {curriculumSubmitLabel(mode)}
          </p>
          <CurriculumInquiryForm
            leadMode={mode}
            formDefaults={active.formDefaults}
            onLeadModeChange={(next) => setMode(next, 'inquiry')}
          />
        </div>
        {mode === 'master' ? (
          <p className={`${marketingBody} mt-4`}>
            개인 지도자는 <Link href={publicProduct.handoff.freeStartHref} className="font-semibold [color:var(--spokedu-marketing-color-blue)] underline">무료로 시작하기</Link>가 우선 경로입니다. 이 폼은 센터·기관 구독 문의용입니다.
          </p>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <SubscriptionV17Page mode={mode} onModeChange={setMode} inquiry={inquiry} reducedMotion={reducedMotion} />
  );
}
