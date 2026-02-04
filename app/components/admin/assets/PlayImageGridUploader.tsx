'use client';

import { useRef } from 'react';
import { PLAY_SLOT_KEYS, type PlaySlotKey } from '@/app/lib/admin/assets/storagePaths';

const SLOT_LABELS: Record<PlaySlotKey, string> = {
  a1_off: '액션1 Off',
  a1_on: '액션1 On',
  a2_off: '액션2 Off',
  a2_on: '액션2 On',
  a3_off: '액션3 Off',
  a3_on: '액션3 On',
  a4_off: '액션4 Off',
  a4_on: '액션4 On',
  a5_off: '액션5 Off',
  a5_on: '액션5 On',
};

export interface PlayImageGridUploaderProps {
  images: Record<PlaySlotKey, string | null>;
  getImageUrl: (path: string | null) => string;
  onUpload: (slotKey: PlaySlotKey, file: File) => Promise<void>;
  onRemove: (slotKey: PlaySlotKey) => Promise<void>;
}

export function PlayImageGridUploader({
  images,
  getImageUrl,
  onUpload,
  onRemove,
}: PlayImageGridUploaderProps) {
  const fileRefs = useRef<Partial<Record<PlaySlotKey, HTMLInputElement | null>>>({});

  const handleUpload = async (slotKey: PlaySlotKey) => {
    const el = fileRefs.current[slotKey];
    const file = el?.files?.[0];
    if (!file) return;
    try {
      await onUpload(slotKey, file);
      el.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
      <h3 className="mb-4 text-base font-bold text-neutral-200">
        5 action × 2 variant (10 슬롯)
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {PLAY_SLOT_KEYS.map((slotKey) => {
          const path = images[slotKey];
          return (
            <div
              key={slotKey}
              className="flex flex-col gap-2 rounded-lg border border-neutral-700 p-3"
            >
              <span className="text-xs font-medium text-neutral-400">
                {SLOT_LABELS[slotKey]}
              </span>
              <div
                className="relative aspect-square w-full overflow-hidden rounded-md bg-neutral-800"
                style={{ minHeight: 80 }}
              >
                {path ? (
                  <img
                    src={getImageUrl(path)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-500 text-xs">
                    없음
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={(el) => {
                    fileRefs.current[slotKey] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={() => handleUpload(slotKey)}
                />
                <button
                  type="button"
                  className="flex-1 rounded bg-neutral-700 py-1.5 text-xs hover:bg-neutral-600"
                  onClick={() => fileRefs.current[slotKey]?.click()}
                >
                  업로드
                </button>
                {path && (
                  <button
                    type="button"
                    className="rounded bg-red-900/50 py-1.5 text-xs text-red-400 hover:bg-red-900/70"
                    onClick={() => onRemove(slotKey)}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        각 액션별 off/on 이미지를 업로드하세요. Action Library에서 액션·오퍼레이터를 설정합니다.
      </p>
    </section>
  );
}
