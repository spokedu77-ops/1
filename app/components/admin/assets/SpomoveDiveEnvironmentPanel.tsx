'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AssetHubUi.module.css';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';
import { DIVE_THEME_UI, getDiveObstacleDefaults, hasDivePanorama, type DiveActiveThemeId, type DiveObstacleKind } from '@/app/lib/spomove/diveThemes';
import { resolveDiveThemePresentation } from '@/app/admin/spomove/training/_player/flow-lab/engine/modules/diveThemePresentation';
import { DiveThemeSelector } from '@/app/components/spomove/DiveThemeSelector';

export function SpomoveDiveEnvironmentPanel() {
  const { data, loading, saving, error, upload, uploadObstacle, remove, saveYaw, getPreviewUrl, setError } = useSpomoveDiveEnvironments();
  const [selectedTheme, setSelectedTheme] = useState<DiveActiveThemeId>(DIVE_THEME_UI[0].id);
  const [working, setWorking] = useState(false);
  const [yawPending, setYawPending] = useState(false);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [yawValues, setYawValues] = useState<Partial<Record<DiveActiveThemeId, number>>>({});
  const yawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panoramaInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (yawTimer.current) clearTimeout(yawTimer.current); }, []);
  const entry = data.themes[selectedTheme];
  const label = DIVE_THEME_UI.find(theme => theme.id === selectedTheme)?.label ?? selectedTheme;
  const hasPanorama = hasDivePanorama(entry);
  const previewUrl = getPreviewUrl(entry?.hasHighRes ? entry.panoramaPath : entry?.panoramaLowPath);
  const yaw = yawValues[selectedTheme] ?? entry?.yawDeg ?? 0;
  const busy = saving || working;
  const run = async (action: () => Promise<void>) => {
    setWorking(true); setError(null);
    try { await action(); } catch (error) { setError((error as Error).message); }
    finally { setWorking(false); }
  };
  const changeYaw = (value: number) => {
    const theme = selectedTheme;
    setYawValues(previous => ({ ...previous, [theme]: value })); setYawPending(true);
    if (yawTimer.current) clearTimeout(yawTimer.current);
    yawTimer.current = setTimeout(() => {
      void saveYaw(theme, value).catch(error => setError((error as Error).message)).finally(() => setYawPending(false));
    }, 500);
  };
  return <div className="min-w-0 space-y-4">
    <DiveThemeSelector tabs value={selectedTheme} onChange={setSelectedTheme} disabled={busy || yawPending} />
    {error ? <div role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div> : null}
    {loading ? <p className="text-sm text-slate-400">불러오는 중…</p> : (
      <section aria-label={`${label} 테마 관리`} className={`${styles.assetCard} min-w-0`}>
        <h2 className="mb-4 text-lg font-bold text-white">{label}</h2>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-bold text-slate-200">파노라마</h3>
            <div className={styles.assetPreview} style={{ aspectRatio: '2/1' }}>
              {previewUrl && previewUrl !== failedPreview ? <img src={previewUrl} alt={`${label} 파노라마`} onError={() => setFailedPreview(previewUrl)} className="h-full w-full object-contain" />
                : <div className="flex h-full items-center justify-center text-sm text-slate-400">{previewUrl ? '파노라마 미리보기 로딩 실패' : `${label} · 기본 배경 사용`}</div>}
            </div>
            <p className="text-xs text-slate-400">2:1 · 최소 2048×1024 · PNG / JPG / WebP</p>
            <input key={selectedTheme} ref={panoramaInput} type="file" accept="image/png,image/jpeg,image/webp"
              aria-label={`${selectedTheme} 파노라마 교체`} className="hidden" disabled={busy || yawPending}
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => upload(selectedTheme, file)); }} />
            <div className="flex gap-2">
              <button type="button" disabled={busy || yawPending} className={styles.uploadButton} onClick={() => panoramaInput.current?.click()}>{hasPanorama ? '파노라마 교체' : '파노라마 업로드'}</button>
              <button type="button" disabled={busy || yawPending || !hasPanorama} className={styles.dangerButton} onClick={() => void run(() => remove(selectedTheme))}>등록 삭제</button>
            </div>
            <div className="pt-2">
              <label htmlFor="dive-panorama-yaw" className="flex justify-between text-xs font-semibold text-slate-300"><span>배경 정면 방향</span><span>{yaw}°</span></label>
              <input id="dive-panorama-yaw" type="range" min={-180} max={180} step={1} value={yaw}
                disabled={busy || !hasPanorama} onChange={event => changeYaw(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" />
              <div className="flex justify-between text-xs text-slate-500"><span>-180°</span><button type="button" disabled={busy || !hasPanorama || yaw === 0} onClick={() => changeYaw(0)}>방향 초기화</button><span>180°</span></div>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-bold text-slate-200">장애물</h3>
            <div className="grid min-w-0 grid-cols-2 gap-3">
              {(['duck', 'punch', 'kick', 'reach'] as DiveObstacleKind[]).map(kind => {
                const copy = resolveDiveThemePresentation(selectedTheme, kind);
                const src = getPreviewUrl(entry?.obstacles?.[kind]) ?? getDiveObstacleDefaults(selectedTheme)[kind];
                return <label key={`${selectedTheme}-${kind}`} className="block min-w-0 rounded-xl border border-white/10 p-2 text-xs text-slate-300">
                  <strong className="block text-cyan-200">{kind.toUpperCase()}</strong><span>{copy.label}</span>
                  <img src={src} alt={`${label} ${copy.label}`} className="my-2 h-28 w-full rounded bg-slate-900 object-contain" />
                  <input type="file" accept="image/png" aria-label={`${selectedTheme} ${kind} 이미지 교체`} disabled={busy || yawPending} className="w-full min-w-0 text-[10px]"
                    onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => uploadObstacle(kind, file, selectedTheme)); }} />
                </label>;
              })}
            </div>
          </div>
        </div>
      </section>
    )}
    {(busy || yawPending) && <p role="status" className="text-xs text-amber-200">저장 중…</p>}
  </div>;
}
