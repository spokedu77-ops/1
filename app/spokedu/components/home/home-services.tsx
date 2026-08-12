'use client';

import Image from 'next/image';
import { homePage, type HomePillarItem } from '../../data/home-page';
import {
  marketingBandSoft,
  marketingButtonTextAction,
  marketingCardInteractive,
  marketingCardPadding,
  marketingEyebrow,
  marketingSectionDisplay,
  marketingSectionInner,
  marketingSectionLead,
  marketingSectionPad,
  homeSectionScrollMt,
} from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';

export function HomeServices() {
  return (
    <section id="paths" className={`${homeSectionScrollMt} ${marketingBandSoft} ${marketingSectionPad}`} aria-labelledby="home-paths-heading">
      <div className={marketingSectionInner}>
        <p className={marketingEyebrow}>{homePage.pillars.eyebrow}</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <h2 id="home-paths-heading" className={`${marketingSectionDisplay} whitespace-pre-line`}>{homePage.pillars.title}</h2>
          <p className={`${marketingSectionLead} lg:justify-self-end`}>{homePage.pillars.lead}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {homePage.pillars.items.map((item, index) => <PathCard key={item.id} item={item} index={index} />)}
        </div>
        <p className="mt-7 text-sm font-semibold text-[#536279]">{homePage.pillars.relationLine}</p>
      </div>
    </section>
  );
}

function PathCard({ item, index }: { item: HomePillarItem; index: number }) {
  return (
    <article className={`${marketingCardInteractive} group flex h-full flex-col overflow-hidden border-[#D8E1EE]`}>
      <div className="relative aspect-[16/9] overflow-hidden border-b border-[#DFE6F1] bg-[#EAF1FF]">
        <Image src={item.visual.src} alt={item.visual.alt} fill sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 92vw" className={item.visual.fit === 'contain' ? 'object-contain p-3' : 'object-cover transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]'} />
      </div>
      <div className={`${marketingCardPadding} flex flex-1 flex-col`}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-extrabold text-[#245DFF]">0{index + 1}</span>
          <span className="text-xs font-bold text-[#6D7B90]">{item.badge}</span>
        </div>
        <h3 className="mt-5 text-[1.75rem] font-black leading-none tracking-[-0.035em] text-[#0B1F46]">{item.title}</h3>
        <p className="mt-3 text-[15px] font-medium leading-[1.7] text-[#536279]">{item.role}</p>
        {item.relationNote ? <p className="mt-3 text-xs font-bold text-[#245DFF]">{item.relationNote}</p> : null}
        <TrackedLink href={item.href} trackLabel={item.trackLabel} className={`${marketingButtonTextAction} mt-auto pt-5`}>
          {item.ctaLabel}<HomeChevron />
        </TrackedLink>
      </div>
    </article>
  );
}
