'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildThink150Timeline,
  preloadThinkPack,
  preloadThinkPackByMonth,
  type Think150Config,
} from '@/app/lib/admin/engines/think150';
import { MOCK_THINK_PACK } from '@/app/lib/admin/engines/think150/mockThinkPack';
import { useThinkBGM } from '@/app/lib/admin/hooks/useThinkBGM';
import { useThink150Playback } from '@/app/lib/admin/hooks/useThink150Playback';
import { Think150Viewer } from '@/app/components/admin/think150/Think150Viewer';
import { Think150ProgressBar } from '@/app/components/admin/think150/Think150ProgressBar';
import { parseWeekKey } from '@/app/lib/admin/scheduler/dragAndDrop';
import type { ThinkPackByMonthAndWeek } from '@/app/lib/admin/engines/think150/types';

export interface ThinkPhaseWrapperProps {
  weekKey: string;
  onEnd: () => void;
  /** 스케줄러에서 퍼블리시된 Think 설정 (week, month, audience) */
  scheduleSnapshot?: { think150?: boolean; week?: number; month?: number; audience?: string } | null;
  /** API에서 내려준 월별×주차별 Think 이미지 pack (구독자 이미지 노출용) */
  thinkPackByMonthAndWeek?: ThinkPackByMonthAndWeek | null;
  /** API에서 내려준 이번 주 Think 확정 설정 (있으면 우선 사용) */
  thinkResolvedConfig?: {
    week: number;
    month: number;
    audience: string;
    seedPolicy: string;
    bgmPath: string | null;
  } | null;
  /** API에서 내려준 이번 주 Think pack만 (있으면 thinkPackByMonthAndWeek 대신 사용) */
  thinkPackForThisWeek?: { setA: Record<string, string>; setB: Record<string, string> } | null;
  /** 현재 월 (1–12). weekKey 파싱값 또는 선택 월 */
  month?: number;
  /** true면 프로그레스 바 숨김 (구독자 화면에서 진행률 불일치 시 사용) */
  hideProgressBar?: boolean;
}

export function ThinkPhaseWrapper({
  weekKey,
  onEnd,
  scheduleSnapshot,
  thinkPackByMonthAndWeek,
  thinkResolvedConfig,
  thinkPackForThisWeek,
  month: monthProp,
  hideProgressBar = false,
}: ThinkPhaseWrapperProps) {
  const parsed = parseWeekKey(weekKey);
  const rawWeek = parsed?.week ?? 1;
  const weekFromKey = (rawWeek >= 1 && rawWeek <= 4 ? rawWeek : rawWeek === 5 ? 4 : 1) as 1 | 2 | 3 | 4;
  const week = (thinkResolvedConfig?.week ?? scheduleSnapshot?.week ?? weekFromKey) as 1 | 2 | 3 | 4;
  const audience = (thinkResolvedConfig?.audience ?? scheduleSnapshot?.audience ?? '700ms') as Think150Config['audience'];
  const month = thinkResolvedConfig?.month ?? scheduleSnapshot?.month ?? monthProp ?? parsed?.month;
  const { selected: bgmPathFromHook } = useThinkBGM();
  const bgmPath = (thinkResolvedConfig?.bgmPath != null && thinkResolvedConfig.bgmPath !== ''
    ? thinkResolvedConfig.bgmPath
    : bgmPathFromHook) || undefined;
  const [seed] = useState(() => Date.now());

  const packSource = thinkPackForThisWeek ?? (thinkPackByMonthAndWeek ? undefined : MOCK_THINK_PACK);
  const config = useMemo<Think150Config>(
    () => ({
      audience,
      week,
      ...(month != null && { month }),
      seed,
      thinkPack: packSource ?? (thinkPackByMonthAndWeek ? undefined : MOCK_THINK_PACK),
      thinkPackByMonthAndWeek: thinkPackForThisWeek ? undefined : (thinkPackByMonthAndWeek ?? undefined),
      bgmPath: bgmPath || undefined,
    }),
    [audience, week, month, thinkPackForThisWeek, thinkPackByMonthAndWeek, packSource, bgmPath, seed]
  );

  const timeline = useMemo(() => buildThink150Timeline(config), [config]);

  const { currentMs, event, setPlaying, totalMs: TOTAL_MS } = useThink150Playback(
    timeline,
    config,
    { onEnd, initialPlaying: true }
  );
  const remainingSeconds = Math.max(0, Math.ceil((TOTAL_MS - currentMs) / 1000));

  const [started] = useState(true);
  void started;

  useEffect(() => {
    if (config.thinkPackByMonthAndWeek && config.month != null) {
      preloadThinkPackByMonth(config.thinkPackByMonthAndWeek, config.month).catch(console.warn);
    } else if (config.thinkPack) {
      preloadThinkPack(config.thinkPack).catch(console.warn);
    }
  }, [config.thinkPack, config.thinkPackByMonthAndWeek, config.month]);

  const handleStart = useCallback(() => {
    setPlaying((p) => !p);
  }, [setPlaying]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {!hideProgressBar && (
        <div className="z-10 shrink-0 border-b border-neutral-800 bg-black/80 px-4 py-3 backdrop-blur-sm">
          <Think150ProgressBar currentMs={currentMs} totalMs={TOTAL_MS} />
        </div>
      )}
      <div
        className="flex min-h-0 flex-1 flex-col"
        onClick={handleStart}
        onKeyDown={(e) => e.key === ' ' && handleStart()}
        role="button"
        tabIndex={0}
      >
        <Think150Viewer event={started ? event : null} fullscreen remainingSeconds={remainingSeconds} />
      </div>
    </div>
  );
}
