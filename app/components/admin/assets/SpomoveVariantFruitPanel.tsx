'use client';

import { useRef } from 'react';
import { useSpomoveVariantFruitPack } from '@/app/lib/admin/hooks/useSpomoveVariantFruitPack';

export function SpomoveVariantFruitPanel() {
  const { previewSlides, slotLabels, loading, saving, error, uploadAt, clearAt } = useSpomoveVariantFruitPack();
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        반응 인지 3·4·5번(변형 색지각)에서 쓰는 과일 11종입니다. 업로드한 슬롯은 Supabase Storage URL로 표시되고, 비운 슬롯은 기본(postimg) 이미지를 씁니다. SPOMOVE 트레이닝은 저장 후 새로고침·설정 화면 재진입 시 반영됩니다.
      </p>
      {error && <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-sm text-neutral-500">불러오는 중…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slotLabels.map((label, i) => {
            const slide = previewSlides[i];
            return (
              <div key={label} className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
                <div className="mb-2 text-xs font-bold text-neutral-500">
                  슬롯 {i + 1} · {label}
                </div>
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-black">
                  {slide?.imageUrl ? (
                    <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-600">없음</div>
                  )}
                </div>
                <input
                  ref={(el) => {
                    fileRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    await uploadAt(i, f);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-600 disabled:opacity-50"
                    onClick={() => fileRefs.current[i]?.click()}
                  >
                    업로드
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg border border-neutral-600 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                    onClick={() => void clearAt(i)}
                  >
                    기본값으로
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {saving && <p className="text-xs text-amber-200/90">저장 중…</p>}
    </div>
  );
}
