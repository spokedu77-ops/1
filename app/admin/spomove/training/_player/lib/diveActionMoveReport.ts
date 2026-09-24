import { isDiveActionMoveUnityTheme } from '@/app/lib/spomove/diveThemes';

import { formatElapsedSeconds } from './trainingResultSummary';

/** DIVE 액션무브 리포트에 올릴 수 있는 동작. 센서 성적과는 무관하다. */
export type DiveActionMoveId = 'SIDE' | 'JUMP' | 'DUCK' | 'BONUS';

export type DiveActionMoveSession = {
  completed: boolean;
  /** 스테이지당 초. 세션에 값이 없으면 null. */
  stageDurationSec: number | null;
  environmentTheme?: string | null;
  sportsArenaFeatures?: readonly ('side' | 'jump' | 'duck')[];
  flowFeatures?: readonly string[];
  flowIncludeBonus?: boolean;
  flowLayout?: 'sequential' | 'random';
};

export type DiveActionMoveSnapshotItem = {
  id: string;
  label: string;
  value: string;
  /** 숫자+단위처럼 줄 안에서 쪼개지면 안 되는 값 */
  nowrap: boolean;
};

export type DiveActionMoveReportView = {
  title: string;
  subtitle: string;
  actionLine: string | null;
  stageLine: string | null;
  statusBadge: string;
  activityTimeValue: string;
  stageTimeValue: string;
  sessionStatusValue: string;
  movementBody: string;
  tags: string[];
  snapshot: DiveActionMoveSnapshotItem[];
  selfChecks: { id: string; label: string }[];
};

const ACTION_ORDER: DiveActionMoveId[] = ['SIDE', 'JUMP', 'DUCK', 'BONUS'];

const MOVEMENT_LABEL: Record<'SIDE' | 'JUMP' | 'DUCK', string> = {
  SIDE: '방향 전환',
  JUMP: '점프',
  DUCK: '숙이기',
};

function hasBatchim(text: string): boolean {
  const last = text.charCodeAt(text.length - 1);
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
}

function joinMotions(motions: string[]): string {
  if (motions.length <= 1) return motions[0] ?? '';
  const particle = hasBatchim(motions[0]!) ? '과' : '와';
  if (motions.length === 2) return `${motions[0]}${particle} ${motions[1]}`;
  return `${motions[0]}${particle} ${motions[1]}, ${motions[2]}`;
}

/**
 * 실제로 스테이지에 올라간 동작만 고른다.
 * SPORTS ARENA는 선택한 side/jump/duck과 보너스 스위치.
 * 그 외 액션무브는 엔진 스테이지(기본 점프, duck 모듈, sequential BONUS)를 따른다.
 */
export function resolveDiveActionMoveIds(session: DiveActionMoveSession): DiveActionMoveId[] {
  const selected = new Set<DiveActionMoveId>();

  if (isDiveActionMoveUnityTheme(session.environmentTheme)) {
    const features = new Set(session.sportsArenaFeatures ?? []);
    if (features.has('side')) selected.add('SIDE');
    if (features.has('jump')) selected.add('JUMP');
    if (features.has('duck')) selected.add('DUCK');
    if (session.flowIncludeBonus) selected.add('BONUS');
    return ACTION_ORDER.filter((id) => selected.has(id));
  }

  const features = new Set(session.flowFeatures ?? []);
  const obstacleKeys = ['punch', 'kick', 'duck', 'reach', 'faster'].filter((key) => features.has(key));
  const colorGateOnly = features.has('colorGate') && obstacleKeys.length === 0;
  if (!colorGateOnly) selected.add('JUMP');
  if (features.has('duck')) selected.add('DUCK');

  const obstacleCount = obstacleKeys.length;
  const includeBonus = session.flowIncludeBonus !== false;
  if (session.flowLayout !== 'random' && obstacleCount >= 2 && includeBonus) {
    selected.add('BONUS');
  }

  return ACTION_ORDER.filter((id) => selected.has(id));
}

function movementBody(ids: DiveActionMoveId[]): string {
  const motions = (['SIDE', 'JUMP', 'DUCK'] as const)
    .filter((id) => ids.includes(id))
    .map((id) => MOVEMENT_LABEL[id]);

  if (motions.length === 0) {
    return '화면의 신호를 보며 연속해서 움직였어요.';
  }
  if (motions.length === 3) {
    return '화면의 신호를 보며 방향 전환과 점프, 숙이기 동작을 연속해서 수행했어요.';
  }
  return `화면의 신호를 보며 ${joinMotions(motions)} 동작을 연속해서 수행했어요.`;
}

function stageSeconds(stageDurationSec: number | null): number | null {
  if (stageDurationSec == null || !Number.isFinite(stageDurationSec) || stageDurationSec <= 0) return null;
  return Math.round(stageDurationSec);
}

export function buildDiveActionMoveReport(
  session: DiveActionMoveSession,
  elapsedMs: number,
): DiveActionMoveReportView {
  const actions = resolveDiveActionMoveIds(session);
  const stageSec = stageSeconds(session.stageDurationSec);
  const stageValue = stageSec == null ? '—' : `${stageSec}초`;
  const stageLine = stageSec == null ? null : `스테이지 ${stageSec}초`;
  const elapsedLabel = formatElapsedSeconds(elapsedMs);
  const actionLine = actions.length > 0 ? actions.join(' · ') : null;
  const completed = session.completed;
  const tags = (['SIDE', 'JUMP', 'DUCK'] as const)
    .filter((id) => actions.includes(id))
    .map((id) => MOVEMENT_LABEL[id]);

  return {
    title: completed ? 'DIVE 활동 완료' : '수업을 종료했습니다',
    subtitle: completed
      ? '오늘 액션무브를 끝까지 완료했어요.'
      : '액션무브 세션을 마쳤어요.',
    actionLine,
    stageLine,
    statusBadge: completed ? '활동 완료' : '중도 종료',
    activityTimeValue: elapsedLabel,
    stageTimeValue: stageValue,
    sessionStatusValue: completed ? '활동 완료' : '중도 종료',
    movementBody: movementBody(actions),
    tags,
    snapshot: [
      { id: 'program', label: '프로그램', value: 'DIVE 액션무브', nowrap: true },
      { id: 'actions', label: '액션 구성', value: actionLine ?? '—', nowrap: false },
      { id: 'stage', label: '스테이지 시간', value: stageValue, nowrap: true },
      { id: 'elapsed', label: '전체 활동 시간', value: elapsedLabel, nowrap: true },
      { id: 'point', label: '활동 포인트', value: '시각 신호에 맞춰 전신 움직임을 전환하기', nowrap: false },
    ],
    selfChecks: [
      { id: 'follow', label: '화면의 신호를 끝까지 따라갔나요?' },
      { id: 'direction', label: '방향이 바뀔 때 빠르게 이동했나요?' },
      { id: 'move', label: '점프와 숙이기 동작을 크게 해봤나요?' },
      { id: 'preview', label: '다음 신호를 미리 보며 움직였나요?' },
    ],
  };
}
