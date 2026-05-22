'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../../data/home-media';
import type { HomeProgramSystemItem } from '../../data/home-page';
import { cardInteractive } from '../../lib/ui-classes';
import { inferTrackFromHref } from '../../lib/tracking';
import { MediaPanel } from './media-panel';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

function ProgramFeaturedCard({ item }: { item: HomeProgramSystemItem }) {
  const media = HOME_MEDIA[item.mediaKey];

  return (
    <Link
      href={item.href}
      data-track={inferTrackFromHref(item.href)}
      data-track-label={item.trackLabel}
      className={`group flex h-full min-h-[280px] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-md lg:min-h-[400px] ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel
        media={media}
        className="min-h-[200px] flex-1 rounded-none border-0 transition duration-500 group-hover:scale-[1.02] sm:min-h-[220px] lg:min-h-[300px] lg:aspect-[4/3]"
      />
      <div className="border-t border-slate-100 bg-gradient-to-r from-white via-indigo-50/30 to-sky-50/40 px-4 py-4 sm:px-5 sm:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">대표 프로그램</p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{item.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-slate-600 [word-break:keep-all]">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

function ProgramCompactCard({ item }: { item: HomeProgramSystemItem }) {
  const media = HOME_MEDIA[item.mediaKey];

  return (
    <Link
      href={item.href}
      data-track={inferTrackFromHref(item.href)}
      data-track-label={item.trackLabel}
      className={`group flex h-full min-h-[136px] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/6 sm:min-h-[148px] lg:min-h-[200px] ${cardInteractive} ${focusRing}`}
    >
      <MediaPanel media={media} className="min-h-[88px] flex-1 rounded-none border-0 sm:min-h-[92px] lg:min-h-[110px] lg:aspect-[16/10]" />
      <div className="border-t border-slate-100 bg-white px-2.5 py-2.5 sm:px-3">
        <h3 className="text-sm font-bold text-slate-950 sm:text-[15px]">{item.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 [word-break:keep-all]">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

type HomeProgramSystemProps = {
  items: readonly HomeProgramSystemItem[];
};

export function HomeProgramSystem({ items }: HomeProgramSystemProps) {
  const reducedMotion = useReducedMotion();
  const featured = items.find((item) => item.featured) ?? items[0];
  const compact = items.filter((item) => item.id !== featured.id);

  const panelClass =
    'overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-indigo-50/30 p-3 sm:rounded-[1.75rem] sm:p-4 lg:p-5';

  return (
    <div className={panelClass} role="region" aria-label="프로그램 시스템">
      <div className="mb-2.5 h-1 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-violet-400 opacity-90" aria-hidden />
      <div className="space-y-2.5 lg:hidden" role="list">
        <motion.div
          role="listitem"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
        >
          <ProgramFeaturedCard item={featured} />
        </motion.div>
        <div className="grid grid-cols-2 gap-2.5" role="presentation">
          {compact.map((item, index) => (
            <motion.div
              key={item.id}
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.04 * index }}
            >
              <ProgramCompactCard item={item} />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="hidden gap-3.5 lg:grid lg:grid-cols-[1.22fr_1fr]" role="list">
        <motion.div
          role="listitem"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <ProgramFeaturedCard item={featured} />
        </motion.div>
        <div className="grid grid-cols-2 grid-rows-2 gap-2.5">
          {compact.map((item, index) => (
            <motion.div
              key={item.id}
              role="listitem"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <ProgramCompactCard item={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
