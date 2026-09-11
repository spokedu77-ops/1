'use client';

import { useEffect, useState } from 'react';
import { buildSessionDraftDateTimes, seoulDateTimeInputToIso } from '../../lib/sessionDateTime';
import type { MasterClassDto, MasterSessionDto, MasterSessionProgramDto, MasterSessionStatus, SaveSessionInput } from '../../types/operational';

export function useSessionDraft({
  session,
  initialDay,
  initialClassId,
  classes,
  canUseRecords,
  onClose,
}: {
  session: MasterSessionDto | null;
  initialDay: string;
  initialClassId?: string | null;
  classes: MasterClassDto[];
  canUseRecords: boolean;
  onClose: () => void;
}) {
  const initialTimes = buildSessionDraftDateTimes(new Date(`${initialDay}T12:00:00+09:00`), session ?? undefined);
  const [activeSession, setActiveSession] = useState(session);
  const [classId, setClassId] = useState(session?.classId ?? classes.find((item) => item.id === initialClassId)?.id ?? classes[0]?.id ?? '');
  const [startAt, setStartAt] = useState(initialTimes.startAt);
  const [endAt, setEndAt] = useState(initialTimes.endAt);
  const [status, setStatus] = useState<MasterSessionStatus>(session?.status ?? 'scheduled');
  const [memo, setMemo] = useState(session?.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!session || saving || dirty) return;
    const times = buildSessionDraftDateTimes(new Date(`${initialDay}T12:00:00+09:00`), session);
    setActiveSession(session);
    setStatus(session.status);
    setMemo(session.memo ?? '');
    setStartAt(times.startAt);
    setEndAt(times.endAt);
  }, [dirty, initialDay, saving, session]);

  const input = (programs: MasterSessionProgramDto[], nextStatus = status): SaveSessionInput => ({
    classId,
    startAt: seoulDateTimeInputToIso(startAt),
    endAt: seoulDateTimeInputToIso(endAt),
    status: nextStatus,
    memo: canUseRecords ? memo.trim() || null : null,
    programs: activeSession ? undefined : programs.map((item) => ({ sourceType: item.sourceType, programId: item.programId, spomovePresetId: item.spomovePresetId })),
  });

  const requestClose = () => {
    if (saving) return false;
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 나가면 사라집니다.')) return false;
    onClose();
    return true;
  };

  return {
    activeSession, setActiveSession,
    classId, setClassId,
    startAt, setStartAt,
    endAt, setEndAt,
    status, setStatus,
    memo, setMemo,
    saving, setSaving,
    dirty, setDirty,
    error, setError,
    input,
    requestClose,
  };
}
