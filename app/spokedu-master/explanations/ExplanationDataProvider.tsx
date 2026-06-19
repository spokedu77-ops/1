'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { CreateExplanationInput, MasterExplanationDto } from '../types/explanation';

export type ExplanationDataStatus = 'error' | 'idle' | 'loading' | 'ready';

type ExplanationDataContextValue = {
  error: string | null;
  explanations: MasterExplanationDto[];
  reload: () => Promise<void>;
  saveExplanation: (input: CreateExplanationInput) => Promise<MasterExplanationDto>;
  status: ExplanationDataStatus;
  total: number;
};

const ExplanationDataContext = createContext<ExplanationDataContextValue | null>(null);

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

export function ExplanationDataProvider({ children }: { children: ReactNode }) {
  const { ownerId } = useOperationalData();
  const activeOwnerRef = useRef<string | null>(null);
  const [status, setStatus] = useState<ExplanationDataStatus>('idle');
  const [explanations, setExplanations] = useState<MasterExplanationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setExplanations([]);
    setTotal(0);
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
      const json = await requestJson<{ data?: MasterExplanationDto[]; total?: number }>(
        '/api/spokedu-master/explanations',
      );
      if (activeOwnerRef.current !== ownerId) return;
      setExplanations(json.data ?? []);
      setTotal(json.total ?? 0);
      setStatus('ready');
    } catch (caught) {
      if (activeOwnerRef.current !== ownerId) return;
      clearData();
      setError(caught instanceof Error ? caught.message : '안내문을 불러오지 못했습니다.');
      setStatus('error');
    }
  }, [clearData, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveExplanation = useCallback(async (input: CreateExplanationInput) => {
    const json = await requestJson<{ data: MasterExplanationDto }>('/api/spokedu-master/explanations', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setExplanations((current) => [json.data, ...current.filter((item) => item.id !== json.data.id)].slice(0, 10));
    setTotal((current) => current + 1);
    return json.data;
  }, []);

  const value = useMemo<ExplanationDataContextValue>(
    () => ({
      error,
      explanations,
      reload,
      saveExplanation,
      status,
      total,
    }),
    [error, explanations, reload, saveExplanation, status, total],
  );

  return <ExplanationDataContext.Provider value={value}>{children}</ExplanationDataContext.Provider>;
}

export function useExplanationData() {
  const context = useContext(ExplanationDataContext);
  if (!context) {
    throw new Error('useExplanationData must be used inside ExplanationDataProvider');
  }
  return context;
}
