'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { aboutFounder, ABOUT_FOUNDER_IMAGE } from '../data/about-founder';
import { koreanLineBreak } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { HomeSectionHeading } from './home-section-heading';

export function AboutFounderSection() {
  const reducedMotion = useReducedMotion();

  return (
    <div id={aboutFounder.id} className="scroll-mt-20 space-y-4 sm:space-y-5">
      <HomeSectionHeading
        eyebrow={aboutFounder.eyebrow}
        title={aboutFounder.title}
        lead={aboutFounder.role}
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] lg:divide-x lg:divide-slate-100">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6 lg:border-b-0 lg:p-7 xl:p-8">
            <div className="mx-auto w-full max-w-[17.5rem] lg:mx-0 lg:max-w-none">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200/80">
                <ExternalPhoto
                  src={ABOUT_FOUNDER_IMAGE}
                  alt="스포키듀 대표 최지훈"
                  className="absolute inset-0"
                  fit="cover"
                  priority
                />
              </div>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                {aboutFounder.message.lead}
              </p>
              <p className={`mt-1.5 text-sm font-semibold leading-snug text-slate-900 ${koreanLineBreak}`}>
                {aboutFounder.role}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <h3 className="text-sm font-bold text-slate-950">경력 · 활동</h3>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {aboutFounder.credentials.map((line) => (
                  <li
                    key={line}
                    className={`flex gap-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/30 px-4 py-5 sm:px-6 sm:py-6">
              <h3 className="text-sm font-bold text-slate-950">{aboutFounder.philosophy.title}</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {aboutFounder.philosophy.items.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-lg border border-slate-200/70 bg-white/90 px-3 py-2.5"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                      {item.label}
                    </p>
                    <p className={`mt-1 text-sm leading-snug text-slate-600 ${koreanLineBreak}`}>
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <div className={`max-w-3xl space-y-2.5 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
                {aboutFounder.message.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">대표이사 {aboutFounder.title}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
