'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

/**
 * Admin - IIWarmup - Flow Studio
 * Think / Challenge와 동일한 grid 레이아웃: 사이드바(설정·안내) + 메인(미리보기)
 * BGM·배경은 Asset Hub → Flow 탭에서 월별 설정.
 */

export default function AdminFlowPage() {
  const [previewMonth, setPreviewMonth] = useState(() => new Date().getMonth() + 1);
  const iframeSrc = `/program/iiwarmup/flow?admin=true&showLevelSelector=1&month=${previewMonth}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Flow Studio</h2>
          <p className="mt-1 text-sm text-neutral-400">
            3D Flow Phase 미리보기 · BGM·배경은 Asset Hub에서 월별 설정
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-400">미리보기 월</label>
            <select
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
              value={previewMonth}
              onChange={(e) => setPreviewMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              구독자 Flow는 해당 주의 월에 맞는 테마가 적용됩니다.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-300">
            <p className="font-medium text-neutral-200">BGM · 배경(파노라마)</p>
            <p className="mt-1 text-xs text-neutral-500">
              Asset Hub → Flow 탭에서 월별 BGM·파노라마를 설정하세요.
            </p>
          </div>

          <Link
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            <ExternalLink size={16} />
            새 창에서 미리보기
          </Link>
        </aside>

        <main className="min-h-0 flex flex-col">
          <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950">
            <iframe
              src={iframeSrc}
              title="Flow Phase 미리보기"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
