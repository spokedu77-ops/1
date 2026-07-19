'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { NewsportsTheme } from '../data/newsports-themes';
import { NEWSPORTS_THEMES } from '../data/newsports-themes';
import { SPOKEDU_FALLBACK_FIELD } from '../data/images';
import { cardInteractive, koreanLineBreak } from '../lib/ui-classes';
import { HomeSectionHeading } from './home-section-heading';

const cardShell = `flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.04] ${cardInteractive}`;

function ThemePhoto({ theme, priority }: { theme: NewsportsTheme; priority?: boolean }) {
  const [src, setSrc] = useState(theme.imageSrc);

  return (
    <motion.div
      className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-500 via-sky-500 to-slate-800"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25 }}
    >
      <Image
        src={src}
        alt={theme.imageAlt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover brightness-[1.02] contrast-[1.04] saturate-[1.06]"
        priority={priority}
        quality={75}
        onError={() => {
          if (src !== SPOKEDU_FALLBACK_FIELD) setSrc(SPOKEDU_FALLBACK_FIELD);
        }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent"
        aria-hidden
      />
      <motion.div className="absolute bottom-3 left-3 rounded-xl border border-white/15 bg-slate-950/55 px-3 py-2 text-white backdrop-blur-md">
        <p className="text-xs font-bold tracking-tight">{theme.photoLabel.title}</p>
        <p className="mt-0.5 text-[10px] font-medium text-white/75">{theme.photoLabel.subtitle}</p>
      </motion.div>
    </motion.div>
  );
}

function ThemeCard({ theme, index }: { theme: NewsportsTheme; index: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      id={`theme-${String(theme.order).padStart(2, '0')}`}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4, delay: 0.03 * (index % 6) }}
      className={cardShell}
    >
      <ThemePhoto theme={theme} priority={index < 3} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-950 px-2 text-sm font-black tracking-tight text-white"
            aria-label={`${theme.order}번 테마`}
          >
            {String(theme.order).padStart(2, '0')}
          </span>
          <span className="inline-flex min-h-7 items-center rounded-full bg-slate-100 px-2.5 text-[11px] font-bold text-slate-600">
            {theme.tag}
          </span>
        </div>
        <h3 className={`text-lg font-bold tracking-tight text-slate-950 sm:text-xl ${koreanLineBreak}`}>
          {theme.title}
        </h3>
        <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
          {theme.description}
        </p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`${theme.title} 키워드`}>
          {theme.keywords.map((keyword) => (
            <li
              key={keyword}
              className="inline-flex min-h-7 items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700"
            >
              {keyword}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}

type NewsportsThemeGridProps = {
  eyebrow?: string;
  title?: string;
  lead?: string;
  sectionId?: string;
};

export function NewsportsThemeGrid({
  eyebrow = '12 THEMES',
  title = '대표 프로그램',
  lead = '현장 운영성, 아이들의 몰입도, 안전성, 기관 제안 적합도를 기준으로 우선순위를 정리했습니다.',
  sectionId,
}: NewsportsThemeGridProps) {
  return (
    <section id={sectionId} className="scroll-mt-24 space-y-5 sm:space-y-6">
      <HomeSectionHeading eyebrow={eyebrow} title={title} lead={lead} />
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        role="list"
        aria-label="뉴스포츠 12개 테마"
      >
        {NEWSPORTS_THEMES.map((theme, index) => (
          <ThemeCard key={theme.slug} theme={theme} index={index} />
        ))}
      </div>
    </section>
  );
}
