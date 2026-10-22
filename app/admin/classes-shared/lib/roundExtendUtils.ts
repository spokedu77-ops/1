import { toast } from 'sonner';

import { omitSessionIdentityForInsertClone } from './sessionInsertClone';
import { resolvePlannedTotal, resolvePlannedTotalAfterExtend } from './plannedRoundTotal';
import { formatRoundDisplay } from './roundFields';
import { reindexGroupRounds } from './reindexGroupRounds';
import { buildExtendedStartIsos } from './sessionIntervalPattern';
import { parseExtraTeachers } from './sessionUtils';

const SEOUL_TIME_ZONE = 'Asia/Seoul';
const WEEKDAY_BY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type TemplateSession = Record<string, any> & {
  start_at: string;
  end_at: string;
  status?: string | null;
  created_by?: string | null;
  price?: number | null;
  memo?: string | null;
};

export type SeoulWeekdayTemplate = {
  weekday: number;
  hour: number;
  minute: number;
  durationMs: number;
  createdBy: string;
  price: number;
  source: TemplateSession;
};

function seoulDateParts(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_SESSION_START_AT');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const weekday = WEEKDAY_BY_SHORT[valueOf('weekday') ?? ''];
  const year = Number(valueOf('year'));
  const month = Number(valueOf('month'));
  const day = Number(valueOf('day'));
  const hour = Number(valueOf('hour'));
  const minute = Number(valueOf('minute'));
  if ([weekday, year, month, day, hour, minute].some((part) => !Number.isFinite(part))) {
    throw new Error('INVALID_SESSION_START_AT');
  }
  return { weekday, year, month, day, hour, minute };
}

function seoulDateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekdayOfDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

function startIsoForSeoulDate(dateKey: string, template: SeoulWeekdayTemplate) {
  const hh = String(template.hour).padStart(2, '0');
  const mm = String(template.minute).padStart(2, '0');
  return new Date(`${dateKey}T${hh}:${mm}:00+09:00`).toISOString();
}

export function resolveLatestSeoulWeekdayTemplates(sessions: TemplateSession[]) {
  const active = sessions
    .filter((session) => !['postponed', 'cancelled', 'deleted'].includes(String(session.status ?? '')))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  if (active.length === 0) throw new Error('ACTIVE_SESSION_TEMPLATE_NOT_FOUND');

  const latestByWeekday = new Map<number, SeoulWeekdayTemplate>();
  for (const session of active) {
    const startMs = new Date(session.start_at).getTime();
    const endMs = new Date(session.end_at).getTime();
    const durationMs = endMs - startMs;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || durationMs <= 0) {
      throw new Error('INVALID_SESSION_DURATION');
    }
    const createdBy = String(session.created_by ?? '').trim();
    const parts = seoulDateParts(session.start_at);
    latestByWeekday.set(parts.weekday, {
      weekday: parts.weekday,
      hour: parts.hour,
      minute: parts.minute,
      durationMs,
      createdBy,
      price: Number(session.price ?? 0),
      source: session,
    });
  }

  const templates = [...latestByWeekday.values()].sort((a, b) => a.weekday - b.weekday);
  if (templates.length === 2 && templates.some(
    (template) => !template.createdBy
      || template.source.price == null
      || !Number.isFinite(Number(template.source.price)),
  )) {
    throw new Error('INVALID_WEEKDAY_TEMPLATE');
  }
  return {
    kind: templates.length === 1 ? 'single' as const : templates.length === 2 ? 'two' as const : 'irregular' as const,
    templates,
  };
}

export function assertWeekdayTemplateCloneSafe(template: SeoulWeekdayTemplate) {
  const memo = String(template.source.memo ?? '');
  if (memo.includes('MILEAGE_ACTIONS:')) throw new Error('LEGACY_MILEAGE_MEMO_REQUIRES_REVIEW');
  const overlapsMain = parseExtraTeachers(memo).extraTeachers.some(
    (teacher) => String(teacher.id ?? '') === template.createdBy,
  );
  if (overlapsMain) throw new Error('MAIN_ASSIST_TEACHER_CONFLICT');
}

export function buildSeoulTwoWeekdayStartsFromDate(
  startDate: string,
  templates: SeoulWeekdayTemplate[],
  count: number,
) {
  if (templates.length !== 2) throw new Error('TWO_WEEKDAY_TEMPLATES_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(`${startDate}T00:00:00+09:00`))) {
    throw new Error('INVALID_RESTART_START_DATE');
  }
  if (!Number.isFinite(count) || count < 0) throw new Error('INVALID_SESSION_COUNT');
  const byWeekday = new Map(templates.map((template) => [template.weekday, template]));
  if (byWeekday.size !== 2 || [...byWeekday.keys()].some((weekday) => weekday < 0 || weekday > 6)) {
    throw new Error('INVALID_WEEKDAY_TEMPLATES');
  }
  const starts: Array<{ startAt: string; endAt: string; template: SeoulWeekdayTemplate }> = [];
  for (let offset = 0; starts.length < Math.max(0, Math.floor(count)); offset++) {
    const dateKey = addCalendarDays(startDate, offset);
    const template = byWeekday.get(weekdayOfDateKey(dateKey));
    if (!template) continue;
    const startAt = startIsoForSeoulDate(dateKey, template);
    starts.push({
      startAt,
      endAt: new Date(new Date(startAt).getTime() + template.durationMs).toISOString(),
      template,
    });
  }
  return starts;
}

export function buildSeoulTwoWeekdayStartsAfter(
  afterIso: string,
  templates: SeoulWeekdayTemplate[],
  count: number,
) {
  const afterMs = new Date(afterIso).getTime();
  if (!Number.isFinite(afterMs)) throw new Error('INVALID_EXTENSION_CURSOR');
  const startDate = seoulDateKey(seoulDateParts(afterIso));
  return buildSeoulTwoWeekdayStartsFromDate(startDate, templates, count + 2)
    .filter((candidate) => new Date(candidate.startAt).getTime() > afterMs)
    .slice(0, Math.max(0, Math.floor(count)));
}

export function formatWeekdayTemplateSummary(
  templates: SeoulWeekdayTemplate[],
  teacherNames: Record<string, string> = {},
) {
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  return templates.map((template) => {
    const time = `${String(template.hour).padStart(2, '0')}:${String(template.minute).padStart(2, '0')}`;
    const teacher = teacherNames[template.createdBy] || template.createdBy;
    return `${labels[template.weekday]}요일 · ${teacher} · ${time} · ${template.price.toLocaleString('ko-KR')}원 · ${template.durationMs / 60000}분`;
  }).join('\n');
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    if (typeof e.message === 'string' && e.message.trim()) return e.message;

    const parts: string[] = [];
    if (typeof e.code === 'string' && e.code.trim()) parts.push(`[${e.code}]`);
    if (typeof e.details === 'string' && e.details.trim()) parts.push(e.details);
    if (typeof e.hint === 'string' && e.hint.trim()) parts.push(`hint: ${e.hint}`);
    if (parts.length > 0) return parts.join(' ');

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// 그룹 수업 회차 확장 유틸
export async function extendClass(
  supabase: any,
  groupId: string,
  addCount: number,
  options?: { onAfter?: () => void; teacherNames?: Record<string, string> }
) {
  if (!groupId || addCount <= 0) return;

  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('start_at', { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      toast.error('해당 그룹의 세션이 없습니다.');
      return;
    }

    const activeSessions = (sessions as any[]).filter(
      (s) => !['postponed', 'cancelled', 'deleted'].includes(String(s.status ?? ''))
    );
    if (activeSessions.length === 0) {
      toast.error('활성 회차를 찾지 못했습니다.');
      return;
    }

    const last = activeSessions[activeSessions.length - 1];
    const first = activeSessions[0];
    const second = activeSessions[1];

    // 매주 하루: 첫 간격(기본 7일). 주 2회는 buildExtendedStartIsos가 요일 패턴을 씀.
    let dayInterval = 7;
    if (second) {
      const firstStart = new Date(first.start_at).getTime();
      const secondStart = new Date(second.start_at).getTime();
      const diffDays = Math.round((secondStart - firstStart) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) dayInterval = diffDays;
    }
    const fallbackGapMs = dayInterval * 24 * 60 * 60 * 1000;
    const pattern = resolveLatestSeoulWeekdayTemplates(activeSessions);
    if (pattern.kind === 'irregular') {
      throw new Error('불규칙한 3개 이상 요일 패턴은 자동 확장할 수 없습니다.');
    }
    const weekdayStarts = pattern.kind === 'two'
      ? buildSeoulTwoWeekdayStartsAfter(last.start_at, pattern.templates, addCount)
      : null;
    const startIsos = weekdayStarts?.map((candidate) => candidate.startAt) ?? buildExtendedStartIsos(
      last.start_at,
      activeSessions.map((s: { start_at: string }) => String(s.start_at)),
      addCount,
      fallbackGapMs
    );

    if (pattern.kind === 'two') {
      pattern.templates.forEach(assertWeekdayTemplateCloneSafe);
      if (!confirm(`요일별 최근 회차 기준으로 ${addCount}회 확장할까요?\n\n${formatWeekdayTemplateSummary(pattern.templates, options?.teacherNames)}`)) {
        return;
      }
    }

    const newTotal = resolvePlannedTotalAfterExtend(sessions, addCount);
    const planned = resolvePlannedTotal(sessions);
    const baseDuration =
      (new Date(last.end_at).getTime() - new Date(last.start_at).getTime()) / (1000 * 60);

    const newSessions = [];
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      start_at: _startAt,
      end_at: _endAt,
      status: _status,
      round_index: _roundIndex,
      round_total: _roundTotal,
      round_display: _roundDisplay,
      // 마지막 회차의 short_code를 그대로 넣으면 신규 행끼리·기존 행과 유니크 충돌 (idx_sessions_short_code_unique)
      short_code: _shortCode,
      ...insertBase
    } = last;
    void _id;
    void _createdAt;
    void _updatedAt;
    void _startAt;
    void _endAt;
    void _status;
    void _roundIndex;
    void _roundTotal;
    void _roundDisplay;
    void _shortCode;

    const insertBaseSafe = omitSessionIdentityForInsertClone(insertBase as Record<string, unknown>);

    for (let i = 1; i <= addCount; i++) {
      const weekdayStart = weekdayStarts?.[i - 1];
      const template = weekdayStart?.template;
      const start = new Date(weekdayStart?.startAt ?? startIsos[i - 1]!);
      const end = weekdayStart ? new Date(weekdayStart.endAt) : new Date(start);
      if (!weekdayStart) end.setMinutes(end.getMinutes() + baseDuration);

      const roundIndex = planned + i;
      const roundDisplay = formatRoundDisplay(roundIndex, newTotal);

      newSessions.push({
        ...(template
          ? omitSessionIdentityForInsertClone(template.source as Record<string, unknown>)
          : insertBaseSafe),
        // 다음 회차(opened) 생성 시 이전 회차의 피드백이 그대로 이어붙지 않도록 초기화합니다.
        // (students_text / feedback_fields / 첨부파일이 복사되면 teacher 화면에서 "계속 복사된 것처럼" 보입니다.)
        students_text: null,
        feedback_fields: {},
        photo_url: [],
        file_url: [],
        mileage_option: null,
        ...(template ? { created_by: template.createdBy, price: template.price } : {}),
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: 'opened',
        round_index: roundIndex,
        round_total: newTotal,
        round_display: roundDisplay,
      });
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from('sessions')
      .insert(newSessions)
      .select('id');

    if (insertError) throw insertError;
    if (!Array.isArray(insertedRows) || insertedRows.length !== newSessions.length) {
      throw new Error('EXTEND_SESSIONS_NOT_CREATED');
    }

    const { data: allAfter, error: afterErr } = await supabase
      .from('sessions')
      .select('id, start_at, status, round_total, round_index')
      .eq('group_id', groupId)
      .order('start_at', { ascending: true });
    if (afterErr) throw afterErr;
    await reindexGroupRounds(supabase, (allAfter || []) as Parameters<typeof reindexGroupRounds>[1]);

    toast.success('회차가 성공적으로 확장되었습니다.');
    options?.onAfter?.();
  } catch (error: unknown) {
    toast.error('회차 확장에 실패했습니다: ' + formatErrorMessage(error));
  }
}
