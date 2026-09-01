'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import type { SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import { TrackedVideoIframe } from '../components/lesson/TrackedVideoIframe';
import { BottomSheet } from '../components/ui/BottomSheet';
import { preferLiteMedia } from '../lib/mediaPreferences';
import { getVideoThumbnailCandidates } from '../lib/program-media';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { publicOfficialPresetSessionHref } from './officialSpomovePresets';
import type { SpomoveHubViewMode } from './spomoveHubNavigation';
import { getActivityFamily } from './movements/activityFamilies';
import { buildDeclaredOperation, resolveRequiredMatGuidance } from './operations';
import { resolveSessionCueSeconds } from './spomoveCueSpeed';
import { resolveSpomoveBriefingReadiness } from '@/app/lib/spomove/spomoveBriefingReadiness';
import { buildSpomoveGuideDisplayModel, getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';
import {
  SPOMOVE_VIDEO_FRAME_ASPECT_CLASS,
  SPOMOVE_VIDEO_POSTER_OBJECT_FIT,
} from './spomoveMediaFit';

export type SpomoveContentLoadState = 'loading' | 'ready' | 'error';

const PANEL_RADIUS = 'rounded-[18px]';
const MEDIA_SHADOW = 'shadow-[0_5px_16px_rgba(15,23,42,0.04)]';
const BRIEFING_SHADOW = 'shadow-[0_8px_24px_rgba(15,23,42,0.06)]';
const SOFT_BORDER = 'border border-slate-200/70';

function usePreferredLaunchMode(): 'projector' | 'mobile' {
  const [mode, setMode] = useState<'projector' | 'mobile'>('projector');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const apply = () => setMode(media.matches ? 'mobile' : 'projector');
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return mode;
}

/**
 * Guide video poster/preview — full source frame (contain).
 * Keep fixed 16:9 frame; never stretch preview height to the guide column.
 */
function SpomoveScreenPreview({ videoUrl }: { videoUrl: string }) {
  const [liteMedia, setLiteMedia] = useState(false);
  const embed = parseVideoEmbedUrl(videoUrl);
  useEffect(() => setLiteMedia(preferLiteMedia()), []);

  const frameClassName =
    `mx-auto w-full overflow-hidden rounded-[14px] border border-slate-200/80 bg-slate-950 sm:rounded-[16px] ${MEDIA_SHADOW}`;
  const ratioClassName = `${SPOMOVE_VIDEO_FRAME_ASPECT_CLASS} w-full`;
  if (!embed) {
    return (
      <div
        data-spm-spomove-media="video-preview-empty"
        className={`${frameClassName} ${ratioClassName} flex items-center justify-center border-dashed bg-slate-50 px-4 text-center`}
      >
        <p className="text-sm font-semibold text-slate-500">화면 미리보기가 없습니다.</p>
      </div>
    );
  }
  return (
    <div data-spm-spomove-media="video-preview" className={frameClassName}>
      <div className={ratioClassName}>
        <TrackedVideoIframe
          src={embed.embedUrl}
          title="SPOMOVE 화면 미리보기"
          className="h-full w-full bg-slate-950"
          posterCandidates={getVideoThumbnailCandidates(videoUrl, { lite: liteMedia })}
          posterObjectFit={SPOMOVE_VIDEO_POSTER_OBJECT_FIT}
          deferUntilPlay
        />
      </div>
    </div>
  );
}

function SectionAccentRail() {
  return (
    <span
      aria-hidden
      data-spm-spomove-section-rail="true"
      className="mt-0.5 inline-block h-3.5 w-[3px] shrink-0 rounded-full bg-[var(--spm-acc)] sm:h-4"
    />
  );
}

function BriefingSection({
  title,
  children,
  bodyClassName = 'mt-2 text-[14px] font-medium leading-[1.62] text-slate-700',
}: {
  title: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section data-spm-spomove-briefing-section="">
      <h3 className="flex items-center gap-2 text-[13px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[14px]">
        <SectionAccentRail />
        {title}
      </h3>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function PrepMetaRow({
  matCount,
  cueSeconds,
  movementLabel,
  intervalLine,
}: {
  matCount: number;
  cueSeconds: number;
  movementLabel: string | null;
  intervalLine: string | null;
}) {
  const items = [
    { label: '준비물', value: `SPOMAT ${matCount}장` },
    { label: '자극', value: `${cueSeconds}초` },
    movementLabel ? { label: '동작', value: movementLabel } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-2" data-spm-spomove-prep-stats="true">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{item.label}</p>
            <p className="mt-0.5 break-words text-[13.5px] font-bold leading-5 text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
      {intervalLine ? <p className="text-[12.5px] font-medium text-slate-500">{intervalLine}</p> : null}
    </div>
  );
}

function ProgressTimeline({ lines }: { lines: string[] }) {
  return (
    <ol className="relative space-y-0" data-spm-spomove-progress-timeline="true">
      {lines.map((line, index) => {
        const isLast = index === lines.length - 1;
        return (
          <li key={`${index}-${line}`} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0">
            <div className="relative flex flex-col items-center">
              <span className="relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--spm-acc)_14%,white)] text-[11px] font-bold tabular-nums text-[var(--spm-acc)] ring-1 ring-[color-mix(in_srgb,var(--spm-acc)_28%,transparent)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              {!isLast ? (
                <span
                  aria-hidden
                  className="absolute top-7 bottom-0 w-px bg-[color-mix(in_srgb,var(--spm-acc)_28%,#e2e8f0)]"
                />
              ) : null}
            </div>
            <span className="pt-1 text-[14px] font-medium leading-[1.55] text-slate-700">{line}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CoachCueCard({ script }: { script: string }) {
  return (
    <div
      data-spm-spomove-coach-cue="true"
      className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--spm-acc)_20%,transparent)] bg-[var(--spm-acc-glow)] py-2.5 pl-3.5 pr-3"
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--spm-acc)]"
      />
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[var(--spm-acc)]" aria-hidden />
        <p className="text-[11px] font-bold tracking-wide text-[var(--spm-acc)]">교사 핵심단서(Cue)</p>
      </div>
      <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-slate-900 sm:text-[14px] sm:leading-6">
        “{script.replace(/^["“”']+|["“”']+$/g, '')}”
      </p>
    </div>
  );
}

function ContentLoading() {
  return (
    <div role="status" aria-label="활동 가이드 불러오는 중" className="space-y-5 animate-pulse">
      {[88, 56, 92, 70].map((width, index) => (
        <div key={width} className="space-y-2">
          <div className="h-3.5 w-16 rounded bg-slate-200" />
          <div className="h-3.5 rounded bg-slate-100" style={{ width: `${width}%` }} />
          {index === 2 ? <div className="h-3.5 w-3/5 rounded bg-slate-100" /> : null}
        </div>
      ))}
      <span className="sr-only">활동 가이드를 불러오고 있습니다.</span>
    </div>
  );
}

function ContentError({
  matCount,
  cueSeconds,
  movementLabel,
  intervalLine,
}: {
  matCount: number;
  cueSeconds: number;
  movementLabel: string | null;
  intervalLine: string | null;
}) {
  return (
    <div className="space-y-5">
      <div
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-semibold leading-5 text-amber-900"
      >
        활동 가이드를 불러오지 못했습니다. 활동 실행은 가능하며, 다시 열거나 페이지를 새로고침해 가이드를 다시
        불러올 수 있습니다.
      </div>
      <BriefingSection title="준비">
        <PrepMetaRow
          matCount={matCount}
          cueSeconds={cueSeconds}
          movementLabel={movementLabel}
          intervalLine={intervalLine}
        />
      </BriefingSection>
    </div>
  );
}

function BriefingContent({
  guideDisplay,
  matCount,
  cueSeconds,
  intervalLine,
  briefingReadiness,
}: {
  guideDisplay: ReturnType<typeof buildSpomoveGuideDisplayModel>;
  matCount: number;
  cueSeconds: number;
  intervalLine: string | null;
  briefingReadiness: ReturnType<typeof resolveSpomoveBriefingReadiness>['readiness'];
}) {
  const objective = guideDisplay.objective;
  const legacyConcept = guideDisplay.guideMode === 'legacy' ? guideDisplay.legacyManual?.activityConcept : null;
  const instruction = guideDisplay.instruction ?? guideDisplay.legacyManual?.activityMethod ?? null;
  const instructionLines = instruction?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const variations = [
    ['쉬운 변형', guideDisplay.easier],
    ['도전 변형', guideDisplay.harder],
    ['동작 변형', guideDisplay.movementVariation],
    ['규칙 변형', guideDisplay.ruleVariation],
    ['운영 변형', guideDisplay.operationVariation],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  const focusTags = guideDisplay.focusTags.slice(0, 3);
  const hasObjectiveBlock = Boolean(objective || legacyConcept);
  const hasInstruction = Boolean(instruction);
  const teachingPoints = guideDisplay.teachingPoints.slice(0, 3);
  const hasTeachingPoints = teachingPoints.length > 0;
  const hasOptionalDetails =
    variations.length > 0 ||
    Boolean(guideDisplay.successCriteria) ||
    Boolean(guideDisplay.commonMistake) ||
    focusTags.length > 0;
  const showSparseNotice =
    briefingReadiness !== 'ready' && (!hasObjectiveBlock || !hasInstruction || !hasTeachingPoints);

  return (
    <div className="space-y-5">
      {showSparseNotice ? (
        <p className="text-[13px] font-medium leading-5 text-slate-500">기본 실행 정보만 제공됩니다.</p>
      ) : null}

      {hasObjectiveBlock ? (
        <BriefingSection
          title="활동 목표"
          bodyClassName="mt-2 text-[14.5px] font-semibold leading-[1.6] text-slate-950 sm:text-[15px] sm:leading-[1.58]"
        >
          {objective ? <p>{objective}</p> : <p>{legacyConcept}</p>}
        </BriefingSection>
      ) : null}

      <BriefingSection title="준비">
        <PrepMetaRow
          matCount={matCount}
          cueSeconds={cueSeconds}
          movementLabel={guideDisplay.recommendedMovementLabel}
          intervalLine={intervalLine}
        />
      </BriefingSection>

      {hasInstruction ? (
        <BriefingSection title="활동 방법">
          {instructionLines.length > 1 ? (
            <ProgressTimeline lines={instructionLines} />
          ) : (
            <p className="text-[14px] font-medium leading-[1.55] text-slate-700">{instruction}</p>
          )}
        </BriefingSection>
      ) : null}

      {hasTeachingPoints ? (
        <BriefingSection title="지도 포인트">
          <ul className="space-y-2.5" data-spm-spomove-teaching-markers="true">
            {teachingPoints.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--spm-acc)]"
                />
                <span className="text-[14px] font-medium leading-[1.55] text-slate-700">{point}</span>
              </li>
            ))}
          </ul>
        </BriefingSection>
      ) : null}

      {hasOptionalDetails ? (
        <section>
          <details className="group" data-spm-spomove-details-control="true">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3.5 text-[13px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              난이도 조절 · 관찰 기준
              <span aria-hidden className="text-slate-400 transition group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="grid gap-3 px-1 pb-1 pt-3 text-[13.5px] font-medium leading-6 text-slate-700 sm:grid-cols-2">
              {guideDisplay.successCriteria ? (
                <p>
                  <span className="mb-0.5 block text-[11px] font-bold text-slate-400">성공 기준</span>
                  {guideDisplay.successCriteria}
                </p>
              ) : null}
              {guideDisplay.commonMistake ? (
                <p>
                  <span className="mb-0.5 block text-[11px] font-bold text-slate-400">자주 놓치는 점</span>
                  {guideDisplay.commonMistake}
                </p>
              ) : null}
              {variations.map(([label, value]) => (
                <p key={label}>
                  <span className="mb-0.5 block text-[11px] font-bold text-slate-400">{label}</span>
                  {value}
                </p>
              ))}
              {focusTags.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-[11px] font-bold text-slate-400">활동 요소</p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}

function ExecutionSummary({
  matCount,
  cueSeconds,
  movementLabel,
}: {
  matCount: number;
  cueSeconds: number;
  movementLabel: string | null;
}) {
  const parts = [`SPOMAT ${matCount}장`, `${cueSeconds}초`, movementLabel].filter(Boolean);
  return (
    <p className="text-[12.5px] font-semibold text-slate-600">
      <span className="font-medium text-slate-400">실행 요약</span>
      <span className="mx-1.5 text-slate-300" aria-hidden>
        ·
      </span>
      {parts.join(' · ')}
    </p>
  );
}

export function SpomoveGuidelineSheet({
  preset,
  guideVideoUrl = '',
  contentOverride,
  contentLoadState = 'ready',
  hubView = 'all',
  hubReturnHref = '/spokedu-master/spomove',
  onClose,
}: {
  preset: OfficialSpomovePreset | null;
  guideVideoUrl?: string;
  contentOverride?: SpomovePresetContentOverride;
  contentLoadState?: SpomoveContentLoadState;
  hubView?: SpomoveHubViewMode;
  hubReturnHref?: string;
  onClose: () => void;
}) {
  const launchMode = usePreferredLaunchMode();
  if (!preset) return null;

  const display = getSpomovePresetDisplayModel(preset, contentOverride);
  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  const operationProfileId = preset.operationProfileId ?? family?.operationProfileId;
  const declaredOperation =
    operationProfileId && family ? buildDeclaredOperation(operationProfileId, preset.recommendedOperation) : null;
  const matGuidance =
    family && declaredOperation
      ? resolveRequiredMatGuidance({
          minMats: family.matRequirement.minMats,
          participantScale: declaredOperation.participantScale,
        })
      : null;
  const cueSeconds = resolveSessionCueSeconds(preset, null);
  const startHref = publicOfficialPresetSessionHref(preset, {
    mode: launchMode,
    entry: 'start',
    operation: declaredOperation,
    hubView: hubView === 'favorites' ? 'favorites' : undefined,
    hubReturn: hubReturnHref,
  });
  const matCount = matGuidance?.recommended ?? family?.matRequirement.minMats ?? 1;
  const intervalLine =
    declaredOperation?.timing.pattern === 'interval'
      ? `${declaredOperation.timing.workSeconds}초 활동 · ${declaredOperation.timing.restSeconds}초 휴식 · ${declaredOperation.timing.sets}세트`
      : null;
  const guideDisplay = buildSpomoveGuideDisplayModel({
    preset,
    contentOverride,
    audience: 'public',
    matCount,
    cueSeconds,
  });
  const { readiness: briefingReadiness } = resolveSpomoveBriefingReadiness({ preset, contentOverride });
  const coachScript = guideDisplay.coachScript?.trim() || null;
  const movementLabel = guideDisplay.recommendedMovementLabel;

  return (
    <BottomSheet open title={display.displayTitle} onClose={onClose} size="preview">
      <div
        className="-mx-4 flex flex-col gap-0 rounded-[14px] px-4 py-1 sm:-mx-5 sm:px-5"
        style={{ background: 'color-mix(in srgb, var(--spm-acc) 1.5%, #F8FAFC)' }}
        data-spm-spomove-launch-confirm=""
        data-spm-spomove-surface="stage"
      >
        <div className="grid grid-cols-1 items-start gap-4 min-[1024px]:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] min-[1024px]:gap-5">
          <div data-preview-column="media" className="min-w-0">
            <div
              data-spm-spomove-surface="media"
              className={`${PANEL_RADIUS} ${SOFT_BORDER} bg-white/95 p-3 sm:p-4 ${MEDIA_SHADOW}`}
            >
              <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--spm-acc)]" />
                활동 예시 영상
              </p>
              <div className="mt-1.5 shrink-0">
                <SpomoveScreenPreview videoUrl={guideVideoUrl} />
              </div>
              <p className="mt-2 shrink-0 text-[12px] font-medium leading-5 text-slate-500">
                실제 운영 예시 영상입니다.
              </p>
              {coachScript ? (
                <div className="mt-3 shrink-0">
                  <CoachCueCard script={coachScript} />
                </div>
              ) : null}
            </div>
          </div>
          <aside
            data-preview-column="content"
            data-preview-summary
            data-spm-spomove-surface="briefing"
            className={`min-w-0 ${PANEL_RADIUS} border border-slate-200/55 bg-white p-4 sm:p-5 ${BRIEFING_SHADOW}`}
          >
            {contentLoadState === 'loading' ? (
              <ContentLoading />
            ) : contentLoadState === 'error' ? (
              <ContentError
                matCount={matCount}
                cueSeconds={cueSeconds}
                movementLabel={movementLabel}
                intervalLine={intervalLine}
              />
            ) : (
              <BriefingContent
                guideDisplay={guideDisplay}
                matCount={matCount}
                cueSeconds={cueSeconds}
                intervalLine={intervalLine}
                briefingReadiness={briefingReadiness}
              />
            )}
          </aside>
        </div>

        <div
          data-spm-spomove-action-rail="true"
          className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200/60 bg-white/90 px-4 pb-[max(0px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:-mx-5 sm:px-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="hidden min-w-0 md:block min-[1024px]:hidden">
              <ExecutionSummary matCount={matCount} cueSeconds={cueSeconds} movementLabel={movementLabel} />
            </div>
            <div className="grid w-full grid-cols-[minmax(88px,0.7fr)_minmax(0,1.3fr)] gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 min-w-[72px] items-center justify-center rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
              >
                닫기
              </button>
              <Link
                href={startHref}
                data-spm-spomove-guide-action="start-official"
                className="spm-btn-primary inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] px-4 text-[15px] font-black shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(15,23,42,0.10)] active:translate-y-0 focus-visible:outline-none sm:h-11 sm:w-[168px] sm:text-[14px]"
              >
                수업 시작
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
