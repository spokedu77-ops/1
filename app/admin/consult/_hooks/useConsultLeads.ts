'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsultRow } from '../types';

type LoadOptions = {
  silent?: boolean;
};

type UseConsultLeadsOptions = {
  /** 상세가 닫혀 있고 mutation 중이 아닐 때 신규 pending이면 호출 */
  onNewPending?: (row: ConsultRow) => void;
};

/**
 * 상담 목록 조회·폴링·신규 미확인 감지.
 * selected(상세) 변경으로 목록이 재조회되지 않도록 detail/updating 상태는 ref로만 참조한다.
 */
export function useConsultLeads(options?: UseConsultLeadsOptions) {
  const [rows, setRows] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const seenPendingIdsRef = useRef<Set<string>>(new Set());
  const detailOpenRef = useRef(false);
  const mutatingRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const onNewPendingRef = useRef(options?.onNewPending);
  onNewPendingRef.current = options?.onNewPending;

  const setDetailOpen = useCallback((open: boolean) => {
    detailOpenRef.current = open;
  }, []);

  const setMutating = useCallback((busy: boolean) => {
    mutatingRef.current = busy;
  }, []);

  const applyRows = useCallback((nextRows: ConsultRow[], allowAutoOpen: boolean) => {
    setRows(nextRows);

    if (!allowAutoOpen || detailOpenRef.current || mutatingRef.current) {
      for (const r of nextRows) {
        if (r.status === 'pending') seenPendingIdsRef.current.add(r.id);
      }
      return;
    }

    const newPending = nextRows.find(
      (r) => r.status === 'pending' && !seenPendingIdsRef.current.has(r.id),
    );

    for (const r of nextRows) {
      if (r.status === 'pending') seenPendingIdsRef.current.add(r.id);
    }

    if (newPending) onNewPendingRef.current?.(newPending);
  }, []);

  const load = useCallback(async (opts?: LoadOptions) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    lastFetchAtRef.current = Date.now();
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consult?limit=200', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; rows?: ConsultRow[]; error?: string };
      if (!json.ok) {
        setError(json.error ?? '데이터를 불러오지 못했습니다.');
        if (!opts?.silent) setRows([]);
        return;
      }
      const nextRows = json.rows ?? [];
      // 최초/수동 새로고침: auto-open 하지 않고 seen만 채움
      applyRows(nextRows, false);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      if (!opts?.silent) setRows([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [applyRows]);

  const pollForNewPending = useCallback(async () => {
    const now = Date.now();
    if (loadingRef.current) return;
    if (now - lastFetchAtRef.current < 1500) return;

    loadingRef.current = true;
    lastFetchAtRef.current = now;
    try {
      const res = await fetch('/api/admin/consult?limit=200', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; rows?: ConsultRow[]; error?: string };
      if (!json.ok) return;
      applyRows(json.rows ?? [], true);
    } catch {
      // ignore network errors for polling
    } finally {
      loadingRef.current = false;
    }
  }, [applyRows]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void pollForNewPending();
    }, 300_000);

    let focusTimer: number | null = null;
    const schedulePoll = () => {
      if (focusTimer != null) window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        void pollForNewPending();
      }, 200);
    };

    const onVisibility = () => {
      if (!document.hidden) schedulePoll();
    };

    window.addEventListener('focus', schedulePoll);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      if (focusTimer != null) window.clearTimeout(focusTimer);
      window.removeEventListener('focus', schedulePoll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollForNewPending]);

  return {
    rows,
    setRows,
    loading,
    error,
    setError,
    load,
    setDetailOpen,
    setMutating,
  };
}
