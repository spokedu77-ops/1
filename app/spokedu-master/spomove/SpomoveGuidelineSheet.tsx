'use client';

import Link from 'next/link';

import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import { BottomSheet } from '../components/ui/BottomSheet';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { officialPresetSessionHref } from './officialSpomovePresets';
import { SpomovePadLayoutView } from './SpomovePadLayoutView';
import { buildSpomoveGuidelineNarrative, getSpomovePresetDisplayModel } from './spomovePresetDisplayModel';

function SpomoveGuideVideo({ videoUrl }: { videoUrl: string }) {
  const embed = parseVideoEmbedUrl(videoUrl);
  if (!embed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
        <p className="text-sm font-bold text-slate-500">등록된 가이드 영상이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
      <div className="aspect-video">
        <iframe
          src={embed.embedUrl}
          title="SPOMOVE 가이드 영상"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
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
  if (!preset) return null;
  const display = getSpomovePresetDisplayModel(preset);
  const guidelineNarrative = buildSpomoveGuidelineNarrative(preset);
  const startHref = officialPresetSessionHref(preset, { autostart: true });

  return (
    <BottomSheet open title="가이드라인" onClose={onClose} size="preview">
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-950">{display.displayTitle}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={startHref}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white"
          >
            바로 실행
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            닫기
          </button>
        </div>

        <SpomoveGuideVideo videoUrl={guideVideoUrl} />

        <SpomovePadLayoutView variant={display.padLayoutVariant} />

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
