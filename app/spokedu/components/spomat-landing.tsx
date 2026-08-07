'use client';

import Image from 'next/image';
import { SPOKEDU_IMAGES } from '../data/images';
import { spomatPage } from '../data/spomat-page';
import { HOME_MEDIA } from '../data/home-media';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  homeFocusRing,
  homeSectionEyebrow,
  homeSectionH2,
  homeSectionPadCompact,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';

/** SPOMAT 상세 — 실행 도구 설명 (가격 비공개) */
export function SpomatLanding() {
  const { definition, structure, usage, examples, specs, purchase } = spomatPage;
  const spomatImage = SPOKEDU_IMAGES.brand.spomat;

  return (
    <main className="w-full overflow-x-clip" data-spokedu-spomat-sections={spomatPage.sectionOrder.length}>
      <section id={definition.id} className={`${homeSectionPadCompact} bg-white`}>
        <div className={`${siteContainer} grid gap-8 lg:grid-cols-2 lg:items-center`}>
          <div>
            <p className={homeSectionEyebrow}>{definition.eyebrow}</p>
            <h1 className={`${homeSectionH2} mt-3`}>{definition.title}</h1>
            <p className={`${homeBodyLead} mt-4`}>{definition.lead}</p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50">
            <Image
              src={spomatImage.src}
              alt={spomatImage.alt}
              fill
              className="object-contain p-8"
              sizes="(max-width: 768px) 90vw, 400px"
              priority
            />
          </div>
        </div>
      </section>

      <section id={structure.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{structure.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{structure.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] text-[#536279] ${koreanText}`}>{structure.lead}</p>
          <ul className="mt-8 mx-auto grid max-w-sm grid-cols-2 gap-3" aria-label="SPOMAT 2×2 색 위치">
            {structure.cells.map((cell) => (
              <li
                key={cell.name}
                className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/40 text-white shadow-sm"
                style={{ background: cell.hex }}
              >
                <span className="text-xs font-bold tracking-[0.12em]">{cell.name}</span>
                <span className="mt-1 text-sm font-semibold">{cell.ko}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={usage.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{usage.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{usage.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] text-[#536279] ${koreanText}`}>{usage.lead}</p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {usage.points.map((point, index) => (
              <li key={point.title} className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-4">
                <p className="text-[11px] font-bold" style={{ color: brandBlue }}>
                  {index + 1}
                </p>
                <h3 className={`mt-1 text-sm font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {point.title}
                </h3>
                <p className={`mt-1.5 text-sm text-[#536279] ${koreanText}`}>{point.body}</p>
              </li>
            ))}
          </ol>
          <div className="relative mt-8 aspect-[16/10] max-w-3xl overflow-hidden rounded-2xl border border-stone-200">
            <MediaPanel
              media={HOME_MEDIA[definition.mediaKey]}
              className="absolute inset-0 h-full w-full border-0 rounded-none"
              sizes="hero"
              objectFit="cover"
            />
          </div>
        </div>
      </section>

      <section id={examples.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{examples.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{examples.title}</h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {examples.items.map((item) => (
              <li key={item.title} className="rounded-2xl border border-[#D6E3FF] bg-white px-5 py-5">
                <h3 className={`text-base font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {item.title}
                </h3>
                <p className={`mt-2 text-sm text-[#536279] ${koreanText}`}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={specs.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{specs.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{specs.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] text-[#536279] ${koreanText}`}>{specs.lead}</p>
          <dl className="mt-8 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-3">
            {specs.items.map((item) => (
              <div key={item.label} className="contents">
                <dt className="text-sm font-semibold text-stone-500">{item.label}</dt>
                <dd className={`text-sm font-medium ${koreanText}`} style={{ color: brandInk }}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className={`mt-4 text-sm text-[#536279] ${koreanText}`}>{specs.note}</p>
        </div>
      </section>

      <section id={purchase.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`}>
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{purchase.eyebrow}</p>
          <h2 className={`${homeSectionH2} mt-3`}>{purchase.title}</h2>
          <p className={`mt-3 max-w-2xl text-[15px] text-[#536279] ${koreanText}`}>{purchase.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href={purchase.primary.href}
              trackLabel={purchase.primary.trackLabel}
              commercialRoute="curriculum"
              ctaIntentId="master_handoff"
              className={`${siteBtnPrimary} h-12 px-7 ${homeFocusRing}`}
            >
              {purchase.primary.label}
            </TrackedLink>
            {purchase.secondary.map((item) => (
              <TrackedLink
                key={item.href}
                href={item.href}
                trackLabel={item.trackLabel}
                className={`${siteBtnSecondary} h-12 px-7 ${homeFocusRing}`}
              >
                {item.label}
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
