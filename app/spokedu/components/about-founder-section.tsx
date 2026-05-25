'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { aboutFounder, ABOUT_FOUNDER_IMAGE } from '../data/about-founder';
import { koreanLineBreak } from '../lib/ui-classes';
import { HomeSectionHeading } from './home-section-heading';

export function AboutFounderSection() {
  const reducedMotion = useReducedMotion();

  return (
    <div id={aboutFounder.id} className="scroll-mt-20 space-y-4 sm:space-y-5">
      <HomeSectionHeading
        eyebrow={aboutFounder.eyebrow}
        title={aboutFounder.title}
        lead={`${aboutFounder.role} — 현장 수업과 프로그램 운영을 이끕니다.`}
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-[minmax(0,13.5rem)_1fr] lg:divide-x lg:divide-slate-100">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 lg:border-b-0 lg:p-5">
            <div className="mx-auto w-full max-w-[13.5rem] lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={ABOUT_FOUNDER_IMAGE}
                  alt="스포키듀 대표 최지훈"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 216px, 216px"
                />
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                {aboutFounder.message.lead}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{aboutFounder.role}</p>
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
