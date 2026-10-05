'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { isSessionRosterLocked, resolveSessionAttendanceRoster } from '../../lib/sessionIntegrity';
import type { MasterClassDto, MasterSessionAttendanceStatus, MasterSessionDto, MasterStudentDto } from '../../types/operational';

function resultEntries(session: MasterSessionDto | null | undefined) {
  return session?.attendance.map((item) => [item.studentId, item.status] as const) ?? [];
}

export function useSessionAttendance({
  session,
  activeSession,
  selectedClass,
  students,
  saving,
  dirty,
  setDirty,
  saveAttendance,
  onSaveError,
}: {
  session: MasterSessionDto | null;
  activeSession: MasterSessionDto | null;
  selectedClass: MasterClassDto | null;
  students: MasterStudentDto[];
  saving: boolean;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  saveAttendance?: (sessionId: string, attendance: Array<{ studentId: string; status: MasterSessionAttendanceStatus | 'pending' }>) => Promise<void>;
  onSaveError?: (message: string) => void;
}) {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(Object.fromEntries(resultEntries(session)));
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const attendanceRef = useRef(attendance);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const replaceAttendance = (next: Record<string, 'present' | 'absent'>) => {
    attendanceRef.current = next;
    setAttendance(next);
  };

  useEffect(() => {
    if (!session || saving || dirty || pendingSavesRef.current > 0) return;
    replaceAttendance(Object.fromEntries(resultEntries(session)));
  }, [dirty, saving, session]);

  const roster = useMemo(
    () => resolveSessionAttendanceRoster(activeSession ?? session, selectedClass, students),
    [activeSession, selectedClass, session, students],
  );
  const allStudentsPresent = roster.length > 0 && roster.every((student) => attendance[student.id] === 'present');
  const rosterLocked = isSessionRosterLocked(activeSession ?? session);
  const attendanceInput = () => Object.entries(attendance).map(([studentId, attendanceStatus]) => ({ studentId, status: attendanceStatus }));
  const persistenceFor = (next: Record<string, 'present' | 'absent'>) => rosterLocked
    ? roster.map((student) => ({ studentId: student.id, status: next[student.id] ?? 'pending' as const }))
    : Object.entries(next).map(([studentId, status]) => ({ studentId, status }));
  const attendancePersistenceInput = () => persistenceFor(attendance);

  const commitAttendance = (next: Record<string, 'present' | 'absent'>) => {
    replaceAttendance(next);
    const sessionId = activeSession?.id;
    if (!sessionId || !saveAttendance) {
      setDirty(true);
      return;
    }
    const payload = persistenceFor(next);
    pendingSavesRef.current += 1;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await saveAttendance(sessionId, payload);
      } catch (caught) {
        setDirty(true);
        onSaveError?.(getMasterRequestErrorMessage(caught, '출석을 저장하지 못했습니다.'));
      } finally {
        pendingSavesRef.current -= 1;
      }
    });
  };

  const updateAttendance = (studentId: string, value: 'present' | 'absent') => {
    const current = attendanceRef.current;
    if (rosterLocked) {
      commitAttendance({ ...current, [studentId]: value });
      return;
    }
    commitAttendance(current[studentId] === value
      ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== studentId))
      : { ...current, [studentId]: value });
  };

  const toggleAllAttendance = () => {
    const current = attendanceRef.current;
    if (rosterLocked) {
      const nextStatus = allStudentsPresent ? 'absent' as const : 'present' as const;
      commitAttendance({ ...current, ...Object.fromEntries(roster.map((student) => [student.id, nextStatus])) });
      return;
    }
    if (allStudentsPresent) {
      const next = { ...current };
      for (const student of roster) delete next[student.id];
      commitAttendance(next);
      return;
    }
    commitAttendance({ ...current, ...Object.fromEntries(roster.map((student) => [student.id, 'present' as const])) });
  };

  return { attendance, setAttendance: replaceAttendance, attendanceOpen, setAttendanceOpen, roster, allStudentsPresent, attendanceInput, attendancePersistenceInput, updateAttendance, toggleAllAttendance };
}
