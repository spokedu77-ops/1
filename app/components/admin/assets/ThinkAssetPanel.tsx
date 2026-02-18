'use client';

import { useRef } from 'react';
import { useThink150Pack } from '@/app/lib/admin/hooks/useThink150Pack';
import { useThinkBGM } from '@/app/lib/admin/hooks/useThinkBGM';
import { getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import { PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

const COLORS: PADColor[] = ['red', 'green', 'yellow', 'blue'];
const COLOR_LABELS: Record<PADColor, string> = {
  red: '빨강',
  green: '초록',
  yellow: '노랑',
  blue: '파랑',
};

export interface ThinkAssetPanelProps {
  selectedMonth: number;
}

export function ThinkAssetPanel({ selectedMonth }: ThinkAssetPanelProps) {
  const { pathsByMonthAndWeek, error, upload, remove } = useThink150Pack();
  const {
    list: bgmList,
    selected: selectedBgm,
    loading: bgmLoading,
    upload: uploadBgm,
    remove: removeBgm,
    select: selectBgm,
  } = useThinkBGM();
  const bgmFileRef = useRef<HTMLInputElement | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleUpload = async (month: number, week: 3 | 4, color: PADColor) => {
    const key = `${month}-${week}-${color}`;
    const el = fileRefs.current[key];
    const file = el?.files?.[0];
    if (!file) return;
    try {
      await upload(month, week, 'setA', color, file);
      el.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  const monthPaths = pathsByMonthAndWeek[selectedMonth] ?? {
    week2: {
      setA: { red: '', green: '', yellow: '', blue: '' },
      setB: { red: '', green: '', yellow: '', blue: '' },
    },
    week3: {
      setA: { red: '', green: '', yellow: '', blue: '' },
      setB: { red: '', green: '', yellow: '', blue: '' },
    },
    week4: {
      setA: { red: '', green: '', yellow: '', blue: '' },
      setB: { red: '', green: '', yellow: '', blue: '' },
    },
  };
  const pathsWeek3 = monthPaths.week3.setA;
  const pathsWeek4 = monthPaths.week4.setA;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-4 text-base font-bold text-neutral-200">BGM</h3>
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
          MP3/WAV 업로드. 선택한 BGM이 Think 재생 시 사용됩니다.
        </p>
      </section>

      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-4 text-base font-bold text-neutral-200">3주차 이미지</h3>
        <p className="mb-4 text-xs text-neutral-500">
          여기 등록한 이미지는 각 월 3주차 A·B·C·D에 표시됩니다.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORS.map((color) => {
            const path = pathsWeek3[color];
            const hex = PAD_COLORS[color];
            const key = `${selectedMonth}-3-${color}`;
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-neutral-700 p-3"
              >
                <span className="text-sm font-medium text-neutral-300">
                  {COLOR_LABELS[color]}
                </span>
                <div
                  className="relative aspect-square w-full overflow-hidden rounded-md"
                  style={{ backgroundColor: hex, minHeight: 80 }}
                >
                  {path ? (
                    <img
                      src={getPublicUrl(path)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={(el) => {
                      fileRefs.current[key] = el;
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={() => handleUpload(selectedMonth, 3, color)}
                  />
                  <button
                    type="button"
                    className="flex-1 rounded bg-neutral-700 py-1.5 text-xs hover:bg-neutral-600"
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    업로드
                  </button>
                  {path && (
                    <button
                      type="button"
                      className="rounded bg-red-900/50 py-1.5 text-xs text-red-400 hover:bg-red-900/70"
                      onClick={() => remove(selectedMonth, 3, 'setA', color)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-neutral-900 p-5 ring-1 ring-neutral-800">
        <h3 className="mb-4 text-base font-bold text-neutral-200">4주차 이미지</h3>
        <p className="mb-4 text-xs text-neutral-500">
          여기 등록한 이미지는 각 월 4주차 A·B·C·D에 표시됩니다.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORS.map((color) => {
            const path = pathsWeek4[color];
            const hex = PAD_COLORS[color];
            const key = `${selectedMonth}-4-${color}`;
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-neutral-700 p-3"
              >
                <span className="text-sm font-medium text-neutral-300">
                  {COLOR_LABELS[color]}
                </span>
                <div
                  className="relative aspect-square w-full overflow-hidden rounded-md"
                  style={{ backgroundColor: hex, minHeight: 80 }}
                >
                  {path ? (
                    <img
                      src={getPublicUrl(path)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={(el) => {
                      fileRefs.current[key] = el;
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={() => handleUpload(selectedMonth, 4, color)}
                  />
                  <button
                    type="button"
                    className="flex-1 rounded bg-neutral-700 py-1.5 text-xs hover:bg-neutral-600"
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    업로드
                  </button>
                  {path && (
                    <button
                      type="button"
                      className="rounded bg-red-900/50 py-1.5 text-xs text-red-400 hover:bg-red-900/70"
                      onClick={() => remove(selectedMonth, 4, 'setA', color)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-neutral-500">
        * 1주차는 색상만, 2주차는 별도 설정입니다. 3주차·4주차는 각각 해당 주차 ABCD에만 적용됩니다.
      </p>
    </div>
  );
}
