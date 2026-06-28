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
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

export function DispatchProgramLineup() {
  const section = dispatchPage.programLineup;

  return (
    <div id="programs" className="scroll-mt-20 space-y-5 sm:space-y-6">
      <LandingSectionHeading
        eyebrow={section.eyebrow}
        title={section.title}
        lead={section.lead}
        accent="teal"
      />
      <div className="flex flex-col gap-4">
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

          const body = (
            <div className="flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white sm:flex-row">
              <div className="relative h-[12.5rem] w-full shrink-0 overflow-hidden bg-slate-100 sm:h-[13.75rem] sm:w-[38%] lg:h-[15rem] lg:w-[36%]">
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
              <div className="flex min-w-0 flex-1 flex-col border-t border-slate-100 p-4 sm:border-l sm:border-t-0 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800">{audience}</p>
                <h3 className="mt-1 text-base font-semibold text-slate-950 sm:text-lg">{name}</h3>
                <p className="mt-0.5 text-sm text-teal-900">{subtitle}</p>
                <div className="mt-2.5 space-y-1.5">
                  {paragraphs.map((p) => (
                    <p key={p} className={`text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                      {p}
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 text-xs font-medium text-teal-800">{example}</p>
              </div>
            </div>
          );

          if (href) {
            return (
              <Link
                key={id}
                href={href}
                data-track={inferTrackFromHref(href)}
                data-track-label={trackLabel}
                className={`block ${cardInteractive} ${focusRing}`}
              >
                {body}
              </Link>
            );
          }

          return (
            <article key={id} className="shadow-sm shadow-slate-900/[0.02]">
              {body}
            </article>
          );
        })}
      </div>
    </div>
  );
}
