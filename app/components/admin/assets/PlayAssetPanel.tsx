'use client';

import { usePlayAssetPack } from '@/app/lib/admin/hooks/usePlayAssetPack';
import { PLAY_SLOT_KEYS } from '@/app/lib/admin/assets/storagePaths';
import { PlayBgmUploader } from './PlayBgmUploader';
import { PlayImageGridUploader } from './PlayImageGridUploader';

export interface PlayAssetPanelProps {
  year: number;
  month: number;
  week: number;
}

export function PlayAssetPanel({ year, month, week }: PlayAssetPanelProps) {
  const {
    state,
    error,
    tableMissing,
    weekKey,
    saveError,
    lastSavedAt,
    uploadImage,
    removeImage,
    uploadBgm,
    removeBgm,
    getImageUrl,
    getBgmUrl,
  } = usePlayAssetPack(year, month, week);

  const filledCount = PLAY_SLOT_KEYS.filter((k) => !!state.images[k]).length;

  return (
    <div className="space-y-6">
      <div className="rounded border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-xs text-neutral-400">
        <span className="font-mono">{weekKey}</span>
        <span className="mx-2">|</span>
        <span>Images: {filledCount}/20</span>
        <span className="mx-2">|</span>
        <span>BGM: {state.bgmPath ? 'O' : 'X'}</span>
        {lastSavedAt != null && (
          <>
            <span className="mx-2">|</span>
            <span>저장: {new Date(lastSavedAt).toLocaleTimeString()}</span>
          </>
        )}
        {saveError && (
          <div className="mt-1 text-red-400">저장 실패: {saveError}</div>
        )}
      </div>

      {tableMissing && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <code>play_asset_packs</code> 테이블이 없습니다. Supabase에서{' '}
          <code className="text-amber-300">sql/25_play_asset_packs.sql</code>을
          실행하세요.
        </div>
      )}
      {error && !tableMissing && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <PlayBgmUploader
        bgmPath={state.bgmPath}
        getBgmUrl={getBgmUrl}
        onUpload={uploadBgm}
        onRemove={removeBgm}
      />

      <PlayImageGridUploader
        images={state.images}
        getImageUrl={getImageUrl}
        onUpload={uploadImage}
        onRemove={removeImage}
      />
    </div>
  );
}
