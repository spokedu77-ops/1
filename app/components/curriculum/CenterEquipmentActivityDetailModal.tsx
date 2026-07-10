'use client';

import Image from 'next/image';
import { ListOrdered, X } from 'lucide-react';
import { getYouTubeVideoId as getYouTubeId } from '@/app/lib/curriculum/youtubeVideoId';

export type CenterEquipmentGuideActivity = {
  id: number;
  number: number;
  step: number;
  name?: string | null;
  image_url?: string | null;
  detail_text?: string | null;
  activity_image_url?: string | null;
  activity_video_url?: string | null;
  activity_text?: string | null;
};

function parseActivityLines(text: string | null | undefined): string[] {
  const raw = text?.trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

type Props = {
  item: CenterEquipmentGuideActivity;
  equipmentDisplayName: string;
  onClose: () => void;
};

/** 센터 커리큘럼 상세 모달과 동일한 다크 레이아웃 */
export default function CenterEquipmentActivityDetailModal({
  item,
  equipmentDisplayName,
  onClose,
}: Props) {
  const imageUrl = (item.activity_image_url ?? '').trim();
  const videoUrl = (item.activity_video_url ?? '').trim();
  const mediaUrl = videoUrl || imageUrl;
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const lines = parseActivityLines(item.activity_text);
  const weekLabel = `${item.step}주차`;
  const title =
    lines.length > 1 ? lines[0] : lines.length === 1 ? `${equipmentDisplayName} 활동` : `${equipmentDisplayName} 활동`;
  const bodyLines = lines.length > 1 ? lines.slice(1) : [];
  const singleBody = lines.length === 1 ? lines[0] : null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {mediaUrl ? (
          <div className="relative w-full aspect-video bg-black shrink-0">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={title}
              />
            ) : videoUrl ? (
              <video src={videoUrl} className="w-full h-full object-contain" controls playsInline />
            ) : (
              <Image src={mediaUrl} alt="" fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" unoptimized />
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={onClose}
              className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
          <div>
            <h2 className="text-2xl font-black mb-2">{title}</h2>
            <p className="text-slate-400 text-sm font-bold">
              {equipmentDisplayName} · {weekLabel} · 교구 가이드라인
            </p>
          </div>

          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
            <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
              <ListOrdered size={16} /> 활동 방법
            </div>
            {bodyLines.length > 0 ? (
              <div className="space-y-4 text-left">
                {bodyLines.map((step, i) => (
                  <div key={`${item.id}-step-${i}`} className="text-left">
                    <p className="text-sm font-bold text-slate-200 leading-relaxed text-left whitespace-pre-wrap">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            ) : singleBody ? (
              <p className="text-sm font-bold text-slate-200 leading-relaxed whitespace-pre-wrap">
                {singleBody}
              </p>
            ) : item.detail_text?.trim() ? (
              <p className="text-sm font-bold text-slate-200 leading-relaxed whitespace-pre-wrap">
                {item.detail_text.trim()}
              </p>
            ) : (
              <p className="text-slate-500 text-sm">등록된 활동 내용이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
