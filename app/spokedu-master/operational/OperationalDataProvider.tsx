'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMasterCanUseRecords } from '../access/MasterAccessProvider';
import { getMasterRequestErrorMessage, masterFetchJson } from '../lib/masterRequestError';
import { useProfile } from '../store';
import type {
  CreateStudentInput,
  MasterClassDto,
  MasterSessionDto,
  MasterStudentDto,
  SaveSessionInput,
  MasterSessionAttendanceStatus,
  UpdateStudentInput,
} from '../types/operational';

export type OperationalDataStatus = 'error' | 'idle' | 'loading' | 'ready';

type OperationalDataContextValue = {
  classes: MasterClassDto[];
  createClass: (name: string) => Promise<MasterClassDto>;
  updateClass: (classId: string, name: string) => Promise<MasterClassDto>;
  createStudent: (input: CreateStudentInput) => Promise<MasterStudentDto>;
  deleteStudent: (studentId: string) => Promise<void>;
  updateStudent: (studentId: string, input: UpdateStudentInput) => Promise<MasterStudentDto>;
  error: string | null;
  ownerId: string | null;
  reload: () => Promise<void>;
  saveSession: (input: SaveSessionInput, sessionId?: string) => Promise<MasterSessionDto>;
  completeSession: (sessionId: string, input: SaveSessionInput, attendance: Array<{ studentId: string; status: MasterSessionAttendanceStatus }>) => Promise<MasterSessionDto>;
  createNextSession: (sourceSessionId: string, input: { startAt: string; endAt: string; copyPrograms: boolean }) => Promise<MasterSessionDto>;
  addSessionProgram: (sessionId: string, programId: number) => Promise<MasterSessionDto['programs'][number]>;
  addSessionSpomove: (sessionId: string, spomovePresetId: string) => Promise<MasterSessionDto['programs'][number]>;
  removeSessionProgram: (sessionId: string, sessionProgramId: string) => Promise<void>;
  updateSessionProgram: (sessionId: string, sessionProgramId: string, isCompleted: boolean) => Promise<void>;
  reorderSessionPrograms: (sessionId: string, sessionProgramIds: string[]) => Promise<MasterSessionDto['programs']>;
  saveSessionAttendance: (sessionId: string, attendance: Array<{ studentId: string; status: MasterSessionAttendanceStatus }>) => Promise<void>;
  addClassStudent: (classId: string, studentId: string) => Promise<void>;
  removeClassStudent: (classId: string, studentId: string) => Promise<void>;
  status: OperationalDataStatus;
  students: MasterStudentDto[];
  sessions: MasterSessionDto[];
};

const OperationalDataContext = createContext<OperationalDataContextValue | null>(null);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getProfileOwnerId(profile: ReturnType<typeof useProfile>) {
  return profile?.id && UUID_PATTERN.test(profile.id) ? profile.id : null;
}

function getProviderErrorMessage(caught: unknown) {
  return getMasterRequestErrorMessage(caught);
}

export function OperationalDataProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const canUseRecords = useMasterCanUseRecords();
  const ownerId = getProfileOwnerId(profile);
  const activeOwnerRef = useRef<string | null>(null);
  const [status, setStatus] = useState<OperationalDataStatus>('idle');
  const [students, setStudents] = useState<MasterStudentDto[]>([]);
  const [classes, setClasses] = useState<MasterClassDto[]>([]);
  const [sessions, setSessions] = useState<MasterSessionDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setStudents([]);
    setClasses([]);
    setSessions([]);
  }, []);

  const reload = useCallback(async () => {
    if (!ownerId || !canUseRecords) {
      activeOwnerRef.current = null;
      clearData();
      setError(null);
      setStatus('idle');
      return;
    }

    activeOwnerRef.current = ownerId;
    clearData();
    setError(null);
    setStatus('loading');

    try {
      const [studentsJson, sessionsJson] = await Promise.all([
        masterFetchJson<{ data?: MasterStudentDto[] }>('/api/spokedu-master/students'),
        masterFetchJson<{ data?: { classes?: MasterClassDto[]; sessions?: MasterSessionDto[] } }>('/api/spokedu-master/sessions'),
      ]);
      if (activeOwnerRef.current !== ownerId) return;
      setStudents(studentsJson.data ?? []);
      setClasses(sessionsJson.data?.classes ?? []);
      setSessions(sessionsJson.data?.sessions ?? []);
      setStatus('ready');
    } catch (caught) {
      if (activeOwnerRef.current !== ownerId) return;
      clearData();
      setError(getProviderErrorMessage(caught));
      setStatus('error');
    }
  }, [canUseRecords, clearData, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createStudent = useCallback(async (input: CreateStudentInput) => {
    const json = await masterFetchJson<{ data: MasterStudentDto; classIds: string[] }>('/api/spokedu-master/students', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setStudents((current) => [json.data, ...current.filter((student) => student.id !== json.data.id)]);
    setClasses((current) => current.map((item) => ({
      ...item,
      studentIds: json.classIds.includes(item.id)
        ? [...new Set([...item.studentIds, json.data.id])]
        : item.studentIds.filter((id) => id !== json.data.id),
    })));
    return json.data;
  }, []);

  const deleteStudent = useCallback(async (studentId: string) => {
    await masterFetchJson<{ ok: true }>(`/api/spokedu-master/students/${studentId}`, { method: 'DELETE' });
    setStudents((current) => current.filter((student) => student.id !== studentId));
    setClasses((current) => current.map((item) => ({ ...item, studentIds: item.studentIds.filter((id) => id !== studentId) })));
  }, []);

  const updateStudent = useCallback(async (studentId: string, input: UpdateStudentInput) => {
    const json = await masterFetchJson<{ data: MasterStudentDto; classIds: string[] }>(`/api/spokedu-master/students/${studentId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
    setStudents((current) => current.map((student) => (student.id === studentId ? json.data : student)));
    setClasses((current) => current.map((item) => ({
      ...item,
      studentIds: json.classIds.includes(item.id)
        ? [...new Set([...item.studentIds, studentId])]
        : item.studentIds.filter((id) => id !== studentId),
    })));
    return json.data;
  }, []);

  const saveSession = useCallback(async (input: SaveSessionInput, sessionId?: string) => {
    const json = await masterFetchJson<{ data: MasterSessionDto }>(
      sessionId ? `/api/spokedu-master/sessions?id=${encodeURIComponent(sessionId)}` : '/api/spokedu-master/sessions',
      { body: JSON.stringify(input), method: sessionId ? 'PATCH' : 'POST' },
    );
    setSessions((current) => [...current.filter((session) => session.id !== json.data.id), json.data]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    return json.data;
  }, []);

  const completeSession = useCallback(async (sessionId: string, input: SaveSessionInput, attendance: Array<{ studentId: string; status: MasterSessionAttendanceStatus }>) => {
    const json = await masterFetchJson<{ data: MasterSessionDto }>('/api/spokedu-master/sessions', {
      body: JSON.stringify({ id: sessionId, session: { ...input, status: 'completed' }, attendance }),
      method: 'PUT',
    });
    setSessions((current) => [...current.filter((session) => session.id !== json.data.id), json.data]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    return json.data;
  }, []);

  const createNextSession = useCallback(async (sourceSessionId: string, input: { startAt: string; endAt: string; copyPrograms: boolean }) => {
    const json = await masterFetchJson<{ data: MasterSessionDto }>(`/api/spokedu-master/sessions/${sourceSessionId}/next`, {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setSessions((current) => [...current.filter((session) => session.id !== json.data.id), json.data]
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    return json.data;
  }, []);

  const createClass = useCallback(async (name: string) => {
    const json = await masterFetchJson<{ data: MasterClassDto }>('/api/spokedu-master/classes', {
      body: JSON.stringify({ name }),
      method: 'POST',
    });
    setClasses((current) => [...current, json.data].sort((a, b) => a.name.localeCompare(b.name, 'ko')));
    return json.data;
  }, []);

  const updateClass = useCallback(async (classId: string, name: string) => {
    const json = await masterFetchJson<{ data: MasterClassDto }>(`/api/spokedu-master/classes/${classId}`, {
      body: JSON.stringify({ name }),
      method: 'PATCH',
    });
    setClasses((current) => current.map((item) => item.id === classId ? json.data : item)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko')));
    setSessions((current) => current.map((item) => item.classId === classId && item.status === 'scheduled' ? { ...item, className: json.data.name } : item));
    return json.data;
  }, []);

  const addSessionProgram = useCallback(async (sessionId: string, programId: number) => {
    const json = await masterFetchJson<{ data: MasterSessionDto['programs'][number] }>(`/api/spokedu-master/sessions/${sessionId}/programs`, { method: 'POST', body: JSON.stringify({ sourceType: 'program', programId }) });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, programs: [...item.programs, json.data] } : item));
    return json.data;
  }, []);

  const addSessionSpomove = useCallback(async (sessionId: string, spomovePresetId: string) => {
    const json = await masterFetchJson<{ data: MasterSessionDto['programs'][number] }>(`/api/spokedu-master/sessions/${sessionId}/programs`, { method: 'POST', body: JSON.stringify({ sourceType: 'spomove', spomovePresetId }) });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, programs: [...item.programs, json.data] } : item));
    return json.data;
  }, []);

  const removeSessionProgram = useCallback(async (sessionId: string, sessionProgramId: string) => {
    await masterFetchJson(`/api/spokedu-master/sessions/${sessionId}/programs/${sessionProgramId}`, { method: 'DELETE' });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, programs: item.programs.filter((program) => program.id !== sessionProgramId).map((program, sortOrder) => ({ ...program, sortOrder })) } : item));
  }, []);

  const updateSessionProgram = useCallback(async (sessionId: string, sessionProgramId: string, isCompleted: boolean) => {
    await masterFetchJson(`/api/spokedu-master/sessions/${sessionId}/programs/${sessionProgramId}`, { method: 'PATCH', body: JSON.stringify({ isCompleted }) });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, programs: item.programs.map((program) => program.id === sessionProgramId ? { ...program, isCompleted } : program) } : item));
  }, []);

  const reorderSessionPrograms = useCallback(async (sessionId: string, sessionProgramIds: string[]) => {
    const json = await masterFetchJson<{ data: MasterSessionDto['programs'] }>(`/api/spokedu-master/sessions/${sessionId}/programs/reorder`, { method: 'PATCH', body: JSON.stringify({ sessionProgramIds }) });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, programs: json.data } : item));
    return json.data;
  }, []);

  const saveSessionAttendance = useCallback(async (sessionId: string, attendance: Array<{ studentId: string; status: MasterSessionAttendanceStatus }>) => {
    await masterFetchJson(`/api/spokedu-master/sessions/${sessionId}/attendance`, { method: 'PUT', body: JSON.stringify({ attendance }) });
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, attendance: attendance.map((entry) => ({
      id: item.attendance.find((old) => old.studentId === entry.studentId)?.id ?? entry.studentId,
      studentName: item.attendance.find((old) => old.studentId === entry.studentId)?.studentName
        ?? students.find((student) => student.id === entry.studentId)?.name ?? '이름 미확인 학생',
      ...entry,
    })) } : item));
  }, [students]);

  const addClassStudent = useCallback(async (classId: string, studentId: string) => {
    await masterFetchJson(`/api/spokedu-master/classes/${classId}/students`, { method: 'POST', body: JSON.stringify({ studentId }) });
    setClasses((current) => current.map((item) => item.id === classId && !item.studentIds.includes(studentId) ? { ...item, studentIds: [...item.studentIds, studentId] } : item));
  }, []);

  const removeClassStudent = useCallback(async (classId: string, studentId: string) => {
    await masterFetchJson(`/api/spokedu-master/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
    setClasses((current) => current.map((item) => item.id === classId ? { ...item, studentIds: item.studentIds.filter((id) => id !== studentId) } : item));
  }, []);

  const value = useMemo<OperationalDataContextValue>(
    () => ({
      classes,
      completeSession,
      createClass,
      createNextSession,
      addClassStudent,
      addSessionProgram,
      addSessionSpomove,
      createStudent,
      deleteStudent,
      updateStudent,
      error,
      ownerId,
      reload,
      saveSession,
      saveSessionAttendance,
      removeSessionProgram,
      removeClassStudent,
      reorderSessionPrograms,
      sessions,
      status,
      students,
      updateSessionProgram,
      updateClass,
    }),
    [addClassStudent, addSessionProgram, addSessionSpomove, classes, completeSession, createClass, createNextSession, createStudent, deleteStudent, error, ownerId, reload, removeClassStudent, removeSessionProgram, reorderSessionPrograms, saveSession, saveSessionAttendance, sessions, status, students, updateClass, updateSessionProgram, updateStudent],
  );

  return <OperationalDataContext.Provider value={value}>{children}</OperationalDataContext.Provider>;
}

export function useOperationalData() {
  const context = useContext(OperationalDataContext);
  if (!context) {
    throw new Error('useOperationalData must be used inside OperationalDataProvider');
  }
  return context;
}
