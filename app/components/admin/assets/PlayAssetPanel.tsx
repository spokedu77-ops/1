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
    resetPack,
  } = usePlayAssetPack(year, month, week);

  const filledCount = PLAY_SLOT_KEYS.filter((k) => !!state.images[k]).length;

  const handleReset = () => {
    if (
      !confirm(
        '이 주차(week)의 이미지 20개와 BGM을 전부 지우고 비웁니다. 저장소 파일도 삭제되며 되돌릴 수 없습니다. 계속할까요?'
      )
    )
      return;
    resetPack();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-xs text-neutral-400">
        <span>
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
        </span>
        <button
          type="button"
          className="cursor-pointer rounded border border-red-800/60 bg-red-900/30 px-2 py-1 text-red-300 transition-colors hover:bg-red-900/50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-neutral-900"
          onClick={handleReset}
        >
          이 주차 전부 리셋
        </button>
      </div>
      {saveError && (
        <div className="rounded border border-red-800/50 bg-red-900/20 px-3 py-2 text-xs text-red-400">
          저장 실패: {saveError}
        </div>
      )}

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
