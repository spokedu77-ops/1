'use client';

import Link from 'next/link';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, koreanLineBreak } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { LandingSectionHeading } from './landing-section-heading';
import { MediaPanel } from './visual';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

const premiumRow =
  'flex flex-col overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] sm:flex-row';

export function DispatchProgramLineup() {
  const section = dispatchPage.programLineup;

  return (
    <div className="space-y-4">
      <LandingSectionHeading
        eyebrow={section.eyebrow}
        title={section.title}
        lead={section.lead}
        accent="teal"
      />
      <div className="flex flex-col gap-3">
        {section.items.map((item, index) => {
          const {
            id,
            name,
            image,
            imageAlt,
            audience,
            subtitle,
            paragraphs,
            tags,
            example,
            mediaKey,
            href,
            trackLabel,
          } = item;

          const wrapperClassName = item.id === 'slow-sports' ? 'scroll-mt-20' : undefined;
          const itemId = item.id === 'slow-sports' ? 'special' : undefined;
          const summary = paragraphs[0];

          const row = (
            <div className={premiumRow}>
              <div className="relative h-[9.5rem] w-full shrink-0 overflow-hidden bg-stone-100 sm:h-auto sm:min-h-[8.5rem] sm:w-[32%] lg:w-[30%]">
                {image ? (
                  <ExternalPhoto
                    src={image}
                    alt={imageAlt ?? name}
                    className="absolute inset-0 h-full w-full"
                    fit="cover"
                    priority={index === 0}
                  />
                ) : mediaKey ? (
                  <MediaPanel
                    media={HOME_MEDIA[mediaKey]}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                    photoPriority={index === 0}
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col border-t border-stone-100 p-3.5 sm:border-l sm:border-t-0 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800">{audience}</p>
                <h3 className="mt-0.5 text-base font-semibold text-slate-950">{name}</h3>
                <p className="mt-0.5 text-sm text-teal-900">{subtitle}</p>
                {summary ? (
                  <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{summary}</p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[11px] font-medium text-stone-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs font-medium text-teal-800">{example}</p>
              </div>
            </div>
          );

          if (href) {
            return (
              <div key={id} id={itemId} className={wrapperClassName}>
                <Link
                  href={href}
                  data-track={inferTrackFromHref(href)}
                  data-track-label={trackLabel}
                  className={`block ${cardInteractive} ${focusRing}`}
                >
                  {row}
                </Link>
              </div>
            );
          }

          return (
            <article key={id} id={itemId} className={wrapperClassName}>
              {row}
            </article>
          );
        })}
      </div>
    </div>
  );
}
