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
import { getMasterRequestErrorMessage, masterFetchJson } from '../lib/masterRequestError';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { CreateExplanationInput, MasterExplanationDto } from '../types/explanation';

export type ExplanationDataStatus = 'error' | 'idle' | 'loading' | 'ready';

type ExplanationDataContextValue = {
  error: string | null;
  explanations: MasterExplanationDto[];
  getExplanation: (id: string) => Promise<MasterExplanationDto | null>;
  reload: () => Promise<void>;
  saveExplanation: (input: CreateExplanationInput) => Promise<MasterExplanationDto>;
  status: ExplanationDataStatus;
  total: number;
};

const ExplanationDataContext = createContext<ExplanationDataContextValue | null>(null);

function getProviderErrorMessage(caught: unknown) {
  return getMasterRequestErrorMessage(caught);
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
      const json = await masterFetchJson<{ data?: MasterExplanationDto[]; total?: number }>(
        '/api/spokedu-master/explanations',
      );
      if (activeOwnerRef.current !== ownerId) return;
      setExplanations(json.data ?? []);
      setTotal(json.total ?? 0);
      setStatus('ready');
    } catch (caught) {
      if (activeOwnerRef.current !== ownerId) return;
      clearData();
      setError(getProviderErrorMessage(caught));
      setStatus('error');
    }
  }, [clearData, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveExplanation = useCallback(async (input: CreateExplanationInput) => {
    const json = await masterFetchJson<{ data: MasterExplanationDto }>('/api/spokedu-master/explanations', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    setExplanations((current) => [json.data, ...current.filter((item) => item.id !== json.data.id)].slice(0, 10));
    setTotal((current) => current + 1);
    return json.data;
  }, []);

  const getExplanation = useCallback(async (id: string) => {
    const json = await masterFetchJson<{ data?: MasterExplanationDto[] }>(
      `/api/spokedu-master/explanations?saved=${encodeURIComponent(id)}`,
    );
    const explanation = json.data?.[0] ?? null;
    if (explanation) {
      setExplanations((current) => [explanation, ...current.filter((item) => item.id !== explanation.id)].slice(0, 10));
    }
    return explanation;
  }, []);

  const value = useMemo<ExplanationDataContextValue>(
    () => ({
      error,
      explanations,
      getExplanation,
      reload,
      saveExplanation,
      status,
      total,
    }),
    [error, explanations, getExplanation, reload, saveExplanation, status, total],
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
