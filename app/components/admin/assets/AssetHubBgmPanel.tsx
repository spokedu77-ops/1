'use client';

import { useRef } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { useSpomoveTrainingBGM, SPOMOVE_TRAINING_BGM_PACK_ID } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';

/**
 * Asset Hub — SPOMOVE 훈련 전용 BGM 풀.
 * 반응 인지·순차 기억·스트룹·사이먼·이중 과제 등 SPOMOVE 트레이닝 화면에서 재생 시,
 * 이 목록에 등록된 곡 중 하나를 무작위로 재생합니다 (Flow·챌린지 iframe 음원과 별도).
 */
export function AssetHubBgmPanel() {
  const { list, loading, error, upload, remove } = useSpomoveTrainingBGM();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      await upload(file);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      devLogger.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-2 text-base font-bold text-neutral-200">SPOMOVE 훈련 BGM</h3>
        <p className="mb-1 text-sm text-neutral-400">
          여기에 올린 곡들만 <strong className="text-neutral-200">SPOMOVE 트레이닝</strong> 배경음 후보가 됩니다. 세션 시작마다 목록
          중 <strong className="text-neutral-200">무작위 1곡</strong>이 재생됩니다. Think·Flow Phase·챌린지 전용 음원은 각각 Think
          Asset / Flow Asset / 챌린지 화면에서 관리합니다.
        </p>
        <p className="mb-4 font-mono text-[0.65rem] text-neutral-600">DB: think_asset_packs.id = {SPOMOVE_TRAINING_BGM_PACK_ID}</p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
            onClick={() => fileRef.current?.click()}
          >
            곡 업로드 (MP3/WAV)
          </button>
          {!loading && list.length === 0 && (
            <span className="text-sm text-neutral-500">등록된 곡이 없으면 훈련 시 배경음이 재생되지 않습니다.</span>
          )}
          {!loading && list.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              {list.map((path) => {
                const name = path.split('/').pop() ?? path;
                return (
                  <div
                    key={path}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-700 px-3 py-2"
                  >
                    <span className="break-all text-sm text-neutral-300">{name}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded bg-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-900/70"
                      onClick={() => remove(path)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
