'use client';

import { useEffect, useMemo, useState } from 'react';
import { isSessionRosterLocked, resolveSessionAttendanceRoster } from '../../lib/sessionIntegrity';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../../types/operational';

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
}: {
  session: MasterSessionDto | null;
  activeSession: MasterSessionDto | null;
  selectedClass: MasterClassDto | null;
  students: MasterStudentDto[];
  saving: boolean;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}) {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(Object.fromEntries(resultEntries(session)));
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  useEffect(() => {
    if (!session || saving || dirty) return;
    setAttendance(Object.fromEntries(resultEntries(session)));
  }, [dirty, saving, session]);

  const roster = useMemo(
    () => resolveSessionAttendanceRoster(activeSession ?? session, selectedClass, students),
    [activeSession, selectedClass, session, students],
  );
  const allStudentsPresent = roster.length > 0 && roster.every((student) => attendance[student.id] === 'present');
  const rosterLocked = isSessionRosterLocked(activeSession ?? session);
  const attendanceInput = () => Object.entries(attendance).map(([studentId, attendanceStatus]) => ({ studentId, status: attendanceStatus }));
  const attendancePersistenceInput = () => rosterLocked
    ? roster.map((student) => ({ studentId: student.id, status: attendance[student.id] ?? 'pending' as const }))
    : attendanceInput();

  const updateAttendance = (studentId: string, value: 'present' | 'absent') => {
    setAttendance((current) => {
      if (rosterLocked) return { ...current, [studentId]: value };
      return current[studentId] === value
        ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== studentId))
        : { ...current, [studentId]: value };
    });
    setDirty(true);
  };

  const toggleAllAttendance = () => {
    setAttendance((current) => {
      if (rosterLocked) {
        const nextStatus = allStudentsPresent ? 'absent' as const : 'present' as const;
        return { ...current, ...Object.fromEntries(roster.map((student) => [student.id, nextStatus])) };
      }
      if (allStudentsPresent) {
        const next = { ...current };
        for (const student of roster) delete next[student.id];
        return next;
      }
      return { ...current, ...Object.fromEntries(roster.map((student) => [student.id, 'present' as const])) };
    });
    setDirty(true);
  };

  return { attendance, setAttendance, attendanceOpen, setAttendanceOpen, roster, allStudentsPresent, attendanceInput, attendancePersistenceInput, updateAttendance, toggleAllAttendance };
}
