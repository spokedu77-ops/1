'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Think150Player } from '@/app/components/admin/think150/Think150Player';
import { MOCK_THINK_PACK } from '@/app/lib/admin/engines/think150/mockThinkPack';
import { useThink150Pack } from '@/app/lib/admin/hooks/useThink150Pack';
import { useThinkBGM } from '@/app/lib/admin/hooks/useThinkBGM';
import { useCreateThink150Programs, useUpsertThink150Program } from '@/app/lib/admin/hooks/useCreateThink150Programs';
import type { Audience } from '@/app/lib/admin/constants/thinkTiming';

export default function ThinkStudioPage() {
  const [audience, setAudience] = useState<Audience>('elementary');
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(1);
  const [seed, setSeed] = useState(() => Date.now());
  const [debug, setDebug] = useState(true);
  const { thinkPackByMonthAndWeek } = useThink150Pack();
  const { selected: bgmPath } = useThinkBGM();
  const [previewMonth, setPreviewMonth] = useState(new Date().getMonth() + 1);
  const createThink150 = useCreateThink150Programs();
  const upsertThink150 = useUpsertThink150Program();

  const config = useMemo(
    () => ({
      audience,
      week,
      month: previewMonth,
      seed,
      thinkPackByMonthAndWeek: thinkPackByMonthAndWeek ?? undefined,
      thinkPack: thinkPackByMonthAndWeek ? undefined : MOCK_THINK_PACK,
      bgmPath: bgmPath || undefined,
    }),
    [audience, week, previewMonth, seed, thinkPackByMonthAndWeek, bgmPath]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Think Studio</h2>
          <p className="mt-1 text-sm text-neutral-400">
            150초 SPOKEDU Think 프로그램 제작·미리보기
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-neutral-500">
            스케줄러에 배정하려면 먼저 기본 프로그램 4개를 생성하세요.
          </p>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
            onClick={() => createThink150.mutate()}
            disabled={createThink150.isPending}
          >
            {createThink150.isPending ? '생성 중...' : 'Think 150 기본 생성'}
          </button>
          {createThink150.isError && (
            <span className="ml-2 text-sm text-red-400">
              {(createThink150.error as Error).message}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">audience</label>
            <select
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
            >
              <option value="preschool">preschool (900/900)</option>
              <option value="senior">senior (900/900)</option>
              <option value="elementary">elementary (700/700)</option>
              <option value="teen">teen (700/700)</option>
              <option value="adult">adult (550/550)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">month (미리보기)</label>
            <select
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm"
              value={previewMonth}
              onChange={(e) => setPreviewMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">week</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    week === w ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                  onClick={() => setWeek(w)}
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
              onClick={() =>
                upsertThink150.mutate(
                  { week, audience, month: previewMonth },
                  {
                    onSuccess: () => toast.success(`${week}주차 저장되었습니다. 스케줄러에서 배정할 수 있습니다.`),
                    onError: (err: Error) => toast.error(`저장 실패: ${err?.message ?? '알 수 없는 오류'}`),
                  }
                )
              }
              disabled={upsertThink150.isPending}
            >
              {upsertThink150.isPending ? '저장 중...' : `${week}주차 저장`}
            </button>
            {upsertThink150.isError && (
              <p className="mt-1 text-xs text-red-400">{(upsertThink150.error as Error).message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">seed</label>
            <input
              type="number"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 font-mono text-sm"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || Date.now())}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-neutral-700 py-1.5 text-xs hover:bg-neutral-600"
              onClick={() => setSeed(Date.now())}
            >
              새 seed
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
            />
            <span className="text-sm text-neutral-400">디버그 오버레이</span>
          </label>
        </aside>

        <main>
          <Think150Player config={config} debug={debug} />
        </main>
      </div>
    </div>
  );
}
