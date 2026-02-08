'use client';

import { useRef } from 'react';

export interface PlayBgmUploaderProps {
  bgmPath: string | null;
  getBgmUrl: (path: string | null) => string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function PlayBgmUploader({
  bgmPath,
  getBgmUrl,
  onUpload,
  onRemove,
}: PlayBgmUploaderProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleChange = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      await onUpload(file);
      fileRef.current!.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
      <h3 className="mb-4 text-base font-bold text-neutral-200">BGM</h3>
      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 text-sm transition-colors hover:bg-neutral-600 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-1 focus:ring-offset-neutral-900"
          onClick={() => fileRef.current?.click()}
        >
          BGM 업로드
        </button>
        {bgmPath && (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2">
            <span className="text-sm text-neutral-300">
              {bgmPath.split('/').pop() ?? 'BGM'}
            </span>
            <audio src={getBgmUrl(bgmPath)} controls className="h-8 max-w-[200px]" />
            <button
              type="button"
              className="cursor-pointer rounded bg-red-900/50 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/70 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-neutral-900"
              onClick={() => onRemove()}
            >
              삭제
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        MP3/WAV 업로드. 이 주차 Play Phase 재생 시 사용됩니다.
      </p>
    </section>
  );
}
