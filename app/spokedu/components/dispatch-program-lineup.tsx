'use client';

import Link from 'next/link';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import { brandFocusRing, marketingCardInteractive, marketingInteractiveTransition, koreanLineBreak } from '../lib/ui-classes';
import { LandingSectionHeading } from './landing-section-heading';
import { MediaPanel } from './visual';

const focusRing = brandFocusRing;
const premiumRowLayout = 'flex flex-col overflow-hidden sm:flex-row';

export const dispatchEvidenceVisuals: Record<
  string,
  {
    eyebrow: string;
    title: string;
    steps: readonly string[];
    note: string;
    tone: string;
  }
> = {
  'monthly-sports': {
    eyebrow: 'MONTHLY',
    title: '월별 종목 순환',
    steps: ['플로어볼', '플래그풋볼', '컬링', '피클볼'],
    note: '종목이 바뀌어도 협동·판단·규칙 이해는 유지합니다.',
    tone: 'from-sky-500 via-cyan-600 to-slate-900',
  },
  'slow-sports': {
    eyebrow: 'ADAPTIVE',
    title: '단계 조절 흐름',
    steps: ['속도 낮춤', '규칙 단순화', '보조 동선', '성공 반복'],
    note: '참여자 속도에 맞춰 과제 난이도와 반응 시간을 조절합니다.',
    tone: 'from-violet-500 via-indigo-700 to-slate-900',
  },
  'mini-olympics': {
    eyebrow: 'TEAM PLAY',
    title: '팀 경기 운영',
    steps: ['팀 편성', '순환 경기', '응원', '시상'],
    note: '승패보다 역할 수행과 함께 참여하는 경험을 설계합니다.',
    tone: 'from-amber-400 via-orange-600 to-slate-900',
  },
  'sports-booth': {
    eyebrow: 'BOOTH',
    title: '부스 순환 동선',
    steps: ['접수', '대기', '체험', '회전'],
    note: '짧은 체류 시간에도 여러 종목을 안정적으로 경험하게 합니다.',
    tone: 'from-lime-500 via-emerald-700 to-slate-900',
  },
  custom: {
    eyebrow: 'CUSTOM',
    title: '조건 기반 설계',
    steps: ['대상', '공간', '목적', '운영안'],
    note: '기관 조건을 먼저 확인한 뒤 프로그램과 동선을 조합합니다.',
    tone: 'from-indigo-500 via-blue-700 to-slate-900',
  },
};

function DispatchEvidencePanel({ itemId }: { itemId: string }) {
  const visual = dispatchEvidenceVisuals[itemId];
  if (!visual) return null;

  return (
    <div
      className={`absolute inset-0 flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${visual.tone} p-4 text-white`}
      data-dispatch-evidence-visual={itemId}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">{visual.eyebrow}</p>
        <p className="mt-1 text-lg font-black leading-tight [word-break:keep-all]">{visual.title}</p>
      </div>
      <div className="relative grid grid-cols-2 gap-2">
        {visual.steps.map((step, index) => (
          <div key={step} className="rounded-xl border border-white/20 bg-white/12 px-2.5 py-2 backdrop-blur-sm">
            <span className="block text-[10px] font-black text-white/55">{String(index + 1).padStart(2, '0')}</span>
            <span className="mt-0.5 block text-[12px] font-bold leading-tight [word-break:keep-all]">{step}</span>
          </div>
        ))}
      </div>
      <p className="relative text-[11px] font-medium leading-relaxed text-white/72 [word-break:keep-all]">
        {visual.note}
      </p>
    </div>
  );
}

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
          const media = HOME_MEDIA[mediaKey];
          const isStructuredVisual = media.type === 'visual';

          const row = (
            <div className={`${marketingCardInteractive} ${premiumRowLayout}`}>
              <div className="relative h-[9.5rem] w-full shrink-0 overflow-hidden bg-stone-100 sm:h-auto sm:min-h-[8.5rem] sm:w-[32%] lg:w-[30%]">
                {isStructuredVisual ? (
                  <DispatchEvidencePanel itemId={id} />
                ) : (
                  <MediaPanel
                    media={media}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                    photoPriority={index === 0}
                  />
                )}
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
                  className={`block ${marketingInteractiveTransition} ${focusRing}`}
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
