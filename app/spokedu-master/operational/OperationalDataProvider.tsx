'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMasterCanUseRecords } from '../access/MasterAccessProvider';
import { toMasterClientError, toNetworkMasterClientError, type MasterClientError } from '../lib/clientErrors';
import { useProfile } from '../store';
import type {
  CreateClassRecordInput,
  CreateStudentInput,
  MasterClassRecordDto,
  MasterStudentDto,
  UpdateClassRecordInput,
  UpdateStudentInput,
} from '../types/operational';

export type OperationalDataStatus = 'error' | 'idle' | 'loading' | 'ready';

type OperationalDataContextValue = {
  classRecords: MasterClassRecordDto[];
  createStudent: (input: CreateStudentInput) => Promise<MasterStudentDto>;
  deleteStudent: (studentId: string) => Promise<void>;
  updateStudent: (studentId: string, input: UpdateStudentInput) => Promise<MasterStudentDto>;
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

class MasterClientRequestError extends Error {
  readonly clientError: MasterClientError;

  constructor(clientError: MasterClientError) {
    super(clientError.kind);
    this.name = 'MasterClientRequestError';
    this.clientError = clientError;
  }
}

function getProviderErrorMessage(caught: unknown) {
  if (caught instanceof MasterClientRequestError) return caught.clientError.message;
  return toNetworkMasterClientError().message;
}

export function mergeOperationalRecordById(
  current: MasterClassRecordDto[],
  next: MasterClassRecordDto,
) {
  return [next, ...current.filter((record) => record.id !== next.id)];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
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
      throw new MasterClientRequestError(toMasterClientError(response.status, json.error));
    }
    return json;
  } catch (caught) {
    if (caught instanceof MasterClientRequestError) throw caught;
    throw new MasterClientRequestError(toNetworkMasterClientError());
  }
}

export function OperationalDataProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const canUseRecords = useMasterCanUseRecords();
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
      setError(getProviderErrorMessage(caught));
      setStatus('error');
    }
  }, [canUseRecords, clearData, ownerId]);

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

  const updateStudent = useCallback(async (studentId: string, input: UpdateStudentInput) => {
    const json = await requestJson<{ data: MasterStudentDto }>(`/api/spokedu-master/students/${studentId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
    setStudents((current) => current.map((student) => (student.id === studentId ? json.data : student)));
    return json.data;
  }, []);

  const saveClassRecord = useCallback(async (input: CreateClassRecordInput) => {
    const json = await requestJson<{ data: MasterClassRecordDto }>('/api/spokedu-master/class-records', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setClassRecords((current) => mergeOperationalRecordById(current, json.data));
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
    setClassRecords((current) => mergeOperationalRecordById(current, json.data));
    return json.data;
  }, []);

  const value = useMemo<OperationalDataContextValue>(
    () => ({
      classRecords,
      createStudent,
      deleteStudent,
      updateStudent,
      error,
      ownerId,
      reload,
      saveClassRecord,
      status,
      students,
      updateClassRecord,
    }),
    [classRecords, createStudent, deleteStudent, error, ownerId, reload, saveClassRecord, status, students, updateClassRecord, updateStudent],
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
