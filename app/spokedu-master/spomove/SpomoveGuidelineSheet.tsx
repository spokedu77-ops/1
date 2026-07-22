'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import { TrackedVideoIframe } from '../components/lesson/TrackedVideoIframe';
import { BottomSheet } from '../components/ui/BottomSheet';
import { preferLiteMedia } from '../lib/mediaPreferences';
import { getVideoThumbnailCandidates } from '../lib/program-media';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { publicOfficialPresetSessionHref } from './officialSpomovePresets';
import { buildSpomoveGuidelineNarrative, getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';
import { getPresetMovementSummary } from './movements/presetMovementSummary';
import { getMovementProfile } from './movements/movementProfiles';
import { MOVEMENT_REGISTRY } from './movements/movementRegistry';
import { getActivityFamily } from './movements/activityFamilies';
import { isSpomoveMovementLayerEnabled } from './movements/movementFlag';
import { clampCueSpeedSec, resolveSessionCueSeconds } from './spomoveCueSpeed';
import {
  buildDeclaredOperation,
  operationSummaryLine,
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
    'mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-black sm:rounded-2xl';
  const ratioClassName = 'aspect-video max-h-[168px] w-full sm:max-h-[260px]';

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
  onClose,
}: {
  preset: OfficialSpomovePreset | null;
  guideVideoUrl?: string;
  onClose: () => void;
}) {
  const launchMode = usePreferredLaunchMode();
  const userProfile = useProfile();
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setDetailOpen(false);
  }, [preset?.id]);

  const movementLayerEnabled = isSpomoveMovementLayerEnabled({
    isAdmin: userProfile?.isAdmin,
    userId: userProfile?.id,
    userRole: userProfile?.isAdmin ? 'admin' : undefined,
  });

  if (!preset) return null;

  const display = getSpomovePresetDisplayModel(preset);
  const guidelineNarrative = buildSpomoveGuidelineNarrative(preset);
  const movementSummary = movementLayerEnabled ? getPresetMovementSummary(preset) : null;
  const movementProfile = preset.movementProfileId ? getMovementProfile(preset.movementProfileId) : null;
  const isBodyCueBuiltIn = movementProfile?.id === 'bodyCueBuiltIn';

  const officialRecommended = movementSummary?.officialRecommended ?? null;
  const recommendedDef =
    officialRecommended && movementProfile && movementProfile.selectionMode !== 'disabled'
      ? MOVEMENT_REGISTRY[officialRecommended.baseMovement]
      : null;

  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  const operationProfileId = preset.operationProfileId ?? family?.operationProfileId;
  const declaredOperation =
    operationProfileId && family
      ? buildDeclaredOperation(operationProfileId, preset.recommendedOperation)
      : null;
  const operationLine = declaredOperation ? operationSummaryLine(declaredOperation) : null;
  const matGuidance =
    family && declaredOperation
      ? resolveRequiredMatGuidance({
          minMats: family.matRequirement.minMats,
          participantScale: declaredOperation.participantScale,
        })
      : null;

  const cueSeconds = officialRecommended
    ? clampCueSpeedSec(
        Math.max(
          resolveSessionCueSeconds(preset, null),
          MOVEMENT_REGISTRY[officialRecommended.baseMovement].minimumCueSeconds,
        ),
      )
    : resolveSessionCueSeconds(preset, null);

  const startHref = publicOfficialPresetSessionHref(preset, {
    mode: launchMode,
    entry: 'start',
    movement: officialRecommended?.baseMovement,
    limb: officialRecommended?.limbRule,
    cueSeconds: officialRecommended ? cueSeconds : undefined,
    operation: declaredOperation,
  });

  const matCount = matGuidance?.recommended ?? movementSummary?.minMats ?? 1;
  const prepLine = `매트 ${matCount}장 · 자극 ${cueSeconds}초`;
  const intervalLine =
    declaredOperation?.timing.pattern === 'interval'
      ? `${declaredOperation.timing.workSeconds}초 운동 · ${declaredOperation.timing.restSeconds}초 휴식 · ${declaredOperation.timing.sets}세트`
      : null;

  const detailBits = [
    guidelineNarrative,
    recommendedDef?.safetyNote ? `안전: ${recommendedDef.safetyNote}` : null,
    recommendedDef?.teacherCue ? `멘트: ${recommendedDef.teacherCue}` : null,
  ].filter(Boolean) as string[];

  return (
    <BottomSheet open title={display.displayTitle} onClose={onClose} size="launch">
      <div className="flex min-h-0 flex-col gap-3 pb-1" data-spm-spomove-launch-confirm="">
        <SpomoveScreenPreview videoUrl={guideVideoUrl} />

        {isBodyCueBuiltIn ? (
          <div>
            <p className="text-[11px] font-black tracking-[0.06em] text-slate-400">추천 움직임</p>
            <p className="mt-0.5 text-[16px] font-black text-slate-950 sm:text-[17px]">화면 신체 안내</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-600">
              화면이 손·발을 직접 지정합니다. 화면 지시에 따라 수행하세요.
            </p>
          </div>
        ) : recommendedDef && officialRecommended ? (
          <div>
            <p className="text-[11px] font-black tracking-[0.06em] text-slate-400">추천 움직임</p>
            <p className="mt-0.5 text-[16px] font-black text-slate-950 sm:text-[17px]">
              {movementSummary?.recommendedLabel}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-600">
              {recommendedDef.instruction}
            </p>
          </div>
        ) : (
          <p className="text-[13px] font-semibold leading-5 text-slate-600">
            실행 조건을 확인한 뒤 바로 시작하세요.
          </p>
        )}

        {intervalLine ? (
          <p className="text-[13px] font-bold text-slate-700">{intervalLine}</p>
        ) : operationLine ? (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {operationLine.split(' · ').map((chip) => (
                <span
                  key={chip}
                  className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[12px] font-bold text-slate-600"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-[12px] font-medium text-slate-400">{prepLine}</p>
          </div>
        ) : (
          <p className="text-[12px] font-medium text-slate-400">{prepLine}</p>
        )}

        {detailBits.length > 0 ? (
          <div>
            <button
              type="button"
              data-spm-spomove-guide-action="detail"
              aria-expanded={detailOpen}
              onClick={() => setDetailOpen((open) => !open)}
              className="text-[13px] font-bold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              {detailOpen ? '간단히 보기' : '안내 더보기'}
            </button>
            {detailOpen ? (
              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 px-3 py-3 text-[13px] font-semibold leading-5 text-slate-600">
                {detailBits.map((line) => (
                  <p key={line.slice(0, 24)}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <Link
          href={startHref}
          data-spm-spomove-guide-action="start-official"
          className="mt-0.5 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-4 text-[15px] font-black text-white shadow-sm"
        >
          바로 시작
        </Link>
      </div>
    </BottomSheet>
  );
}
