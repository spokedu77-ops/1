'use client';

/**
 * 구독자 페이지용 주차별 스케줄·프로그램 조회
 * /api/schedule/[weekKey] 호출 → 챌린지 BPM/grid, Think snapshot 연동
 */

import { useQuery } from '@tanstack/react-query';

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
  }> | null;
  /** 챌린지(Play) BGM Storage 경로 - 관리자 선택 전역 BGM */
  challengeBgmPath?: string | null;
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

/** 챌린지(Play) phases[0]에서 bpm, level, grid 추출 */
export function getChallengePropsFromPhases(phases: SubscriberScheduleData['phases']) {
  const phase = Array.isArray(phases) ? phases.find((p) => p?.content_type === 'spokedu_rhythm') : null;
  if (!phase) return null;
  return {
    initialBpm: typeof phase.bpm === 'number' ? phase.bpm : undefined,
    initialLevel: typeof phase.level === 'number' ? phase.level : undefined,
    initialGrid: Array.isArray(phase.grid) ? phase.grid : undefined,
  };
}
