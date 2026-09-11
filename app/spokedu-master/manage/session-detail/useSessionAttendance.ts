'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../../types/operational';

export function useSessionAttendance({
  session,
  activeSession,
  selectedClass,
  students,
  status,
  saving,
  dirty,
  setDirty,
}: {
  session: MasterSessionDto | null;
  activeSession: MasterSessionDto | null;
  selectedClass: MasterClassDto | null;
  students: MasterStudentDto[];
  status: MasterSessionDto['status'];
  saving: boolean;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}) {
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(Object.fromEntries(session?.attendance.map((item) => [item.studentId, item.status]) ?? []));
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  useEffect(() => {
    if (!session || saving || dirty) return;
    setAttendance(Object.fromEntries(session.attendance.map((item) => [item.studentId, item.status])));
  }, [dirty, saving, session]);

  const currentRoster = useMemo(() => students.filter((student) => selectedClass?.studentIds.includes(student.id)), [selectedClass, students]);
  const historicalRoster = useMemo(() => status === 'completed' ? (activeSession?.attendance ?? [])
    .filter((entry) => !currentRoster.some((student) => student.id === entry.studentId))
    .map((entry) => ({ id: entry.studentId, name: entry.studentName })) : [], [activeSession, currentRoster, status]);
  const roster = useMemo(() => [...currentRoster, ...historicalRoster], [currentRoster, historicalRoster]);
  const allStudentsPresent = roster.length > 0 && roster.every((student) => attendance[student.id] === 'present');
  const attendanceInput = () => Object.entries(attendance).map(([studentId, attendanceStatus]) => ({ studentId, status: attendanceStatus }));

  const updateAttendance = (studentId: string, value: 'present' | 'absent') => {
    setAttendance((current) => current[studentId] === value
      ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== studentId))
      : { ...current, [studentId]: value });
    setDirty(true);
  };

  const toggleAllAttendance = () => {
    setAttendance((current) => {
      if (allStudentsPresent) {
        const next = { ...current };
        for (const student of roster) delete next[student.id];
        return next;
      }
      return { ...current, ...Object.fromEntries(roster.map((student) => [student.id, 'present' as const])) };
    });
    setDirty(true);
  };

  return { attendance, setAttendance, attendanceOpen, setAttendanceOpen, currentRoster, historicalRoster, roster, allStudentsPresent, attendanceInput, updateAttendance, toggleAllAttendance };
}
