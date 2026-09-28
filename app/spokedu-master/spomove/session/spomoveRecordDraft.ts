import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { resolveSpomovePublicDisplayTitle } from '../spomovePublicNaming';
import type { SpomoveCompletionReason } from './sessionResultModel';
import { movementDisplayLabel } from '../movements/movementLabels';
import type { MovementPick } from '../movements/movementTypes';

type SpomoveRecordDraftInput = {
  elapsedMs?: number | null;
  preset: OfficialSpomovePreset;
  completionReason: SpomoveCompletionReason;
  initialMovement?: MovementPick | null;
  finalMovement?: MovementPick | null;
  movementChangeCount?: number;
};

export const SPOMOVE_DRAFT_STORAGE_PREFIX = 'spokedu-master:spomove-draft:';
const MAX_INLINE_DRAFT_HREF_LENGTH = 1800;

function minutesFromElapsed(elapsedMs?: number | null) {
  if (!elapsedMs || elapsedMs <= 0) return 1;
  return Math.max(1, Math.round(elapsedMs / 60000));
}

function estimateCalories(minutes: number) {
  const min = Math.max(1, Math.round(minutes * 3));
  const max = Math.max(min + 1, Math.round(minutes * 6));
  return `${min}-${max}kcal`;
}

export function buildSpomoveRecordDraft({
  elapsedMs,
  preset,
  completionReason,
  initialMovement,
  finalMovement,
  movementChangeCount = 0,
}: SpomoveRecordDraftInput) {
  const minutes = minutesFromElapsed(elapsedMs);
  const completionLabel = {
    natural_complete: '완료',
    stopped_early: '중도 종료',
    cancelled: '취소',
    failed: '실행 실패',
  }[completionReason];
  return [
    `[SPOMOVE 활동 기록 초안] ${resolveSpomovePublicDisplayTitle(preset.id, preset.title)} ${completionLabel}`,
    `실제 움직인 시간: 약 ${minutes}분`,
    finalMovement
      ? `동작: ${
          initialMovement && movementChangeCount > 0
            ? `${movementDisplayLabel(initialMovement)} → ${movementDisplayLabel(finalMovement)} (${movementChangeCount}회 변경)`
            : movementDisplayLabel(finalMovement)
        }`
      : null,
    `예상 활동량: 가벼운-중간 강도의 전신 움직임, 예상 소모 열량 ${estimateCalories(minutes)}`,
    `활동 효과: ${preset.axisTitle}을 중심으로 반응, 방향 전환, 신체 조절, 집중 유지 경험을 제공합니다.`,
    `운영 의도: 짧은 시간 안에 아이들이 규칙을 듣고 움직임으로 반응하도록 만들어 수업 초반 몰입도와 활동 참여량을 높이기 위해 실시했습니다.`,
    '참고: 위 시간과 열량은 센서 기반 정밀 측정값이 아니라 수업 기록용 일반 추정치입니다.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function storeSpomoveRecordDraft(draft: string, storage: Pick<Storage, 'setItem'> = sessionStorage): string {
  const key = `${SPOMOVE_DRAFT_STORAGE_PREFIX}${Date.now()}`;
  storage.setItem(key, draft);
  return key;
}

export function readSpomoveRecordDraft(
  key: string | null | undefined,
  storage: Pick<Storage, 'getItem'> = sessionStorage,
): string | null {
  if (!key?.startsWith(SPOMOVE_DRAFT_STORAGE_PREFIX)) return null;
  return storage.getItem(key);
}

export function resolveSpomoveDraftFromQuery(
  searchParams: Pick<URLSearchParams, 'get'>,
  storage: Pick<Storage, 'getItem'> = sessionStorage,
): string | null {
  const inlineDraft = searchParams.get('spomoveDraft');
  if (inlineDraft) return inlineDraft;
  return readSpomoveRecordDraft(searchParams.get('spomoveDraftKey'), storage);
}

export function buildSpomoveRecordHref(programId: string, draft: string, storage?: Pick<Storage, 'setItem'>, runId?: string) {
  const inlineParams = new URLSearchParams({ program: programId, spomoveDraft: draft });
  if (runId) inlineParams.set('spomoveRunId', runId);
  const inlineHref = `/spokedu-master/activity?${inlineParams.toString()}`;
  if (inlineHref.length <= MAX_INLINE_DRAFT_HREF_LENGTH) {
    return inlineHref;
  }

  const draftKey = storeSpomoveRecordDraft(draft, storage ?? sessionStorage);
  const compactParams = new URLSearchParams({ program: programId, spomoveDraftKey: draftKey });
  if (runId) compactParams.set('spomoveRunId', runId);
  return `/spokedu-master/activity?${compactParams.toString()}`;
}
