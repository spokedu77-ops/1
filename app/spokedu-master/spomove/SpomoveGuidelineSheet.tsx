'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

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

export type SpomoveContentLoadState = 'loading' | 'ready' | 'error';

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

function SpomoveScreenPreview({ videoUrl }: { videoUrl: string }) {
  const [liteMedia, setLiteMedia] = useState(false);
  const embed = parseVideoEmbedUrl(videoUrl);
  useEffect(() => setLiteMedia(preferLiteMedia()), []);

  const frameClassName =
    'mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-black sm:rounded-2xl';
  const ratioClassName = 'aspect-video w-full';
  if (!embed) {
    return (
      <div
        className={`${frameClassName} ${ratioClassName} flex items-center justify-center border-dashed bg-slate-50 px-4 text-center`}
      >
        <p className="text-sm font-bold text-slate-500">화면 미리보기가 없습니다.</p>
      </div>
    );
  }
  return (
    <div className={frameClassName}>
      <div className={ratioClassName}>
        <TrackedVideoIframe
          src={embed.embedUrl}
          title="SPOMOVE 화면 미리보기"
          className="h-full w-full"
          posterCandidates={getVideoThumbnailCandidates(videoUrl, { lite: liteMedia })}
          posterObjectFit="contain"
          deferUntilPlay
        />
      </div>
    </div>
  );
}

function BriefingSection({
  title,
  children,
  bodyClassName = 'mt-2 text-[14px] font-semibold leading-[1.62] text-slate-700',
}: {
  title: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section>
      <h3 className="text-[13px] font-black tracking-[-0.01em] text-slate-900 sm:text-[14px]">{title}</h3>
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="inline-flex min-w-0 items-baseline gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5"
          >
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {item.label}
            </span>
            <span className="text-[13.5px] font-bold text-slate-800">{item.value}</span>
          </div>
        ))}
      </div>
      {intervalLine ? <p className="text-[12.5px] font-semibold text-slate-500">{intervalLine}</p> : null}
    </div>
  );
}

function CoachCueCard({ script }: { script: string }) {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] px-3 py-2.5">
      <p className="text-[11px] font-black tracking-wide text-[var(--spm-acc)]">교사 Cue</p>
      <p className="mt-1 text-[13.5px] font-bold leading-snug text-slate-800 sm:text-[14px] sm:leading-6">
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
        <p className="text-[13px] font-semibold leading-5 text-slate-500">기본 실행 정보만 제공됩니다.</p>
      ) : null}

      {hasObjectiveBlock ? (
        <BriefingSection
          title="활동 목표"
          bodyClassName="mt-1.5 text-[14.5px] font-bold leading-[1.55] text-slate-900 sm:text-[15px]"
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
        <BriefingSection title="진행">
          {instructionLines.length > 1 ? (
            <ol className="space-y-2.5">
              {instructionLines.map((line, index) => (
                <li key={`${index}-${line}`} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black tabular-nums text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="pt-0.5 text-[14px] font-semibold leading-[1.55] text-slate-700">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] font-semibold leading-[1.55] text-slate-700">{instruction}</p>
          )}
        </BriefingSection>
      ) : null}

      {hasTeachingPoints ? (
        <BriefingSection title="지도 포인트">
          <ul className="space-y-2.5">
            {teachingPoints.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span className="text-[14px] font-semibold leading-[1.55] text-slate-700">{point}</span>
              </li>
            ))}
          </ul>
        </BriefingSection>
      ) : null}

      {hasOptionalDetails ? (
        <section>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-black text-slate-700 [&::-webkit-details-marker]:hidden">
              난이도 조절 · 관찰 기준
              <span aria-hidden className="text-slate-400 transition group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="grid gap-3 pb-1 pt-3 text-[13.5px] font-semibold leading-6 text-slate-700 sm:grid-cols-2">
              {guideDisplay.successCriteria ? (
                <p>
                  <span className="mb-0.5 block text-[11px] font-black text-slate-400">성공 기준</span>
                  {guideDisplay.successCriteria}
                </p>
              ) : null}
              {guideDisplay.commonMistake ? (
                <p>
                  <span className="mb-0.5 block text-[11px] font-black text-slate-400">자주 놓치는 점</span>
                  {guideDisplay.commonMistake}
                </p>
              ) : null}
              {variations.map(([label, value]) => (
                <p key={label}>
                  <span className="mb-0.5 block text-[11px] font-black text-slate-400">{label}</span>
                  {value}
                </p>
              ))}
              {focusTags.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-[11px] font-black text-slate-400">활동 요소</p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
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
  return <p className="truncate text-[12.5px] font-bold text-slate-600">{parts.join(' · ')}</p>;
}

export function SpomoveGuidelineSheet({
  preset,
  guideVideoUrl = '',
  contentOverride,
  contentLoadState = 'ready',
  hubView = 'all',
  onClose,
}: {
  preset: OfficialSpomovePreset | null;
  guideVideoUrl?: string;
  contentOverride?: SpomovePresetContentOverride;
  contentLoadState?: SpomoveContentLoadState;
  hubView?: SpomoveHubViewMode;
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
      <div className="flex flex-col gap-0" data-spm-spomove-launch-confirm="">
        {/* Guide-first but video usable: ~48/52. Stretch columns so left is not short-empty. */}
        <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] min-[1100px]:items-stretch min-[1100px]:gap-5">
          <div data-preview-column="media" className="min-w-0 min-[1100px]:h-full">
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4">
              <p className="shrink-0 text-[11px] font-black tracking-wide text-slate-500">활동 예시 영상</p>
              <div className="mt-1.5 shrink-0">
                <SpomoveScreenPreview videoUrl={guideVideoUrl} />
              </div>
              <p className="mt-2 shrink-0 text-[12px] font-semibold leading-5 text-slate-500">
                실제 준비 수량은 오른쪽 기준을 따릅니다.
              </p>
              {coachScript ? (
                <div className="mt-3 shrink-0">
                  <CoachCueCard script={coachScript} />
                </div>
              ) : null}
              <div className="mt-auto hidden min-[1100px]:block pt-5">
                <p className="border-t border-slate-100 pt-3 text-[11px] font-semibold leading-5 text-slate-400">
                  실행 전 오른쪽 준비·진행 기준을 확인하세요.
                </p>
              </div>
            </div>
          </div>
          <aside
            data-preview-column="content"
            data-preview-summary
            className="min-w-0 min-[1100px]:h-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5"
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

        <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 pb-[max(0px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:-mx-5 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="hidden min-w-0 sm:block">
              <ExecutionSummary matCount={matCount} cueSeconds={cueSeconds} movementLabel={movementLabel} />
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="hidden h-11 min-w-[72px] items-center justify-center rounded-[10px] px-3 text-[13px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 sm:inline-flex"
              >
                닫기
              </button>
              <Link
                href={startHref}
                data-spm-spomove-guide-action="start-official"
                className="spm-btn-primary inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] px-4 text-[15px] font-black focus-visible:outline-none sm:h-11 sm:w-[168px] sm:text-[14px]"
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
