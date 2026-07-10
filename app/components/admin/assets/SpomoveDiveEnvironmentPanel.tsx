'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useSpomoveDiveEnvironments,
} from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';
import { DIVE_THEME_UI, type DiveThemeId } from '@/app/lib/spomove/diveThemes';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DIVE_THEMES = DIVE_THEME_UI;

export function SpomoveDiveEnvironmentPanel() {
  const { data, loading, saving, error, upload, remove, saveYaw, getPreviewUrl, setError } =
    useSpomoveDiveEnvironments();

  const fileRefs = useRef<Partial<Record<DiveThemeId, HTMLInputElement | null>>>({});
  const yawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로컬 yaw 값 — DB에서 초기화, 이후 슬라이더 즉시 반영
  const [yawValues, setYawValues] = useState<Partial<Record<DiveThemeId, number>>>({});

  useEffect(() => {
    const init: Partial<Record<DiveThemeId, number>> = {};
    for (const [id, entry] of Object.entries(data.themes)) {
      init[id as DiveThemeId] = entry?.yawDeg ?? 0;
    }
    setYawValues(init);
  }, [data.themes]);

  const handleYawChange = (themeId: DiveThemeId, val: number) => {
    setYawValues((prev) => ({ ...prev, [themeId]: val }));
    if (yawTimerRef.current) clearTimeout(yawTimerRef.current);
    yawTimerRef.current = setTimeout(() => {
      void saveYaw(themeId, val).catch((e: unknown) => {
        setError((e as Error).message);
      });
    }, 500);
  };

  const handleUpload = async (themeId: DiveThemeId, file: File) => {
    setError(null);
    try {
      await upload(themeId, file);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemove = async (themeId: DiveThemeId) => {
    setError(null);
    try {
      await remove(themeId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        DIVE 게임(SPOMOVE) 배경 파노라마를 관리합니다.
        <br />
        <span className="text-neutral-500">
          PNG / JPG / WebP · 정확한 2:1 비율 · 최소 2048×1024 · 업로드 시 WebP로 자동 변환
          (4096×2048 이상이면 고해상도·저해상도 두 파일 생성)
        </span>
      </p>

      <p className="font-mono text-[0.65rem] text-neutral-600">
        DB: think_asset_packs.id = spomove_dive_environment_settings
      </p>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-500">불러오는 중…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIVE_THEMES.map(({ id, label }) => {
            const entry = data.themes[id] ?? null;
            const previewUrl = getPreviewUrl(entry?.panoramaPath);
            const yaw = yawValues[id] ?? 0;

            return (
              <div key={id} className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
                <div className="mb-2 text-xs font-bold text-neutral-400">{label} 파노라마</div>

                {/* 2:1 비율 프리뷰 */}
                <div
                  className="relative mb-3 w-full overflow-hidden rounded-lg bg-black"
                  style={{ aspectRatio: '2/1' }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                      없음
                    </div>
                  )}
                </div>

                {/* 메타 정보 */}
                {entry && (
                  <div className="mb-3 space-y-1 text-xs text-neutral-500">
                    <div>
                      해상도:{' '}
                      <span className="text-neutral-300">
                        {entry.width} × {entry.height}
                        {entry.hasHighRes ? ' (고해상도)' : ''}
                      </span>
                    </div>
                    <div>
                      비율: <span className="text-neutral-300">2:1</span>
                    </div>
                    <div>
                      용량: <span className="text-neutral-300">{formatBytes(entry.fileSize)}</span>
                    </div>
                    <div>
                      수정:{' '}
                      <span className="text-neutral-300">{formatDate(entry.updatedAt)}</span>
                    </div>
                  </div>
                )}

                {/* 배경 정면 방향 슬라이더 */}
                {entry && (
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-400">
                        배경 정면 방향
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="min-w-[3rem] text-right font-mono text-xs text-neutral-300">
                          {yaw > 0 ? `+${yaw}` : yaw}°
                        </span>
                        <button
                          type="button"
                          disabled={saving || yaw === 0}
                          onClick={() => handleYawChange(id, 0)}
                          className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
                        >
                          초기화
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={yaw}
                      disabled={saving}
                      onChange={(e) => handleYawChange(id, Number(e.target.value))}
                      className="w-full accent-violet-500 disabled:opacity-50"
                    />
                    <div className="mt-0.5 flex justify-between text-[0.6rem] text-neutral-600">
                      <span>-180°</span>
                      <span>0°</span>
                      <span>+180°</span>
                    </div>
                  </div>
                )}

                {/* 파일 입력 (hidden) */}
                <input
                  ref={(el) => {
                    fileRefs.current[id] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    await handleUpload(id, f);
                  }}
                />

                {/* 액션 버튼 */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-600 disabled:opacity-50"
                    onClick={() => fileRefs.current[id]?.click()}
                  >
                    {entry ? '교체' : '업로드'}
                  </button>
                  {entry && (
                    <button
                      type="button"
                      disabled={saving}
                      className="rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                      onClick={() => void handleRemove(id)}
                    >
                      삭제
                    </button>
                  )}
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
