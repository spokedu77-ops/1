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
import { getPresetMovementSummary } from './movements/presetMovementSummary';
import { getActivityFamily } from './movements/activityFamilies';
import { isSpomoveMovementLayerEnabled } from './movements/movementFlag';
import { clampCueSpeedSec, resolveSessionCueSeconds } from './spomoveCueSpeed';
import {
  buildDeclaredOperation,
  resolveRequiredMatGuidance,
} from './operations';
import { useProfile } from '../store';

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

/**
 * 홈/허브 공용 — 재생 직전 확인 모달.
 * 닫기(X)는 항상 onClose만 호출 (페이지 이동 없음).
 */
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
  const userProfile = useProfile();

  const movementLayerEnabled = isSpomoveMovementLayerEnabled({
    isAdmin: userProfile?.isAdmin,
    userId: userProfile?.id,
    userRole: userProfile?.isAdmin ? 'admin' : undefined,
  });

  if (!preset) return null;

  const display = getSpomovePresetDisplayModel(preset);
  const movementSummary = movementLayerEnabled ? getPresetMovementSummary(preset) : null;

  const officialRecommended = movementSummary?.officialRecommended ?? null;

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

  const cueSeconds = officialRecommended
    ? clampCueSpeedSec(resolveSessionCueSeconds(preset, null))
    : resolveSessionCueSeconds(preset, null);

  const startHref = publicOfficialPresetSessionHref(preset, {
    mode: launchMode,
    entry: 'start',
    movement: officialRecommended?.baseMovement,
    limb: officialRecommended?.limbRule,
    cueSeconds: officialRecommended ? cueSeconds : undefined,
    operation: declaredOperation,
    hubView: hubView === 'favorites' ? 'favorites' : undefined,
  });

  const matCount = matGuidance?.recommended ?? movementSummary?.minMats ?? 1;
  const prepLine = `매트 ${matCount}장 · 자극 ${cueSeconds}초`;
  const intervalLine =
    declaredOperation?.timing.pattern === 'interval'
      ? `${declaredOperation.timing.workSeconds}초 운동 · ${declaredOperation.timing.restSeconds}초 휴식 · ${declaredOperation.timing.sets}세트`
      : null;
  const guideDisplay = buildSpomoveGuideDisplayModel({
    preset,
    contentOverride,
    matCount,
    cueSeconds,
  });
  const variationRows = [
    ['다른 움직임', guideDisplay.movementVariation],
    ['규칙 변형', guideDisplay.ruleVariation],
    ['운영 변형', guideDisplay.operationVariation],
  ].filter((row): row is [string, string] => Boolean(row[1]));

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
                {intervalLine ? (
                  <p className="mt-1 text-[12px] font-medium text-slate-400">{intervalLine}</p>
                ) : null}
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
