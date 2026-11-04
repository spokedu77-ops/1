'use client';

import styles from './AssetHubUi.module.css';

import { useRef } from 'react';
import { useSpomoveVariantFruitPack } from '@/app/lib/admin/hooks/useSpomoveVariantFruitPack';

export function SpomoveVariantFruitPanel() {
  const { previewSlides, slotLabels, loading, saving, uploadingSlot, error, uploadAt, clearAt } =
    useSpomoveVariantFruitPack();
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        SPOMOVE 연상 색지각 과일 <strong className="text-slate-200">8슬롯</strong> — 1~4=각 패드(빨·노·초·파), 5~8=같은 패드 두 번째. 업로드된 칸만 반영됩니다.
      </p>
      {error && <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="text-sm text-slate-400">불러오는 중…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slotLabels.map((label, i) => {
            const slide = previewSlides[i];
            return (
              <div key={label} className={styles.assetCard}>
                <div className="mb-2 text-xs font-bold text-slate-400">
                  슬롯 {i + 1} · {label}
                </div>
                <div className={`${styles.assetPreview} aspect-square`}>
                  {slide?.imageUrl?.trim() ? (
                    <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">없음</div>
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
                    disabled={saving || uploadingSlot !== null}
                    className={styles.uploadButton}
                    onClick={() => fileRefs.current[i]?.click()}
                  >
                    업로드
                  </button>
                  <button
                    type="button"
                    disabled={saving || uploadingSlot !== null}
                    className={styles.quietButton}
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
      {uploadingSlot !== null && (
        <p className="text-xs text-amber-200/90">파일 업로드 중… (슬롯 {uploadingSlot + 1})</p>
      )}
      {saving && <p className="text-xs text-amber-200/90">DB 저장 중…</p>}
    </div>
  );
}
