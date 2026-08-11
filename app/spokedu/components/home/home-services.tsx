'use client';

import { homePage } from '../../data/home-page';
import { brandBlue, brandInk, homeBandSoftBlue, homeFocusRing, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteBtnPrimary, siteBtnSecondary, siteContainer } from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeServices() {
  const { education, subscription } = homePage.services;
  return (
    <section id="services" className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandSoftBlue}`} aria-labelledby="home-services-heading">
      <div className={siteContainer}>
        <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>서비스</p>
        <h2 id="home-services-heading" className={`${homeSectionH2} mt-3`}>무엇을 시작할지 고르세요.</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <ServiceCard item={education} links={education.directLinks} primary={education.href} />
          <ServiceCard item={subscription} links={[]} primary={subscription.href} />
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ item, links, primary }: { item: { title: string; summary: string; ctaLabel: string; href: string; trackLabel: string; directLinks?: readonly { label: string; href: string; trackLabel: string }[] }; links: readonly { label: string; href: string; trackLabel: string }[]; primary: string }) {
  return (
    <article className={`${homeFocusRing} rounded-[1.5rem] border border-[#DCE3EE] bg-white p-6 shadow-[0_12px_32px_rgba(15,33,70,0.05)] sm:p-8`}>
      <h3 className={`mt-2 text-2xl font-bold tracking-[-0.03em] ${koreanText}`} style={{ color: brandInk }}>{item.title}</h3>
      <p className={`mt-3 max-w-lg text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{item.summary}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <TrackedLink href={primary} trackLabel={item.trackLabel} className={`${siteBtnPrimary} ${homeFocusRing}`}>{item.ctaLabel}</TrackedLink>
        {links.map((link) => <TrackedLink key={link.href} href={link.href} trackLabel={link.trackLabel} className={`${siteBtnSecondary} ${homeFocusRing}`}>{link.label}<HomeChevron /></TrackedLink>)}
      </div>
    </article>
  );
}
