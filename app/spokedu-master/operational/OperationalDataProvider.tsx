'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useProfile } from '../store';
import type {
  CreateClassRecordInput,
  CreateStudentInput,
  MasterClassRecordDto,
  MasterStudentDto,
  UpdateClassRecordInput,
} from '../types/operational';

export type OperationalDataStatus = 'error' | 'idle' | 'loading' | 'ready';

type OperationalDataContextValue = {
  classRecords: MasterClassRecordDto[];
  createStudent: (input: CreateStudentInput) => Promise<MasterStudentDto>;
  deleteStudent: (studentId: string) => Promise<void>;
  error: string | null;
  ownerId: string | null;
  reload: () => Promise<void>;
  saveClassRecord: (input: CreateClassRecordInput) => Promise<MasterClassRecordDto>;
  status: OperationalDataStatus;
  students: MasterStudentDto[];
  updateClassRecord: (recordId: string, input: UpdateClassRecordInput) => Promise<MasterClassRecordDto>;
};

const OperationalDataContext = createContext<OperationalDataContextValue | null>(null);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getProfileOwnerId(profile: ReturnType<typeof useProfile>) {
  return profile?.id && UUID_PATTERN.test(profile.id) ? profile.id : null;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: init?.method ? undefined : 'no-store',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = await readJson<T & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(json.error ?? `HTTP ${response.status}`);
  }
  return json;
}

export function OperationalDataProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const ownerId = getProfileOwnerId(profile);
  const activeOwnerRef = useRef<string | null>(null);
  const [status, setStatus] = useState<OperationalDataStatus>('idle');
  const [students, setStudents] = useState<MasterStudentDto[]>([]);
  const [classRecords, setClassRecords] = useState<MasterClassRecordDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setStudents([]);
    setClassRecords([]);
  }, []);

  const reload = useCallback(async () => {
    if (!ownerId) {
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
      const [studentsJson, recordsJson] = await Promise.all([
        requestJson<{ data?: MasterStudentDto[] }>('/api/spokedu-master/students'),
        requestJson<{ data?: MasterClassRecordDto[] }>('/api/spokedu-master/class-records'),
      ]);
      if (activeOwnerRef.current !== ownerId) return;
      setStudents(studentsJson.data ?? []);
      setClassRecords(recordsJson.data ?? []);
      setStatus('ready');
    } catch (caught) {
      if (activeOwnerRef.current !== ownerId) return;
      clearData();
      setError(caught instanceof Error ? caught.message : '운영 데이터를 불러오지 못했습니다.');
      setStatus('error');
    }
  }, [clearData, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createStudent = useCallback(async (input: CreateStudentInput) => {
    const json = await requestJson<{ data: MasterStudentDto }>('/api/spokedu-master/students', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setStudents((current) => [json.data, ...current.filter((student) => student.id !== json.data.id)]);
    return json.data;
  }, []);

  const deleteStudent = useCallback(async (studentId: string) => {
    await requestJson<{ ok: true }>(`/api/spokedu-master/students/${studentId}`, { method: 'DELETE' });
    setStudents((current) => current.filter((student) => student.id !== studentId));
  }, []);

  const saveClassRecord = useCallback(async (input: CreateClassRecordInput) => {
    const json = await requestJson<{ data: MasterClassRecordDto }>('/api/spokedu-master/class-records', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setClassRecords((current) => [json.data, ...current.filter((record) => record.id !== json.data.id)]);
    return json.data;
  }, []);

  const updateClassRecord = useCallback(async (recordId: string, input: UpdateClassRecordInput) => {
    const json = await requestJson<{ data: MasterClassRecordDto }>(
      `/api/spokedu-master/class-records?id=${encodeURIComponent(recordId)}`,
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );
    setClassRecords((current) => [json.data, ...current.filter((record) => record.id !== json.data.id)]);
    return json.data;
  }, []);

  const value = useMemo<OperationalDataContextValue>(
    () => ({
      classRecords,
      createStudent,
      deleteStudent,
      error,
      ownerId,
      reload,
      saveClassRecord,
      status,
      students,
      updateClassRecord,
    }),
    [classRecords, createStudent, deleteStudent, error, ownerId, reload, saveClassRecord, status, students, updateClassRecord],
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
