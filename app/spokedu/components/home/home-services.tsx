'use client';

import Image from 'next/image';
import { homePage, type HomePillarItem } from '../../data/home-page';
import {
  marketingBandSoft,
  marketingButtonTextAction,
  marketingEyebrow,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
  homeSectionScrollMt,
} from '../../lib/ui-classes';
import { ProductVisualFrame } from '../product-visual-frame';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';
import styles from './home-canonical.module.css';

export function HomeServices() {
  return (
    <section id={homePage.pillars.id} className={`${homeSectionScrollMt} ${marketingBandSoft} ${marketingSectionPad}`} aria-labelledby="home-pillars-heading">
      <div className={marketingSectionInner}>
        <p className={marketingEyebrow}>{homePage.pillars.eyebrow}</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <h2 id="home-pillars-heading" className={`${marketingSectionDisplay} ${styles.sectionTitle} whitespace-pre-line`}>{homePage.pillars.title}</h2>
          <p className={`${marketingSectionLead} lg:justify-self-end`}>{homePage.pillars.lead}</p>
        </div>
        <div className="mt-10 grid gap-5 min-[820px]:grid-cols-12">
          {homePage.pillars.items.map((item, index) => <PathComposition key={item.id} item={item} index={index} />)}
        </div>
        <p className="mt-7 text-sm font-semibold text-[#536279]">{homePage.pillars.relationLine}</p>
        <dl className="mt-8 grid gap-5 border-t border-[var(--spokedu-marketing-color-border)] pt-6 sm:grid-cols-3">
          {homePage.evidenceStrip.items.slice(0, 3).map((item) => (
            <div key={item.value}>
              <dt className="text-sm font-bold [color:var(--spokedu-marketing-color-navy)]">{item.value}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed [color:var(--spokedu-marketing-color-muted)]">{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function PathComposition({ item, index }: { item: HomePillarItem; index: number }) {
  if (index === 2) {
    return (
      <article className={`${styles.gatewayCard} ${styles.gatewayProduct} relative overflow-hidden p-5 sm:p-7 min-[820px]:col-span-12 lg:grid lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-10 lg:p-10`}>
        <PathCopy item={item} index={index} className="pb-6 lg:pb-0" />
        <ProductVisualFrame src={item.visual.src} alt={item.visual.alt} emphasis="feature" aspectClassName="aspect-[2.6/1] min-h-[16rem]" />
      </article>
    );
  }

  const education = index === 0;
  return (
    <article className={`${styles.gatewayCard} group relative overflow-hidden ${education ? 'bg-[#0B1F46] min-[820px]:col-span-7' : 'bg-[#07152F] min-[820px]:col-span-5'}`}>
      <Image src={item.visual.src} alt={item.visual.alt} fill sizes={education ? '(min-width: 1024px) 58vw, 92vw' : '(min-width: 1024px) 42vw, 92vw'} className="object-cover transition duration-700 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.025]" />
      <div className={`absolute inset-0 ${education ? 'bg-gradient-to-t from-[#07152F]/95 via-[#0B1F46]/35 to-transparent' : 'bg-gradient-to-t from-[#050D20]/95 via-[#07152F]/50 to-[#245DFF]/10'}`} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <PathCopy item={item} index={index} dark />
      </div>
    </article>
  );
}

function PathCopy({ item, index, dark = false, className = '' }: { item: HomePillarItem; index: number; dark?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <span className={`text-xs font-extrabold ${dark ? 'text-[#8EB0FF]' : 'text-[#245DFF]'}`}>0{index + 1}</span>
        <span className={`text-xs font-bold ${dark ? 'text-white/70' : 'text-[#6D7B90]'}`}>{item.badge}</span>
      </div>
      <h3 className={`mt-5 text-[2rem] font-black leading-none tracking-[-0.035em] ${dark ? 'text-white' : 'text-[#0B1F46]'}`}>{item.title}</h3>
      <p className={`mt-4 max-w-xl text-[15px] font-medium leading-[1.7] ${dark ? 'text-white/78' : 'text-[#536279]'}`}>{item.role}</p>
      {item.relationNote ? <p className={`mt-3 text-xs font-bold ${dark ? 'text-[#9FC0FF]' : 'text-[#245DFF]'}`}>{item.relationNote}</p> : null}
      <TrackedLink href={item.href} trackLabel={item.trackLabel} className={`${marketingButtonTextAction} mt-5 ${dark ? '!text-white' : ''}`}>
        {item.ctaLabel}<HomeChevron />
      </TrackedLink>
    </div>
  );
}
