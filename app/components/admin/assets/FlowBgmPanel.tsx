'use client';

import { useRef, useState } from 'react';
import { useFlowBGM } from '@/app/lib/admin/hooks/useFlowBGM';
import { useFlowPano } from '@/app/lib/admin/hooks/useFlowPano';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function FlowBgmPanel() {
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
  const {
    list: bgmList,
    selected: selectedBgm,
    loading: bgmLoading,
    error,
    upload: uploadBgm,
    remove: removeBgm,
    select: selectBgm,
  } = useFlowBGM(month);
  const {
    list: panoList,
    selected: selectedPano,
    loading: panoLoading,
    error: panoError,
    upload: uploadPano,
    remove: removePano,
    select: selectPano,
  } = useFlowPano(month);
  const bgmFileRef = useRef<HTMLInputElement | null>(null);
  const panoFileRef = useRef<HTMLInputElement | null>(null);

  const handleBgmUpload = async () => {
    const file = bgmFileRef.current?.files?.[0];
    if (!file) return;
    try {
      await uploadBgm(file);
      bgmFileRef.current!.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  const handlePanoUpload = async () => {
    const file = panoFileRef.current?.files?.[0];
    if (!file) return;
    try {
      await uploadPano(file);
      panoFileRef.current!.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-2 text-base font-bold text-neutral-200">월별 테마</h3>
        <p className="mb-4 text-xs text-neutral-500">
          선택한 월에 적용될 BGM·배경을 설정합니다. 구독자 Flow는 해당 주의 월에 맞춰 적용됩니다.
        </p>
        <label htmlFor="flow-month" className="mb-2 block text-sm text-neutral-400">
          월 선택
        </label>
        <select
          id="flow-month"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Flow 테마 월 선택"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </section>

      {(error || panoError) && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error || panoError}
        </div>
      )}

      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-4 text-base font-bold text-neutral-200">Flow BGM ({month}월)</h3>
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={bgmFileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav"
            className="hidden"
            onChange={handleBgmUpload}
          />
          <button
            type="button"
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
            onClick={() => bgmFileRef.current?.click()}
          >
            BGM 업로드
          </button>
          {!bgmLoading && bgmList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bgmList.map((path) => {
                const name = path.split('/').pop() ?? path;
                const isSelected = selectedBgm === path;
                return (
                  <div
                    key={path}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2"
                  >
                    <span className="text-sm text-neutral-300">{name}</span>
                    <button
                      type="button"
                      className={`rounded px-2 py-1 text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600'
                      }`}
                      onClick={() => selectBgm(path)}
                    >
                      {isSelected ? '사용 중' : '선택'}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-900/70"
                      onClick={() => removeBgm(path)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          MP3/WAV 업로드. 선택한 BGM이 Flow Phase 재생 시 사용됩니다.
        </p>
      </section>

      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-4 text-base font-bold text-neutral-200">배경 (2:1 Equirect 파노라마) ({month}월)</h3>
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={panoFileRef}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={handlePanoUpload}
          />
          <button
            type="button"
            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600"
            onClick={() => panoFileRef.current?.click()}
          >
            파노라마 업로드
          </button>
          {!panoLoading && panoList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {panoList.map((path) => {
                const name = path.split('/').pop() ?? path;
                const isSelected = selectedPano === path;
                return (
                  <div
                    key={path}
                    className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2"
                  >
                    <span className="text-sm text-neutral-300">{name}</span>
                    <button
                      type="button"
                      className={`rounded px-2 py-1 text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600'
                      }`}
                      onClick={() => selectPano(path)}
                    >
                      {isSelected ? '사용 중' : '선택'}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-900/70"
                      onClick={() => removePano(path)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          WebP/JPEG/PNG 2:1 비율 권장. 선택한 이미지가 Flow Phase 배경으로 사용됩니다.
        </p>
      </section>
    </div>
  );
}
