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

  const frameClassName = 'mx-auto h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-black sm:rounded-2xl';
  const ratioClassName = 'aspect-video min-h-[220px] w-full sm:min-h-[320px] lg:aspect-auto lg:h-full lg:min-h-full';
  if (!embed) {
    return (
      <div className={`${frameClassName} ${ratioClassName} flex items-center justify-center border-dashed bg-slate-50 px-4 text-center`}>
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
          deferUntilPlay
        />
      </div>
    </div>
  );
}

function BriefingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[12px] font-black tracking-[-0.01em] text-slate-900">{title}</h3>
      <div className="mt-2 text-[13.5px] font-semibold leading-[1.62] text-slate-700">{children}</div>
    </section>
  );
}

function ContentLoading() {
  return (
    <div role="status" aria-label="활동 가이드 불러오는 중" className="space-y-5 animate-pulse">
      {[72, 96, 80, 64].map((width, index) => (
        <div key={width} className="space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-3 rounded bg-slate-100" style={{ width: `${width}%` }} />
          {index === 1 ? <div className="h-3 w-1/2 rounded bg-slate-100" /> : null}
        </div>
      ))}
      <span className="sr-only">활동 가이드를 불러오고 있습니다.</span>
    </div>
  );
}

function ContentError({ prepLine, intervalLine }: { prepLine: string; intervalLine: string | null }) {
  return (
    <div className="space-y-5">
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-semibold leading-5 text-amber-900">
        활동 가이드를 불러오지 못했습니다. 활동 실행은 가능하며, 다시 열거나 페이지를 새로고침해 가이드를 다시 불러올 수 있습니다.
      </div>
      <BriefingSection title="준비">
        <p>{prepLine}</p>
        {intervalLine ? <p className="mt-1 text-[12px] text-slate-500">{intervalLine}</p> : null}
      </BriefingSection>
    </div>
  );
}

function BriefingContent({
  guideDisplay,
  prepLine,
  intervalLine,
  briefingReadiness,
}: {
  guideDisplay: ReturnType<typeof buildSpomoveGuideDisplayModel>;
  prepLine: string;
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
  const hasObjectiveBlock = Boolean(objective || legacyConcept || guideDisplay.focusTags.length > 0);
  const hasInstruction = Boolean(instruction);
  const hasCoachingBlock =
    guideDisplay.teachingPoints.length > 0 ||
    Boolean(guideDisplay.coachScript) ||
    Boolean(guideDisplay.successCriteria) ||
    Boolean(guideDisplay.commonMistake);
  const hasOptionalDetails =
    variations.length > 0 ||
    (guideDisplay.teachingPoints.length > 0 && Boolean(guideDisplay.successCriteria || guideDisplay.commonMistake));
  const showSparseNotice =
    briefingReadiness !== 'ready' && (!hasObjectiveBlock || !hasInstruction || !hasCoachingBlock);

  return (
    <div className="divide-y divide-slate-100 [&>section]:py-4 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
      {showSparseNotice ? (
        <p className="pb-4 text-[12px] font-semibold leading-5 text-slate-500">
          기본 실행 정보만 제공됩니다.
        </p>
      ) : null}

      {hasObjectiveBlock ? (
        <BriefingSection title="활동 목표">
          {objective ? <p>{objective}</p> : legacyConcept ? (
            <div>
              <p className="text-[11px] font-bold text-slate-400">활동 개념</p>
              <p className="mt-1">{legacyConcept}</p>
            </div>
          ) : null}
          {guideDisplay.focusTags.length > 0 ? (
            <div className={`${objective || legacyConcept ? 'mt-2.5' : ''} flex flex-wrap gap-1.5`}>
              {guideDisplay.focusTags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{tag}</span>
              ))}
            </div>
          ) : null}
        </BriefingSection>
      ) : null}

      <BriefingSection title="준비">
        <p>{prepLine}</p>
        {guideDisplay.recommendedMovementLabel ? <p className="mt-1 text-[12px] text-slate-500">추천 동작 · {guideDisplay.recommendedMovementLabel}</p> : null}
        {intervalLine ? <p className="mt-1 text-[12px] text-slate-500">{intervalLine}</p> : null}
      </BriefingSection>

      {hasInstruction ? (
        <BriefingSection title="진행">
          {instructionLines.length > 1 ? (
            <ol className="space-y-1.5">
              {instructionLines.map((line, index) => <li key={`${index}-${line}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-1.5"><span className="text-slate-400">{index + 1}.</span><span>{line}</span></li>)}
            </ol>
          ) : (
            <p>{instruction}</p>
          )}
        </BriefingSection>
      ) : null}

      {hasCoachingBlock ? (
        <BriefingSection title="지도 포인트">
          {guideDisplay.teachingPoints.length > 0 ? (
            <ul className="space-y-1.5">
              {guideDisplay.teachingPoints.map((point) => <li key={point} className="flex gap-2"><span aria-hidden className="text-slate-400">•</span><span>{point}</span></li>)}
            </ul>
          ) : null}
          {guideDisplay.coachScript ? (
            <div className={`${guideDisplay.teachingPoints.length ? 'mt-3' : ''} rounded-xl bg-[var(--spm-acc-glow)] px-3 py-2.5`}>
              <p className="text-[11px] font-black text-[var(--spm-acc)]">아이에게 하는 말</p>
              <blockquote className="mt-1 text-[13px] font-bold leading-6 text-slate-800">{guideDisplay.coachScript}</blockquote>
            </div>
          ) : null}
          {guideDisplay.teachingPoints.length === 0 && guideDisplay.successCriteria ? <p className="mt-2"><span className="mr-2 text-[11px] font-black text-slate-400">성공 기준</span>{guideDisplay.successCriteria}</p> : null}
          {guideDisplay.teachingPoints.length === 0 && guideDisplay.commonMistake ? <p className="mt-2"><span className="mr-2 text-[11px] font-black text-slate-400">자주 놓치는 점</span>{guideDisplay.commonMistake}</p> : null}
        </BriefingSection>
      ) : null}

      {hasOptionalDetails ? (
        <section className="py-4 last:pb-0">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[12px] font-black text-slate-700 [&::-webkit-details-marker]:hidden">
              선택적 상세 <span aria-hidden className="text-slate-400 transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="space-y-3 pb-1 pt-2 text-[13px] font-semibold leading-6 text-slate-700">
              {guideDisplay.teachingPoints.length > 0 && guideDisplay.successCriteria ? <p><span className="mr-2 text-[11px] font-black text-slate-400">성공 기준</span>{guideDisplay.successCriteria}</p> : null}
              {guideDisplay.teachingPoints.length > 0 && guideDisplay.commonMistake ? <p><span className="mr-2 text-[11px] font-black text-slate-400">자주 놓치는 점</span>{guideDisplay.commonMistake}</p> : null}
              {variations.map(([label, value]) => <p key={label}><span className="mr-2 text-[11px] font-black text-slate-400">{label}</span>{value}</p>)}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
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
  const declaredOperation = operationProfileId && family ? buildDeclaredOperation(operationProfileId, preset.recommendedOperation) : null;
  const matGuidance = family && declaredOperation ? resolveRequiredMatGuidance({ minMats: family.matRequirement.minMats, participantScale: declaredOperation.participantScale }) : null;
  const cueSeconds = resolveSessionCueSeconds(preset, null);
  const startHref = publicOfficialPresetSessionHref(preset, {
    mode: launchMode,
    entry: 'start',
    operation: declaredOperation,
    hubView: hubView === 'favorites' ? 'favorites' : undefined,
  });
  const matCount = matGuidance?.recommended ?? family?.matRequirement.minMats ?? 1;
  const prepLine = `SPOMAT ${matCount}장 · 기본 자극 ${cueSeconds}초`;
  const intervalLine = declaredOperation?.timing.pattern === 'interval'
    ? `${declaredOperation.timing.workSeconds}초 활동 · ${declaredOperation.timing.restSeconds}초 휴식 · ${declaredOperation.timing.sets}세트`
    : null;
  const guideDisplay = buildSpomoveGuideDisplayModel({ preset, contentOverride, audience: 'public', matCount, cueSeconds });
  const { readiness: briefingReadiness } = resolveSpomoveBriefingReadiness({ preset, contentOverride });

  return (
    <BottomSheet open title={display.displayTitle} onClose={onClose} size="preview">
      <div className="flex flex-col gap-3" data-spm-spomove-launch-confirm="">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)] lg:items-stretch">
          <div data-preview-column="media" className="min-w-0 lg:flex"><SpomoveScreenPreview videoUrl={guideVideoUrl} /></div>
          <aside data-preview-column="content" data-preview-summary className="min-w-0 rounded-[14px] border border-slate-200 bg-white p-4 sm:p-5 lg:max-h-[min(620px,calc(100dvh-260px))] lg:overflow-y-auto [scrollbar-width:thin]">
            {contentLoadState === 'loading' ? <ContentLoading /> : contentLoadState === 'error' ? <ContentError prepLine={prepLine} intervalLine={intervalLine} /> : <BriefingContent guideDisplay={guideDisplay} prepLine={prepLine} intervalLine={intervalLine} briefingReadiness={briefingReadiness} />}
          </aside>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="hidden h-10 w-[96px] items-center justify-center rounded-[10px] border border-slate-200 px-4 text-[13px] font-black text-slate-700 sm:inline-flex">닫기</button>
          <Link href={startHref} data-spm-spomove-guide-action="start-official" className="spm-btn-primary inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] px-4 text-[15px] font-black focus-visible:outline-none sm:h-10 sm:w-[168px] sm:text-[13px]">수업 시작</Link>
        </div>
      </div>
    </BottomSheet>
  );
}
