'use client';

import { homeBandSoftBlue, homeFocusRing, homeSectionH2, homeSectionScrollMt, koreanText, siteBtnPrimary, siteBtnSecondary, siteContainer } from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';

export function HomeFinalCta() {
  const [education, subscription, contact] = [
    { label: '체육교육 알아보기', href: '/education', trackLabel: 'cta-home-final-education' },
    { label: '구독시스템 알아보기', href: '/subscription', trackLabel: 'cta-home-final-subscription' },
    { label: '문의·협업 시작하기', href: '/contact', trackLabel: 'cta-home-final-contact' },
  ];
  return (
    <section id="final-action" className={`${homeSectionScrollMt} ${homeBandSoftBlue} py-12 sm:py-14`} aria-labelledby="home-final-action-heading">
      <div className={siteContainer}>
        <div className="flex flex-col gap-6 border-y border-[#D6E3FF] py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:py-10">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#245DFF]">다음 단계</p>
            <h2 id="home-final-action-heading" className={`${homeSectionH2} mt-3 text-[#0B1F46]`}>필요한 것부터 시작하세요.</h2>
            <p className={`mt-3 text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>직접 수업을 찾거나, 현장에서 쓸 수 있는 시스템을 살펴보세요.</p>
          </div>
          <div className="grid w-full shrink-0 gap-2 sm:w-auto sm:min-w-[17rem]">
            {[education, subscription, contact].map((item, index) => (
              <TrackedLink key={item.trackLabel} href={item.href} trackLabel={item.trackLabel} className={`${index === 0 ? siteBtnPrimary : siteBtnSecondary} ${homeFocusRing} min-h-11 w-full`}>{item.label}</TrackedLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
