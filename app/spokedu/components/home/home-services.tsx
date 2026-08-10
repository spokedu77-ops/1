'use client';

import { homePage } from '../../data/home-page';
import { brandBlue, brandInk, homeBandSoftBlue, homeFocusRing, homeSectionH2, homeSectionPadCompact, homeSectionScrollMt, koreanText, siteBtnPrimary, siteBtnSecondary, siteContainer } from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeServices() {
  const education = homePage.pillars.items.find((item) => item.id === 'education');
  const curriculum = homePage.pillars.items.find((item) => item.id === 'curriculum');
  if (!education || !curriculum) return null;
  return (
    <section id="services" className={`${homeSectionScrollMt} ${homeSectionPadCompact} ${homeBandSoftBlue}`} aria-labelledby="home-services-heading">
      <div className={siteContainer}>
        <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>서비스</p>
        <h2 id="home-services-heading" className={`${homeSectionH2} mt-3`}>무엇을 시작할지 고르세요.</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <ServiceCard item={education} links={homePage.audienceGate.items.filter((item) => item.id === 'dispatch' || item.id === 'private')} primary={education.href} />
          <ServiceCard item={curriculum} links={[]} primary={curriculum.href} />
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ item, links, primary }: { item: (typeof homePage.pillars.items)[number]; links: readonly { title: string; href: string; trackLabel: string }[]; primary: string }) {
  return (
    <article className={`${homeFocusRing} rounded-[1.5rem] border border-[#DCE3EE] bg-white p-6 shadow-[0_12px_32px_rgba(15,33,70,0.05)] sm:p-8`}>
      <p className="text-[11px] font-bold tracking-[0.12em]" style={{ color: brandBlue }}>{item.badge}</p>
      <h3 className={`mt-2 text-2xl font-bold tracking-[-0.03em] ${koreanText}`} style={{ color: brandInk }}>{item.title}</h3>
      <p className={`mt-3 max-w-lg text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>{item.role}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {item.examples.slice(0, 2).map((example) => <span key={example} className={`rounded-full bg-[#F1F5FB] px-3 py-1 text-xs font-semibold text-[#405577] ${koreanText}`}>{example}</span>)}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <TrackedLink href={primary} trackLabel={item.trackLabel} className={`${siteBtnPrimary} ${homeFocusRing}`}>{item.ctaLabel}</TrackedLink>
        {links.map((link) => <TrackedLink key={link.href} href={link.href} trackLabel={link.trackLabel} className={`${siteBtnSecondary} ${homeFocusRing}`}>{link.title}<HomeChevron /></TrackedLink>)}
      </div>
    </article>
  );
}
