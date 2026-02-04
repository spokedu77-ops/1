'use client';

import { useMemo, useState } from 'react';
import { Think150Player } from '@/app/components/admin/think150/Think150Player';
import { MOCK_THINK_PACK } from '@/app/lib/admin/engines/think150/mockThinkPack';
import { useThink150Pack } from '@/app/lib/admin/hooks/useThink150Pack';
import { useThinkBGM } from '@/app/lib/admin/hooks/useThinkBGM';
import type { Audience } from '@/app/lib/admin/constants/thinkTiming';

export default function ThinkStudioPage() {
  const [audience, setAudience] = useState<Audience>('elementary');
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(1);
  const [seed, setSeed] = useState(() => Date.now());
  const [debug, setDebug] = useState(true);
  const { thinkPackByMonthAndWeek } = useThink150Pack();
  const { selected: bgmPath } = useThinkBGM();
  const [previewMonth, setPreviewMonth] = useState(new Date().getMonth() + 1);

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
      <div>
        <h2 className="text-lg font-extrabold">Think Studio</h2>
        <p className="mt-1 text-sm text-neutral-400">
          150초 SPOKEDU Think 프로그램 제작·미리보기
        </p>
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
