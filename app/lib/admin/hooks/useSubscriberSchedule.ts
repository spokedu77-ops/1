'use client';

/**
 * 구독자 페이지용 주차별 스케줄·프로그램 조회
 * /api/schedule/[weekKey] 호출 → 챌린지 BPM/grid, Think snapshot·Think 이미지 pack 연동
 */

import { useQuery } from '@tanstack/react-query';
import type { ThinkPackByMonthAndWeek } from '@/app/lib/admin/engines/think150/types';

export type SubscriberScheduleData = {
  program_snapshot: {
    think150?: boolean;
    week?: number;
    month?: number;
    audience?: string;
  } | null;
  is_published: boolean;
  phases: Array<{
    type?: string;
    content_type?: string;
    bpm?: number;
    level?: number;
    grid?: string[];
  }> | null;
  /** 무빙 챌린지(Play)용 - 주차별 challenge_${weekKey} 프로그램 phases (BPM/grid) */
  challengePhases: Array<{
    type?: string;
    content_type?: string;
    bpm?: number;
    level?: number;
    grid?: string[];
    gridsByLevel?: Record<number, string[]>;
  }> | null;
  /** 챌린지(Play) BGM Storage 경로 - 관리자 선택 전역 BGM */
  challengeBgmPath?: string | null;
  /** 챌린지 BGM 재생 시작 오프셋(ms). 음원 첫 비트에 화면 맞출 때 사용 */
  challengeBgmStartOffsetMs?: number;
  /** Think 150 월별×주차별 이미지 pack (구독자 Think 단계 이미지 노출) */
  thinkPackByMonthAndWeek?: ThinkPackByMonthAndWeek | null;
};

async function fetchSchedule(weekKey: string): Promise<SubscriberScheduleData> {
  const res = await fetch(`/api/schedule/${encodeURIComponent(weekKey)}`);
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export function useSubscriberSchedule(weekKey: string, enabled = true) {
  return useQuery({
    queryKey: ['subscriber-schedule', weekKey],
    queryFn: () => fetchSchedule(weekKey),
    enabled: enabled && !!weekKey,
    staleTime: 2 * 60 * 1000,
  });
}

/** 챌린지(Play) phases[0]에서 bpm, level, grid, gridsByLevel 추출 */
export function getChallengePropsFromPhases(phases: SubscriberScheduleData['phases']) {
  const phase = Array.isArray(phases) ? phases.find((p) => p?.content_type === 'spokedu_rhythm') : null;
  if (!phase) return null;
  const rawByLevel = (phase as { gridsByLevel?: Record<number, string[]> }).gridsByLevel;
  const initialLevelData =
    rawByLevel && typeof rawByLevel === 'object'
      ? {
          1: Array.isArray(rawByLevel[1]) ? rawByLevel[1].slice(0, 8) : [],
          2: Array.isArray(rawByLevel[2]) ? rawByLevel[2].slice(0, 8) : [],
          3: Array.isArray(rawByLevel[3]) ? rawByLevel[3].slice(0, 8) : [],
          4: Array.isArray(rawByLevel[4]) ? rawByLevel[4].slice(0, 8) : [],
        }
      : undefined;
  return {
    initialBpm: typeof phase.bpm === 'number' ? phase.bpm : undefined,
    initialLevel: 1 as number,
    initialGrid: Array.isArray(phase.grid) ? phase.grid : undefined,
    initialLevelData,
  };
}
