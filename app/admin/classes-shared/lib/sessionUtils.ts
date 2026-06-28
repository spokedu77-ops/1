import { MileageAction, TeacherInput } from '../types';

const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

export const extractMileageAction = (memo: string, mileageOption?: string) => {
  if (mileageOption) return { cleanMemo: memo, mileageAction: mileageOption };
  if (!memo.includes('MILEAGE_ACTIONS:')) return { cleanMemo: memo, mileageAction: '' };

  const parts = memo.split('MILEAGE_ACTIONS:');
  return {
    cleanMemo: parts[0].trim(),
    mileageAction: parts[1]?.trim() || ''
  };
};

/**
 * `EXTRA_TEACHERS:` 직후부터 첫 번째 JSON 배열 `[...]`만 잘라 파싱합니다.
 * 뒤에 줄바꿈·MILEAGE 등 다른 필드가 붙어 있어도 동작합니다.
 */
function extractExtraTeachersJsonArray(afterMarker: string): TeacherInput[] {
  const t = afterMarker.trim();
  const start = t.indexOf('[');
  if (start < 0) return [];
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) {
          return safeJsonParse<TeacherInput[]>(t.slice(start, i + 1), []);
        }
      }
    }
  }
  return safeJsonParse<TeacherInput[]>(t.slice(start), []);
}

export const parseExtraTeachers = (memo: string) => {
  if (!memo.includes('EXTRA_TEACHERS:')) {
    return { cleanMemo: memo, extraTeachers: [] as TeacherInput[] };
  }
  const parts = memo.split('EXTRA_TEACHERS:');
  const cleanMemo = parts[0].trim();
  const extraTeachers = extractExtraTeachersJsonArray(parts[1] || '');
  return { cleanMemo, extraTeachers };
};

export const buildMemoWithExtras = (memo: string, extras: TeacherInput[]) => {
  if (extras.length === 0) return memo;
  return `${memo}\nEXTRA_TEACHERS:${JSON.stringify(extras)}`;
};

export const getMileageTotal = (actionStr: string, actions: MileageAction[]) => {
  const list = actionStr ? actionStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  return list.reduce((sum, label) => sum + (actions.find(d => d.label === label)?.val || 0), 0);
};

const SESSION_MILEAGE_REASON_RE = /^\[수업연동(?:\/보조)?\]\s*(원복|차감|조정):\s*(.+)$/;

/** 수업 연동 마일리지 로그 reason 파싱 */
export function parseSessionMileageReason(
  reason: string,
): { verb: '원복' | '차감' | '조정'; actionStr: string } | null {
  const match = reason?.match(SESSION_MILEAGE_REASON_RE);
  if (!match) return null;
  return {
    verb: match[1] as '원복' | '차감' | '조정',
    actionStr: (match[2] ?? '').trim(),
  };
}

/** 수업 연동 저장 시 mileage_logs.amount (표시·기록용) */
export function getSessionMileageLogAmount(
  diff: number,
  newTotal: number,
  reasonVerb: '원복' | '차감' | '조정',
): number {
  if (reasonVerb === '조정' && newTotal < 0) return newTotal;
  return diff;
}

/**
 * mileage_logs.amount → users.points 실제 반영량.
 * 조정 로그는 amount가 선택 차감(-2500)이고 포인트는 +2500 환급인 경우가 있다.
 */
export function getMileageLogPointDelta(
  log: { amount: number; reason: string },
  actions: MileageAction[],
): number {
  const parsed = parseSessionMileageReason(log.reason);
  if (!parsed) return log.amount;
  const { verb, actionStr } = parsed;
  if (!actionStr || actionStr === '해제') return log.amount;
  const selectionTotal = getMileageTotal(actionStr, actions);
  if (verb === '조정' && selectionTotal < 0 && log.amount < 0 && log.amount === selectionTotal) {
    return -log.amount;
  }
  return log.amount;
}

/** 마일리지 로그 UI·DB 표시용 금액 */
export function getMileageLogDisplayAmount(
  log: { amount: number; reason: string },
  actions: MileageAction[],
): number {
  const parsed = parseSessionMileageReason(log.reason);
  if (!parsed) return log.amount;
  const { verb, actionStr } = parsed;
  if (!actionStr || actionStr === '해제') return log.amount;
  const selectionTotal = getMileageTotal(actionStr, actions);
  if (verb === '조정' && selectionTotal < 0 && log.amount === selectionTotal) return log.amount;
  if ((verb === '원복' || verb === '조정') && selectionTotal < 0 && log.amount > 0) return selectionTotal;
  return log.amount;
}

export function cleanSessionMileageReason(reason: string): string {
  if (!reason) return '';
  return reason.replace(/\[수업연동(?:\/보조)?\]\s*(?:원복|차감|조정):\s*/, '').trim();
}

/** 운영진 수동·추가 지급 등 — 수업명 대신 사유를 크게 보여줄 session_title */
export const GENERIC_MILEAGE_SESSION_TITLES = new Set([
  '운영진 조치',
  '운영진 수동 조정',
  '직접 수정',
]);

export function isGenericMileageSessionTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? '';
  return !t || GENERIC_MILEAGE_SESSION_TITLES.has(t);
}

export function getMileageLogReasonLabel(reason: string | null | undefined): string {
  const raw = reason?.trim() ?? '';
  if (!raw) return '';
  return cleanSessionMileageReason(raw) || raw;
}

export function formatMileageLogDateKo(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  });
}

export type MileageLogDisplayText = {
  primary: string;
  secondary: string | null;
};

/** 마일리지 로그 목록 — 제목(크게) / 보조(날짜·항목) */
export function resolveMileageLogDisplayText(
  log: {
    session_title?: string | null;
    reason?: string | null;
    created_at: string;
    session_started_at?: string | null;
  },
  sessionTitleWithDate: string,
): MileageLogDisplayText {
  const reasonLabel = getMileageLogReasonLabel(log.reason);
  const dateStr = formatMileageLogDateKo(log.session_started_at ?? log.created_at);

  if (isGenericMileageSessionTitle(log.session_title)) {
    return {
      primary: reasonLabel || log.session_title?.trim() || dateStr,
      secondary: reasonLabel ? dateStr : null,
    };
  }

  return {
    primary: sessionTitleWithDate || reasonLabel || dateStr,
    secondary: reasonLabel || null,
  };
}
