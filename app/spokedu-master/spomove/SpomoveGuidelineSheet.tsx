'use client';

import Link from 'next/link';
import { MessageSquareQuote } from 'lucide-react';
import { useEffect, useState } from 'react';

import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import { TrackedVideoIframe } from '../components/lesson/TrackedVideoIframe';
import { BottomSheet } from '../components/ui/BottomSheet';
import { preferLiteMedia } from '../lib/mediaPreferences';
import { getVideoThumbnailCandidates } from '../lib/program-media';
import type { SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { publicOfficialPresetSessionHref } from './officialSpomovePresets';
import { buildSpomoveGuideDisplayModel, getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';
import type { SpomoveHubViewMode } from './spomoveHubNavigation';
import { getActivityFamily } from './movements/activityFamilies';
import { resolveSessionCueSeconds } from './spomoveCueSpeed';
import { buildDeclaredOperation, resolveRequiredMatGuidance } from './operations';

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

  useEffect(() => {
    setLiteMedia(preferLiteMedia());
  }, []);

  const frameClassName =
    'mx-auto h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-black sm:rounded-2xl';
  const ratioClassName = 'aspect-video min-h-[220px] w-full sm:min-h-[320px] lg:aspect-auto lg:h-full lg:min-h-full';

  if (!embed) {
    return (
      <div
        className={`${frameClassName} ${ratioClassName} flex items-center justify-center border-dashed bg-slate-50 px-4 text-center`}
      >
        <p className="text-sm font-bold text-slate-500">화면 미리보기가 없습니다.</p>
      </div>
    );
  }

  const posterCandidates = getVideoThumbnailCandidates(videoUrl, { lite: liteMedia });

  return (
    <div className={frameClassName}>
      <div className={ratioClassName}>
        <TrackedVideoIframe
          src={embed.embedUrl}
          title="SPOMOVE 화면 미리보기"
          className="h-full w-full"
          posterCandidates={posterCandidates}
          deferUntilPlay
        />
      </div>
    </div>
  );
}

function PublishedGuideContent({
  guideDisplay,
  prepLine,
  intervalLine,
}: {
  guideDisplay: ReturnType<typeof buildSpomoveGuideDisplayModel>;
  prepLine: string;
  intervalLine: string | null;
}) {
  const variationRows = [
    ['다른 움직임', guideDisplay.movementVariation],
    ['규칙 변형', guideDisplay.ruleVariation],
    ['운영 변형', guideDisplay.operationVariation],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  const observationRows = [
    ['성공 기준', guideDisplay.successCriteria],
    ['자주 놓치는 점', guideDisplay.commonMistake],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <>
      <section className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-800">오늘 수업 레시피</h3>
        <ol className="mt-2 space-y-2">
          <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-black text-emerald-700">1</span>
            <div>
              <p className="text-[12px] font-black text-slate-500">준비</p>
              <p className="mt-0.5 text-[13px] font-bold leading-5 text-slate-800">{prepLine}</p>
              {intervalLine ? <p className="mt-0.5 text-[12px] font-semibold leading-5 text-slate-500">{intervalLine}</p> : null}
            </div>
          </li>
          <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-black text-emerald-700">2</span>
            <div>
              <p className="text-[12px] font-black text-slate-500">진행</p>
              <p className="mt-0.5 text-[13px] font-bold leading-5 text-slate-800">{guideDisplay.instruction}</p>
            </div>
          </li>
          <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-black text-emerald-700">3</span>
            <div>
              <p className="text-[12px] font-black text-slate-500">교사 멘트</p>
              <p className="mt-0.5 text-[13px] font-bold leading-5 text-slate-800">{guideDisplay.coachScript}</p>
            </div>
          </li>
        </ol>
      </section>

      <section>
        <p className="sr-only">SPOMOVE 수업 핵심</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">수업 핵심</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
          <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="font-black text-slate-400">추천동작</p>
            <p className="mt-0.5 font-black text-slate-900">{guideDisplay.recommendedMovementLabel ?? '화면 지시'}</p>
          </div>
          <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="font-black text-slate-400">활용 요소</p>
            <p className="mt-0.5 font-black text-slate-900">{guideDisplay.focusTags.slice(0, 2).join(' · ') || '-'}</p>
          </div>
          <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="font-black text-slate-400">기본 설정</p>
            <p className="mt-0.5 font-black text-slate-900">자극 {guideDisplay.cueSeconds}초 · {guideDisplay.rounds}회</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] font-medium text-slate-400">{prepLine}</p>
        {intervalLine ? <p className="mt-1 text-[12px] font-medium text-slate-400">{intervalLine}</p> : null}
      </section>

      <section className="rounded-[12px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] p-3">
        <p className="sr-only">SPOMOVE 진행 방법</p>
        <h3 className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--spm-acc)]">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          진행 방법
        </h3>
        <p className="mt-2 text-[13.5px] font-semibold leading-[1.6] text-slate-700">{guideDisplay.instruction}</p>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="sr-only">SPOMOVE 코치 스크립트</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">코치 스크립트</h3>
        <blockquote className="mt-2 rounded-[12px] border-l-4 border-[var(--spm-acc)] bg-slate-50 px-3 py-2 text-[13px] font-black leading-6 text-slate-800">
          {guideDisplay.coachScript}
        </blockquote>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <p className="sr-only">SPOMOVE 난이도 조절</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">난이도 조절</h3>
        <div className="mt-2 grid gap-2">
          <div className="rounded-[12px] border border-slate-100 bg-white px-3 py-2">
            <p className="text-[12px] font-black text-slate-500">쉬운 변형</p>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-slate-700">{guideDisplay.easier}</p>
          </div>
          <div className="rounded-[12px] border border-slate-100 bg-white px-3 py-2">
            <p className="text-[12px] font-black text-slate-500">도전 변형</p>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-slate-700">{guideDisplay.harder}</p>
          </div>
        </div>
      </section>

      {variationRows.length > 0 ? (
        <section className="border-t border-slate-100 pt-4">
          <p className="sr-only">SPOMOVE 변형 방법</p>
          <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">변형 방법</h3>
          <div className="mt-2 space-y-2">
            {variationRows.map(([label, value]) => (
              <div key={label} className="rounded-[12px] border border-slate-100 bg-white px-3 py-2">
                <p className="text-[12px] font-black text-slate-500">{label}</p>
                <p className="mt-1 text-[13px] font-semibold leading-6 text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {observationRows.length > 0 ? (
        <section className="border-t border-slate-100 pt-4">
          <p className="sr-only">SPOMOVE 관찰 포인트</p>
          <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">관찰 포인트</h3>
          <div className="mt-2 space-y-2">
            {observationRows.map(([label, value]) => (
              <div key={label} className="rounded-[12px] border border-slate-100 bg-white px-3 py-2">
                <p className="text-[12px] font-black text-slate-500">{label}</p>
                <p className="mt-1 text-[13px] font-semibold leading-6 text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function LegacyGuideContent({
  legacyManual,
  prepLine,
  intervalLine,
}: {
  legacyManual: NonNullable<ReturnType<typeof buildSpomoveGuideDisplayModel>['legacyManual']>;
  prepLine: string;
  intervalLine: string | null;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-[14px] border border-slate-100 bg-slate-50 p-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-700">바로 수업하기</h3>
        <div className="mt-2 grid gap-2">
          <div className="rounded-[12px] bg-white px-3 py-2">
            <p className="text-[12px] font-black text-slate-500">준비</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-700">{prepLine}</p>
            {intervalLine ? <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">{intervalLine}</p> : null}
          </div>
          <div className="rounded-[12px] bg-white px-3 py-2">
            <p className="text-[12px] font-black text-slate-500">진행</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-700">
              {legacyManual.activityMethod ?? '화면 신호를 보고 정해진 위치와 규칙에 맞춰 반응합니다.'}
            </p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">활동방법</h3>
        <p className="mt-2 text-[13.5px] font-semibold leading-[1.6] text-slate-700">
          {legacyManual.activityMethod ?? '활동방법은 순차 작성 중입니다.'}
        </p>
      </div>
      {legacyManual.activityConcept ? (
        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">활동 개념</h3>
          <p className="mt-2 text-[13.5px] font-semibold leading-[1.6] text-slate-700">{legacyManual.activityConcept}</p>
        </div>
      ) : null}
      <p className="rounded-[12px] border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-bold leading-5 text-slate-500">
        상세 수업 가이드는 순차 작성 중입니다.
      </p>
    </section>
  );
}

function PreparingGuideContent({ prepLine, intervalLine }: { prepLine: string; intervalLine: string | null }) {
  return (
    <section className="rounded-[12px] border border-slate-100 bg-slate-50 p-4">
      <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-600">세부 안내 예정</h3>
      <p className="mt-2 text-[13.5px] font-semibold leading-[1.6] text-slate-700">
        상세 수업 가이드를 순차 작성하고 있습니다. 활동은 정상적으로 실행할 수 있습니다.
      </p>
      <div className="mt-3 grid gap-2">
        <div className="rounded-[12px] bg-white px-3 py-2">
          <p className="text-[12px] font-black text-slate-500">준비</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-700">{prepLine}</p>
          {intervalLine ? <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">{intervalLine}</p> : null}
        </div>
        <div className="rounded-[12px] bg-white px-3 py-2">
          <p className="text-[12px] font-black text-slate-500">진행</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-700">
            화면의 신호를 먼저 확인하고, 정해진 위치와 규칙에 맞춰 반응하도록 안내합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

function GuideModeNotice({
  guideMode,
}: {
  guideMode: ReturnType<typeof buildSpomoveGuideDisplayModel>['guideMode'];
}) {
  if (guideMode === 'published') {
    return (
      <div className="rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-[12px] font-black text-emerald-800">공식 수업안</p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-emerald-900">
          준비, 진행, 교사 멘트까지 확인된 안내입니다. 그대로 시작해도 됩니다.
        </p>
      </div>
    );
  }

  if (guideMode === 'legacy') {
    return (
      <div className="rounded-[12px] border border-sky-100 bg-sky-50 px-3 py-2">
        <p className="text-[12px] font-black text-sky-800">기본 실행안</p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-sky-900">
          세부 수업안은 순차 작성 중이지만, 화면 활동과 기본 진행 흐름은 바로 사용할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[12px] font-black text-slate-700">세부 안내 예정</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-600">
        화면 활동은 실행할 수 있습니다. 수업 전에는 매트 수와 자극 시간을 먼저 확인하세요.
      </p>
    </div>
  );
}

export function SpomoveGuidelineSheet({
  preset,
  guideVideoUrl = '',
  contentOverride,
  hubView = 'all',
  onClose,
}: {
  preset: OfficialSpomovePreset | null;
  guideVideoUrl?: string;
  contentOverride?: SpomovePresetContentOverride;
  hubView?: SpomoveHubViewMode;
  onClose: () => void;
}) {
  const launchMode = usePreferredLaunchMode();

  if (!preset) return null;

  const display = getSpomovePresetDisplayModel(preset);

  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  const operationProfileId = preset.operationProfileId ?? family?.operationProfileId;
  const declaredOperation =
    operationProfileId && family
      ? buildDeclaredOperation(operationProfileId, preset.recommendedOperation)
      : null;
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
  const prepLine = `매트 ${matCount}장 · 자극 ${cueSeconds}초`;
  const intervalLine =
    declaredOperation?.timing.pattern === 'interval'
      ? `${declaredOperation.timing.workSeconds}초 운동 · ${declaredOperation.timing.restSeconds}초 휴식 · ${declaredOperation.timing.sets}세트`
      : null;
  const guideDisplay = buildSpomoveGuideDisplayModel({
    preset,
    contentOverride,
    audience: 'public',
    matCount,
    cueSeconds,
  });

  return (
    <BottomSheet open title={display.displayTitle} onClose={onClose} size="preview">
      <div className="flex flex-col gap-3" data-spm-spomove-launch-confirm="">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.88fr)] lg:items-stretch">
          <div data-preview-column="media" className="min-w-0 lg:flex">
            <SpomoveScreenPreview videoUrl={guideVideoUrl} />
          </div>

          <aside
            data-preview-column="content"
            data-preview-summary
            className="min-w-0 rounded-[14px] border border-slate-200 bg-white p-4 [scrollbar-width:thin] lg:max-h-[min(620px,calc(100dvh-260px))] lg:overflow-y-auto"
            tabIndex={0}
          >
            <div className="space-y-5">
              <GuideModeNotice guideMode={guideDisplay.guideMode} />
              {guideDisplay.guideMode === 'published' ? (
                <PublishedGuideContent guideDisplay={guideDisplay} prepLine={prepLine} intervalLine={intervalLine} />
              ) : guideDisplay.guideMode === 'legacy' && guideDisplay.legacyManual ? (
                <LegacyGuideContent legacyManual={guideDisplay.legacyManual} prepLine={prepLine} intervalLine={intervalLine} />
              ) : (
                <PreparingGuideContent prepLine={prepLine} intervalLine={intervalLine} />
              )}
            </div>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="hidden h-10 w-[96px] items-center justify-center rounded-[10px] border border-slate-200 px-4 text-[13px] font-black text-slate-700 sm:inline-flex"
          >
            닫기
          </button>
          <Link
            href={startHref}
            data-spm-spomove-guide-action="start-official"
            className="spm-btn-primary inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] px-4 text-[15px] font-black focus-visible:outline-none sm:h-10 sm:w-[168px] sm:text-[13px]"
          >
            수업 시작
          </Link>
        </div>
      </div>
    </BottomSheet>
  );
}
