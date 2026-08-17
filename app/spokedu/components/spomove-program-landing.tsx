'use client';

import { HOME_MEDIA, type HomeMediaKey } from '../data/home-media';
import { spomoveProgramPage } from '../data/spomove-program-page';
import {
  brandBlue,
  brandInk,
  homeBandSoftBlue,
  homeBandWhite,
  homeBodyLead,
  homeFocusRing,
  homeGateCard,
  homePhotoGrade,
  homeSectionEyebrow,
  marketingSectionDisplay,
  homeSectionPadCompact,
  koreanText,
  siteBtnPrimary,
  siteBtnSecondary,
  siteContainer,
} from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { SpomatPhoto } from './spomat-photo';
import { MediaPanel } from './visual';
import { HomeChevron } from './home/home-chevron';
import { TrackedLink } from './home/tracked-link';

/** SPOMAT 실물 배치 — 좌상 초록 · 우상 빨강 · 좌하 파랑 · 우하 노랑 */
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
      <p className={`relative text-[11px] font-medium leading-relaxed text-white/72 ${koreanText}`}>{visual.answer}</p>
    </div>
  );
}

/**
 * SPOMOVE 정적 랜딩 — 탭/카탈로그 실패와 무관하게 H1·정의·분기·사례 유지
 */
export default function SpomoveProgramLanding() {
  const page = spomoveProgramPage;
  const heroMedia = HOME_MEDIA[page.hero.mediaKey];

  return (
    <main
      className="w-full overflow-x-clip bg-[#F5F7FB]"
      data-spokedu-spomove-sections={page.sectionOrder.length}
    >
      <section id={page.hero.id} className={`${homeSectionPadCompact} bg-white`}>
        <div className={`${siteContainer} grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center`}>
          <div className="min-w-0">
            <p className={homeSectionEyebrow}>{page.hero.kicker}</p>
            <h1 className={`${marketingSectionDisplay} mt-3`}>
              <span className="block">{page.hero.lines[0]}</span>
              <span className="mt-1.5 block text-[#245DFF]">{page.hero.lines[1]}</span>
            </h1>
            <p className={`${homeBodyLead} mt-4`}>{page.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedLink
                href={page.hero.primaryCta.href}
                trackLabel={page.hero.primaryCta.trackLabel}
                className={`${siteBtnPrimary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {page.hero.primaryCta.label}
              </TrackedLink>
              <TrackedLink
                href={page.hero.secondaryCta.href}
                trackLabel={page.hero.secondaryCta.trackLabel}
                className={`${siteBtnSecondary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {page.hero.secondaryCta.label}
              </TrackedLink>
            </div>
          </div>
          <div className="relative min-h-[14rem] overflow-hidden rounded-[1.5rem] ring-1 ring-[#DCE3EE] sm:min-h-[18rem]">
            <MediaPanel
              media={heroMedia}
              className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
              sizes="card2"
              photoPriority
              priority
              objectFit="cover"
            />
          </div>
        </div>
      </section>

      <section id={page.flow.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`} aria-labelledby="spomove-flow-heading">
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{page.flow.eyebrow}</p>
          <h2 id="spomove-flow-heading" className={`${marketingSectionDisplay} mt-3`}>
            {page.flow.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {page.flow.lead}
          </p>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {page.flow.steps.map((step, index) => (
              <li
                key={step.label}
                className="rounded-[1.15rem] border border-[#D6E3FF] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,33,70,0.04)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-bold tracking-[0.14em]" style={{ color: brandBlue }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className={`mt-2 text-[15px] font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {step.label}
                </h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id={page.content.id} className={`${homeSectionPadCompact} ${homeBandWhite}`} aria-labelledby="spomove-content-heading">
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{page.content.eyebrow}</p>
          <h2 id="spomove-content-heading" className={`${marketingSectionDisplay} mt-3`}>
            {page.content.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {page.content.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[800px]:grid-cols-3">
            {page.content.levels.map((level) => (
              <li
                key={level.id}
                className="flex h-full flex-col rounded-[1.25rem] border border-[#DCE3EE] bg-[#F5F7FB] px-5 py-5 sm:px-6"
              >
                <h3 className={`text-lg font-bold ${koreanText}`} style={{ color: brandInk }}>
                  {level.title}
                </h3>
                <p className={`mt-2 flex-1 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{level.body}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {level.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[#D6E3FF] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <h3 className={`mt-10 text-lg font-bold sm:text-xl ${koreanText}`} style={{ color: brandInk }}>
            {page.activities.title}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.activities.items.map((item, index) => {
              const media = HOME_MEDIA[item.mediaKey];
              const isStructuredVisual = media.type === 'visual';
              return (
                <li key={item.title} className="overflow-hidden rounded-[1.25rem] border border-[#DCE3EE] bg-white">
                  <div className="relative aspect-[16/10]">
                    {isStructuredVisual ? (
                      <SpomoveActivityVisualPanel mediaKey={item.mediaKey} />
                    ) : (
                      <MediaPanel
                        media={media}
                        className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
                        photoPriority={index === 0}
                        objectFit="cover"
                      />
                    )}
                  </div>
                  <div className="px-4 py-4">
                    <p className={`font-bold text-[#14213A] ${koreanText}`}>{item.title}</p>
                    <p className={`mt-1 text-sm text-[#536279] ${koreanText}`}>{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <TrackedLink
            href={page.content.catalogCta.href}
            trackLabel={page.content.catalogCta.trackLabel}
            className={`mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#245DFF] ${homeFocusRing}`}
          >
            {page.content.catalogCta.label}
            <HomeChevron />
          </TrackedLink>
        </div>
      </section>

      <section id={page.spomat.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`} aria-labelledby="spomove-spomat-heading">
        <div className={`${siteContainer} grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-start`}>
          <div>
            <div className="flex items-center gap-2">
              <SpomatPhoto size="sm" bare />
              <p className={homeSectionEyebrow}>{page.spomat.eyebrow}</p>
            </div>
            <h2 id="spomove-spomat-heading" className={`${marketingSectionDisplay} mt-3`}>
              {page.spomat.title}
            </h2>
            <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
              {page.spomat.body}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.spomat.points.map((point, index) => (
                <li key={point.title} className="rounded-[1.05rem] border border-[#D6E3FF] bg-white px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                      aria-hidden
                    />
                    <h3 className={`font-bold ${koreanText}`} style={{ color: brandInk }}>
                      {point.title}
                    </h3>
                  </div>
                  <p className={`mt-1.5 text-sm text-[#536279] ${koreanText}`}>{point.body}</p>
                </li>
              ))}
            </ul>
            <p className={`mt-5 text-sm text-[#6D7B90] ${koreanText}`}>{page.spomat.note}</p>
            {'detailHref' in page.spomat && page.spomat.detailHref ? (
              <TrackedLink
                href={page.spomat.detailHref}
                trackLabel={page.spomat.detailTrackLabel}
                className={`${siteBtnSecondary} mt-4 h-11 ${homeFocusRing}`}
              >
                {page.spomat.detailLabel}
                <HomeChevron />
              </TrackedLink>
            ) : null}
          </div>
          <div className="mx-auto w-full max-w-[18rem] lg:mx-0">
            <div className="overflow-hidden rounded-[1.5rem] border border-[#DCE3EE] bg-white p-2.5 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded-[1.15rem] bg-[#F5F7FB]">
                <MediaPanel
                  media={HOME_MEDIA[page.spomat.mediaKey]}
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                  objectFit="contain"
                />
              </div>
            </div>
            <p className={`mt-2 text-center text-xs font-semibold text-[#536279] ${koreanText}`}>SPOMAT · 4색 반응 패드</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5" aria-label="SPOMAT 색 구성">
              {PAD_CELLS.map((pad) => (
                <li
                  key={pad.name}
                  className="flex items-center gap-1.5 rounded-lg border border-[#DCE3EE] bg-white px-2 py-1.5 text-xs font-semibold text-[#37455C]"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pad.hex }} aria-hidden />
                  {pad.ko}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id={page.usePaths.id} className={`${homeSectionPadCompact} ${homeBandWhite}`} aria-labelledby="spomove-paths-heading">
        <div className={siteContainer}>
          <p className={homeSectionEyebrow}>{page.usePaths.eyebrow}</p>
          <h2 id="spomove-paths-heading" className={`${marketingSectionDisplay} mt-3`}>
            {page.usePaths.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
            {page.usePaths.lead}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[800px]:grid-cols-2">
            {page.usePaths.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <TrackedLink
                  href={item.href}
                  trackLabel={item.trackLabel}
                  commercialRoute={item.id === 'institution' ? 'dispatch' : 'curriculum'}
                  ctaIntentId={item.trackLabel}
                  className={`${homeGateCard} ${homeFocusRing} block h-full`}
                >
                  <div className="flex min-h-[13rem] flex-col px-5 py-5 sm:px-6 sm:py-6">
                    <p className="text-[12px] font-bold tracking-[0.08em]" style={{ color: brandBlue }}>
                      {item.badge}
                    </p>
                    <h3 className={`mt-1.5 text-lg font-bold sm:text-xl ${koreanText}`} style={{ color: brandInk }}>
                      {item.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>{item.body}</p>
                    <ul className="mt-3.5 flex flex-wrap gap-1.5">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-full border border-[#D6E3FF] bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-semibold text-[#2C446D]"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <span
                      className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold"
                      style={{ color: brandBlue }}
                    >
                      {item.ctaLabel}
                      <HomeChevron />
                    </span>
                  </div>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={page.cases.id} className={`${homeSectionPadCompact} ${homeBandSoftBlue}`} aria-labelledby="spomove-cases-heading">
        <div className={siteContainer}>
          <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
            <div className="max-w-2xl">
              <p className={homeSectionEyebrow}>{page.cases.eyebrow}</p>
              <h2 id="spomove-cases-heading" className={`${marketingSectionDisplay} mt-3`}>
                {page.cases.title}
              </h2>
              <p className={`mt-3 text-[15px] leading-relaxed text-[#536279] sm:text-base ${koreanText}`}>
                {page.cases.lead}
              </p>
            </div>
            <TrackedLink
              href={page.cases.recordsCta.href}
              trackLabel={page.cases.recordsCta.trackLabel}
              className={`${siteBtnSecondary} h-11 shrink-0 px-5 ${homeFocusRing}`}
            >
              {page.cases.recordsCta.label}
            </TrackedLink>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-4 min-[800px]:grid-cols-3">
            {page.cases.cards.map((card) => {
              const media = HOME_MEDIA[card.mediaKey];
              return (
                <li key={card.slug} className="min-w-0">
                  <TrackedLink
                    href={card.href}
                    trackLabel={card.trackLabel}
                    className={`${homeGateCard} ${homeFocusRing} block h-full`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {card.thumbnailSrc ? (
                        <ExternalPhoto
                          src={card.thumbnailSrc}
                          alt={`${card.programLabel} — ${card.venue}`}
                          className="absolute inset-0 h-full w-full"
                          fit="cover"
                          quality={90}
                          sizes="(max-width: 800px) 100vw, 33vw"
                        />
                      ) : (
                        <MediaPanel
                          media={media}
                          className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
                          sizes="gateCard"
                          objectFit="cover"
                        />
                      )}
                    </div>
                    <div className="flex min-h-[11rem] flex-col px-5 py-5">
                      <p className="text-[12px] font-semibold" style={{ color: brandBlue }}>
                        {card.operationType} · {card.programLabel}
                      </p>
                      <h3 className={`mt-1.5 text-base font-bold sm:text-lg ${koreanText}`} style={{ color: brandInk }}>
                        {card.venue}
                      </h3>
                      <p className={`mt-1 text-sm font-medium text-[#6D7B90] ${koreanText}`}>{card.audience}</p>
                      <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-[#536279] ${koreanText}`}>
                        {card.description}
                      </p>
                      <span
                        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[15px] font-semibold"
                        style={{ color: brandBlue }}
                      >
                        {card.ctaLabel}
                        <HomeChevron />
                      </span>
                    </div>
                  </TrackedLink>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id={page.catalogFinal.id} className={`${homeSectionPadCompact} ${homeBandWhite}`}>
        <div className={siteContainer}>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#D6E3FF] bg-white px-5 py-8 shadow-[0_18px_50px_rgba(15,33,70,0.07)] sm:px-8 sm:py-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: brandBlue }}>
              {page.catalogFinal.eyebrow}
            </p>
            <h2 className={`${marketingSectionDisplay} mt-3 text-[1.65rem] sm:text-[2rem]`}>{page.catalogFinal.title}</h2>
            <p className={`mt-3 max-w-xl text-[15px] leading-relaxed text-[#536279] ${koreanText}`}>
              {page.catalogFinal.lead}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <TrackedLink
                href={page.catalogFinal.catalogCta.href}
                trackLabel={page.catalogFinal.catalogCta.trackLabel}
                className={`${siteBtnSecondary} h-11 px-5 ${homeFocusRing}`}
              >
                {page.catalogFinal.catalogCta.label}
              </TrackedLink>
              <TrackedLink
                href={page.catalogFinal.materialsLink.href}
                trackLabel={page.catalogFinal.materialsLink.trackLabel}
                className={`inline-flex h-11 items-center text-[14px] font-semibold text-[#536279] underline-offset-4 hover:underline ${homeFocusRing} ${koreanText}`}
              >
                {page.catalogFinal.materialsLink.label}
              </TrackedLink>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={page.catalogFinal.primary.href}
                trackLabel={page.catalogFinal.primary.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={page.catalogFinal.primary.trackLabel}
                selectionId="spomove"
                className={`${siteBtnPrimary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {page.catalogFinal.primary.label}
              </TrackedLink>
              <TrackedLink
                href={page.catalogFinal.secondary.href}
                trackLabel={page.catalogFinal.secondary.trackLabel}
                commercialRoute="curriculum"
                ctaIntentId={page.catalogFinal.secondary.trackLabel}
                className={`${siteBtnSecondary} h-12 min-h-12 px-7 ${homeFocusRing}`}
              >
                {page.catalogFinal.secondary.label}
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
