'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import { TrackedVideoIframe } from '../components/lesson/TrackedVideoIframe';
import { BottomSheet } from '../components/ui/BottomSheet';
import { preferLiteMedia } from '../lib/mediaPreferences';
import { getVideoThumbnailCandidates } from '../lib/program-media';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { officialPresetSessionHref } from './officialSpomovePresets';
import { buildSpomoveGuidelineNarrative, getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';

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

function SpomoveGuideVideo({ videoUrl }: { videoUrl: string }) {
  const [liteMedia, setLiteMedia] = useState(false);
  const embed = parseVideoEmbedUrl(videoUrl);

  useEffect(() => {
    setLiteMedia(preferLiteMedia());
  }, []);

  if (!embed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
        <p className="text-sm font-bold text-slate-500">등록된 가이드 영상이 없습니다.</p>
      </div>
    );
  }

  const posterCandidates = getVideoThumbnailCandidates(videoUrl, { lite: liteMedia });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
      <div className="aspect-video">
        <TrackedVideoIframe
          src={embed.embedUrl}
          title="SPOMOVE 가이드 영상"
          className="h-full w-full"
          posterCandidates={posterCandidates}
          deferUntilPlay
        />
      </div>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

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
  if (!preset) return null;
  const display = getSpomovePresetDisplayModel(preset);
  const guidelineNarrative = buildSpomoveGuidelineNarrative(preset);
  const startHref = officialPresetSessionHref(preset, { mode: launchMode });

  return (
    <BottomSheet open title="가이드 · 참고 영상" onClose={onClose} size="preview">
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-950">{display.displayTitle}</h2>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-slate-500">
            실행 전 아래 참고 영상을 확인하세요.
          </p>
        </div>

        <section aria-labelledby="spomove-guide-video-heading">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--spm-acc-glow)] text-[var(--spm-acc)]">
              ▶
            </span>
            <h3 id="spomove-guide-video-heading" className="text-[13px] font-black text-slate-950">
              참고 영상
            </h3>
          </div>
          <SpomoveGuideVideo videoUrl={guideVideoUrl} />
        </section>

        <div className="flex flex-col gap-2">
          <Link
            href={startHref}
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-4 text-[13px] font-black text-white"
          >
            실행
          </Link>
          <p className="text-center text-[12px] font-semibold leading-5 text-slate-500">
            {launchMode === 'mobile'
              ? '이 기기 레이아웃으로 엽니다. 프로젝터·TV에 연결했다면 PC에서 실행하세요.'
              : '큰 화면(프로젝터·TV) 레이아웃으로 엽니다. 세션에서 전체화면을 켤 수 있습니다.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-700"
          >
            닫기
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock title="대상" value={display.targetLabel} />
          <InfoBlock title="설정" value={display.settingLabel} />
          <InfoBlock title="난이도" value={display.difficultyLabel} />
          <InfoBlock title="신체 기능" value={display.bodyFunctionLabel} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-black text-slate-500">활동 안내</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{guidelineNarrative}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
