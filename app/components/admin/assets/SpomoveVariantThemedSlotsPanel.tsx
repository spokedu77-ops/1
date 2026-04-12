'use client';

import { useRef } from 'react';
import { useSpomoveVariantThemedPack } from '@/app/lib/admin/hooks/useSpomoveVariantThemedPack';
import { spomoveVariantThemedPath } from '@/app/lib/admin/assets/storagePaths';
import type { SpomoveThemedPackDef } from '@/app/admin/memory-game/lib/spomoveVariantThemeConfig';
import { SPOMOVE_THEMED_SLOT_COUNT } from '@/app/admin/memory-game/lib/spomoveVariantThemeConfig';

export function SpomoveVariantThemedSlotsPanel({ def }: { def: SpomoveThemedPackDef }) {
  const { previewUrls, loading, saving, error, uploadAt, clearAt } = useSpomoveVariantThemedPack({
    packId: def.packId,
    packName: def.packName,
    slotCount: SPOMOVE_THEMED_SLOT_COUNT,
    storagePath: (slotIndex, ext) => spomoveVariantThemedPath(def.subfolder, slotIndex, ext),
  });
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">{def.intro}</p>
      {error && <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-sm text-neutral-500">불러오는 중…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {def.slotLabels.map((label, i) => {
            const url = previewUrls[i];
            return (
              <div key={`${def.packId}-${label}`} className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
                <div className="mb-2 text-xs font-bold text-neutral-500">
                  슬롯 {i + 1} · {label}
                </div>
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-black">
                  {url ? (
                    <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
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
                    비우기
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
