'use client';

import { useEffect, useState } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import { siteBtnPrimary, siteBtnSecondary } from '../lib/ui-classes';

type LandingFloatingCtaProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  showAfterId?: string;
};

/** 스크롤 후 하단 고정 CTA — private/dispatch 전환 보강용 */
export function LandingFloatingCta({
  primaryHref,
  primaryLabel,
  secondaryHref = brandContactLinks.phone,
  secondaryLabel = `전화 ${brandProfile.phone}`,
  showAfterId = 'hero',
}: LandingFloatingCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById(showAfterId);
      const threshold = hero ? hero.offsetHeight * 0.55 : 420;
      setVisible(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfterId]);

  if (!visible) return null;

  const secondaryIsExternal = secondaryHref.startsWith('http');
  const primaryIsExternal = primaryHref.startsWith('http');

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <a
          href={secondaryHref}
          className={`${siteBtnSecondary} w-full sm:w-auto`}
          {...(secondaryIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {secondaryLabel}
        </a>
        <a
          href={primaryHref}
          className={`${siteBtnPrimary} w-full sm:w-auto`}
          {...(primaryIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {primaryLabel}
        </a>
      </div>
    </div>
  );
}
