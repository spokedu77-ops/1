'use client';

import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { ProgramRelatedProof } from './program-related-proof';
import { MediaPanel } from './visual';
import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';
import { programDetailBlocks } from '../data/program-details';
import { spomoveProgramPage } from '../data/spomove-program-page';
import {
  audienceLandingStack,
  koreanText,
  landingCardFrame,
  landingCardPanelPad,
  landingSectionTitle,
} from '../lib/ui-classes';

/** 스포매트 실물 배치 — 좌상 초록 · 우상 빨강 · 좌하 파랑 · 우하 노랑 */
const PAD_CELLS = [
  { name: 'GREEN', ko: '초록', hex: '#22C55E' },
  { name: 'RED', ko: '빨강', hex: '#EF4444' },
  { name: 'BLUE', ko: '파랑', hex: '#3B82F6' },
  { name: 'YELLOW', ko: '노랑', hex: '#EAB308' },
] as const;

export const spomoveActivityVisuals: Partial<
  Record<
    HomeMediaKey,
    {
      eyebrow: string;
      title: string;
      cues: readonly string[];
      answer: string;
      tone: string;
    }
  >
> = {
  spomoveSimonScreen: {
    eyebrow: 'SIMON',
    title: '위치 충돌',
    cues: ['자극 위치', '정답 색', '반응 억제', '패드 선택'],
    answer: '보이는 위치가 아니라 규칙에 맞는 색 패드로 이동',
    tone: 'from-red-500 via-violet-700 to-slate-950',
  },
  spomoveFlankerScreen: {
    eyebrow: 'FLANKER',
    title: '방해 자극 분리',
    cues: ['주변 화살표', '가운데 목표', '선택 주의', '정확도'],
    answer: '주변 정보는 버리고 가운데 목표 방향만 선택',
    tone: 'from-blue-500 via-indigo-700 to-slate-950',
  },
  spomoveStroopScreen: {
    eyebrow: 'STROOP',
    title: '의미와 색 충돌',
    cues: ['글자 의미', '표시 색', '규칙 전환', '반응 통제'],
    answer: '읽히는 단어가 아니라 현재 규칙의 색 정보를 선택',
    tone: 'from-emerald-500 via-teal-700 to-slate-950',
  },
  spomoveDiveScreen: {
    eyebrow: 'DIVE',
    title: '가상 공간 반응',
    cues: ['색 게이트', '장애물', '점프·회피', '전신 반응'],
    answer: '화면 속 신호를 보고 4색 패드와 몸 동작으로 수행',
    tone: 'from-cyan-500 via-blue-800 to-slate-950',
  },
};

function SpomoveActivityVisualPanel({ mediaKey }: { mediaKey: HomeMediaKey }) {
  const visual = spomoveActivityVisuals[mediaKey];
  if (!visual) return null;

  return (
    <div
      className={`absolute inset-0 flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${visual.tone} p-4 text-white`}
      data-spomove-activity-visual={mediaKey}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">{visual.eyebrow}</p>
        <p className={`mt-1 text-lg font-black leading-tight ${koreanText}`}>{visual.title}</p>
      </div>
      <div className="relative grid grid-cols-2 gap-2">
        {visual.cues.map((cue, index) => (
          <div key={cue} className="rounded-xl border border-white/20 bg-white/12 px-2.5 py-2 backdrop-blur-sm">
            <span className="block text-[10px] font-black text-white/55">{String(index + 1).padStart(2, '0')}</span>
            <span className={`mt-0.5 block text-[12px] font-bold leading-tight ${koreanText}`}>{cue}</span>
          </div>
        ))}
      </div>
      <p className={`relative text-[11px] font-medium leading-relaxed text-white/72 ${koreanText}`}>
        {visual.answer}
      </p>
    </div>
  );
}

/**
 * SPOMOVE 프로그램 페이지
 * 맥락: 무엇인지 → 어떻게(패드) → 얼마나 깊어지나 → 현장·도입
 * 홈급 풀블리드 히어로는 쓰지 않음 (서브 랜딩 LandingHero)
 */
export default function SpomoveProgramLanding() {
  const page = spomoveProgramPage;

  return (
    <div className={audienceLandingStack}>
      <LandingHero
        kicker={page.hero.kicker}
        kickerClassName="text-[#245DFF]"
        lines={page.hero.lines}
        subtitle={page.hero.subtitle}
        media={HOME_MEDIA[page.hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={{
          label: page.heroCta.label,
          href: page.heroCta.href,
          trackLabel: page.heroCta.trackLabel,
        }}
        secondaryCta={{
          label: '핵심 구조 보기',
          href: '#how',
          trackLabel: 'program-spomove-how',
        }}
      />

      <ProgramRelatedProof
        fieldRecordSlugs={programDetailBlocks.spomove.fieldRecordSlugs}
        trustLine={programDetailBlocks.spomove.trustLine}
        trackPrefix="program-spomove"
      />

      {/* 1. 무엇인지 */}
      <section className="space-y-5" aria-labelledby="spomove-what">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#245DFF]">01 · 무엇인지</p>
          <h2 id="spomove-what" className={`${landingSectionTitle} mt-2`}>
            {page.overview.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.overview.body}
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="움직임 흐름">
          {page.overview.flow.map((step, index) => (
            <li key={step} className={`flex items-center gap-3 ${landingCardPanelPad} ${landingCardFrame}`}>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tabular-nums text-slate-400">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <p className={`text-sm font-bold text-slate-950 sm:text-base ${koreanText}`}>{step}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 2. 어떻게 — 페이지의 핵심 비주얼 */}
      <section id="how" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200/90 bg-white px-5 py-7 sm:px-7 sm:py-9">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#245DFF]">02 · 어떻게</p>
          <h2 className={`${landingSectionTitle} mt-2`}>{page.padSystem.title}</h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.padSystem.body}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-10">
          <ol className="grid gap-3 sm:grid-cols-2">
            {page.padSystem.points.map((point, index) => (
              <li key={point.title} className={`flex gap-3 ${landingCardPanelPad} border border-slate-200/80 bg-[#F5F7FB]`}>
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                  aria-hidden
                />
                <div>
                  <p className={`font-bold text-slate-950 ${koreanText}`}>{point.title}</p>
                  <p className={`mt-1 text-sm text-slate-600 ${koreanText}`}>{point.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto w-full max-w-[18rem] lg:mx-0 lg:max-w-none">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#F5F7FB] p-2.5 shadow-sm shadow-slate-900/5">
              <div className="relative aspect-square overflow-hidden rounded-[1.15rem] bg-slate-200">
                <MediaPanel
                  media={HOME_MEDIA[page.padSystem.mediaKey]}
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                  objectFit="contain"
                />
              </div>
            </div>
            <p className={`mt-2 text-center text-xs font-semibold text-slate-600 ${koreanText}`}>
              스포매트 · 현장 4색 반응 패드
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5" aria-label="스포매트 색 구성">
              {PAD_CELLS.map((pad) => (
                <li
                  key={pad.name}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pad.hex }} aria-hidden />
                  {pad.ko}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. 얼마나 깊어지나 */}
      <section className="space-y-5" aria-labelledby="spomove-depth">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#245DFF]">03 · 난이도</p>
          <h2 id="spomove-depth" className={`${landingSectionTitle} mt-2`}>
            {page.reactionLevels.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.reactionLevels.lead}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {page.reactionLevels.items.map((item) => (
            <li key={item.title} className={`${landingCardPanelPad} ${landingCardFrame}`}>
              <p className="text-xs font-bold text-[#245DFF]">{item.level.padStart(2, '0')}</p>
              <h3 className={`mt-1.5 text-base font-bold text-slate-950 ${koreanText}`}>{item.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanText}`}>{item.body}</p>
            </li>
          ))}
        </ol>
        <p className={`text-sm text-slate-500 ${koreanText}`}>
          사이먼·플랭커·스트룹 등 인지 과제를 난이도에 맞춰 섞어 운영합니다.
        </p>
      </section>

      {/* 4. 현장 */}
      <section className="space-y-5" aria-labelledby="spomove-field">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#245DFF]">04 · 현장</p>
            <h2 id="spomove-field" className={`${landingSectionTitle} mt-2`}>
              {page.activities.title}
            </h2>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {page.activities.items.map((item, index) => {
            const media = HOME_MEDIA[item.mediaKey];
            const isStructuredVisual = media.type === 'visual';

            return (
            <li key={item.title} className={`overflow-hidden ${landingCardFrame}`}>
              <div className="relative aspect-[16/10]">
                {isStructuredVisual ? (
                  <SpomoveActivityVisualPanel mediaKey={item.mediaKey} />
                ) : (
                  <MediaPanel
                    media={media}
                    className="absolute inset-0 h-full w-full rounded-none border-0"
                    photoPriority={index === 0}
                  />
                )}
              </div>
              <div className={landingCardPanelPad}>
                <h3 className={`font-bold text-slate-950 ${koreanText}`}>{item.title}</h3>
                <p className={`mt-1 text-sm text-slate-600 ${koreanText}`}>{item.description}</p>
              </div>
            </li>
            );
          })}
        </ul>
      </section>

      {/* 도입 */}
      <section className={`space-y-3 ${landingCardPanelPad} ${landingCardFrame}`}>
        <p className="text-xs font-bold tracking-[0.14em] text-[#245DFF]">도입</p>
        <h2 className={`text-xl font-bold text-slate-950 sm:text-2xl ${koreanText}`}>{page.institutionFit.title}</h2>
        <p className={`text-base font-semibold text-[#245DFF] ${koreanText}`}>{page.institutionFit.lead}</p>
        <p className={`text-sm leading-relaxed text-slate-600 ${koreanText}`}>{page.institutionFit.body}</p>
        <p className={`text-sm text-slate-600 ${koreanText}`}>
          <span className="font-semibold text-slate-800">대상 · </span>
          {page.audience.targets}
        </p>
        <p className={`text-sm text-slate-600 ${koreanText}`}>
          <span className="font-semibold text-slate-800">운영 · </span>
          {page.audience.operations}
        </p>
      </section>

      <LandingFinalCta
        title={page.finalCta.title}
        description={page.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[page.hero.mediaKey]}
        links={[
          {
            label: page.finalCta.label,
            href: page.finalCta.href,
            trackLabel: page.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-spomove-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
