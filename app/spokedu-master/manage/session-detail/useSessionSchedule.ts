'use client';

import { useEffect, useState } from 'react';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { buildScheduleOccurrencePreview, occurrenceOverlaps, type MasterScheduleCadence, type MasterScheduleRule } from '../../lib/recurringSchedule';
import { seoulDateTimeInputToIso } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { MasterSessionDto, MasterSessionProgramDto, SaveSessionInput } from '../../types/operational';

export type RepeatMode = 'none' | MasterScheduleCadence;
export const REPEAT_LABEL: Record<RepeatMode, string> = { none: '없음', weekly: '매주', biweekly: '격주' };
type OperationalData = ReturnType<typeof useOperationalData>;

export function useSessionSchedule({
  initialSession,
  classId,
  startAt,
  endAt,
  programs,
  data,
  input,
  setSaving,
  setDirty,
  setError,
}: {
  initialSession: MasterSessionDto | null;
  classId: string;
  startAt: string;
  endAt: string;
  programs: MasterSessionProgramDto[];
  data: OperationalData;
  input: (programs: MasterSessionProgramDto[], nextStatus?: MasterSessionDto['status']) => SaveSessionInput;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setError: (error: string | null) => void;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(!initialSession);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('none');
  const [rules, setRules] = useState<MasterScheduleRule[]>([]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : { data: [] })
      .then((json) => { if (!cancelled) setRules(json.data ?? []); })
      .catch(() => { if (!cancelled) setRules([]); });
    return () => { cancelled = true; };
  }, [classId]);

  const setRepeatMode = (mode: RepeatMode) => { setRepeatModeState(mode); setDirty(true); };

  async function createRecurringSession() {
    const startDay = startAt.slice(0, 10);
    const startTime = startAt.slice(11, 16);
    const durationMinutes = Math.max(15, Math.round((new Date(seoulDateTimeInputToIso(endAt)).getTime() - new Date(seoulDateTimeInputToIso(startAt)).getTime()) / 60_000));
    const weekday = new Date(`${startDay}T12:00:00+09:00`).getDay();
    const occurrences = buildScheduleOccurrencePreview({ cadence: repeatMode as MasterScheduleCadence, weekday, startTime, startsOn: startDay, count: 4, durationMinutes });
    const conflicts = occurrences.filter((item) => occurrenceOverlaps(item.startAt, item.endAt, data.sessions.filter((candidate) => candidate.classId === classId)));
    if (conflicts.length && !window.confirm(`${conflicts.length}개 회차는 기존 일정과 겹쳐 생성되지 않습니다. 계속할까요?`)) return;
    const availableOccurrences = occurrences.filter((item) => !conflicts.includes(item));
    if (!availableOccurrences.length) throw new Error('생성할 수 있는 반복 일정이 없습니다.');
    const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cadence: repeatMode, weekday, startTime, durationMinutes, startsOn: startDay, occurrences: availableOccurrences }) });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || '반복 일정을 만들지 못했습니다.');
    const first = (json.data?.occurrences ?? []).find((item: { created?: boolean }) => item.created) ?? json.data?.occurrences?.[0];
    const firstSessionId = first?.session_id ?? first?.sessionId;
    if (firstSessionId) {
      const saved = await data.saveSession({ ...input(programs, 'scheduled'), programs: undefined }, firstSessionId);
      for (const program of programs) {
        if (program.sourceType === 'spomove' && program.spomovePresetId) await data.addSessionSpomove(saved.id, program.spomovePresetId);
        if (program.sourceType === 'program' && program.programId != null) await data.addSessionProgram(saved.id, program.programId);
      }
    }
    await data.reload('soft');
  }

  async function endRule(ruleId: string) {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/spokedu-master/classes/${classId}/schedule-rules/${ruleId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false }) });
      if (!response.ok) throw new Error('반복 일정을 종료하지 못했습니다.');
      setRules((current) => current.map((rule) => rule.id === ruleId ? { ...rule, active: false } : rule));
    } catch (caught) { setError(getMasterRequestErrorMessage(caught) || '반복 일정을 종료하지 못했습니다.'); }
    finally { setSaving(false); }
  }

  return { scheduleOpen, setScheduleOpen, repeatMode, setRepeatMode, rules, activeRules: rules.filter((rule) => rule.active), createRecurringSession, endRule };
}
