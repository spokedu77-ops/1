'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { aboutHistory } from '../data/about-history';
import { koreanLineBreak } from '../lib/ui-classes';
import { HomeSectionHeading } from './home-section-heading';

export function AboutHistorySection() {
  const reducedMotion = useReducedMotion();

  return (
    <div id={aboutHistory.id} className="scroll-mt-20 space-y-4 sm:space-y-5">
      <HomeSectionHeading eyebrow={aboutHistory.eyebrow} title={aboutHistory.title} lead={aboutHistory.lead} />

      <div className="space-y-6 sm:space-y-7">
        {aboutHistory.periods.map((period, periodIndex) => (
          <motion.section
            key={period.id}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.06 }}
            transition={{ duration: 0.4, delay: 0.04 * periodIndex }}
            aria-labelledby={`history-${period.id}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-2">
              <h3 id={`history-${period.id}`} className="text-base font-bold text-slate-950 sm:text-lg">
                {period.label}
              </h3>
              <span className="text-xs text-slate-500">{period.milestones.length}건</span>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:gap-x-8 xl:grid-cols-3">
              {period.milestones.map((item) => (
                <li
                  key={`${period.id}-${item.date}-${item.text}`}
                  className={`flex gap-2.5 rounded-lg px-2 py-2 sm:px-2.5 ${
                    item.highlight ? 'bg-amber-50/80 ring-1 ring-amber-100/80' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <time
                    dateTime={item.date.replace(/\s/g, '')}
                    className="w-[4.25rem] shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-slate-500"
                  >
                    {item.date}
                  </time>
                  <p
                    className={`flex-1 text-sm leading-snug ${koreanLineBreak} ${
                      item.highlight ? 'font-semibold text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>

      <p className={`text-xs leading-relaxed text-slate-500 ${koreanLineBreak}`}>
        주요 파트너십·캠프·미디어 활동은 강조 표시했습니다.
      </p>
    </div>
  );
}
