'use client';

import { usePlayAssetPack } from '@/app/lib/admin/hooks/usePlayAssetPack';
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
    uploadImage,
    removeImage,
    uploadBgm,
    removeBgm,
    getImageUrl,
    getBgmUrl,
  } = usePlayAssetPack(year, month, week);

  return (
    <div className="space-y-6">
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
