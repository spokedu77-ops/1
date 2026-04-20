'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import type { DashboardV4 } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getCurrentWeekLabel } from '@/app/lib/spokedu-pro/weekUtils';

/**
 * v4 대시보드 큐레이션 데이터. GET /api/spokedu-pro/dashboard 호출.
 * activeCenterId 또는 주차(weekLabel)가 바뀌면 refetch.
 */
export function useSpokeduProDashboard(activeCenterId?: string | null) {
  const [data, setData] = useState<DashboardV4 | null>(null);
  const [weekLabel, setWeekLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spokedu-pro/dashboard', { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const j = await res.json();
      setData(j.data ?? null);
      setWeekLabel(j.weekLabel ?? getCurrentWeekLabel());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const currentWeekLabel = getCurrentWeekLabel();
  const lastCalendarWeekRef = useRef(currentWeekLabel);

  useEffect(() => {
    lastCalendarWeekRef.current = getCurrentWeekLabel();
    void fetchDashboard();
  }, [activeCenterId, currentWeekLabel, fetchDashboard]);

  /** 탭을 오래 켜 둔 뒤 월요일이 넘어가면 주차 라벨·큐레이션을 다시 맞춘다. */
  useEffect(() => {
    const tick = () => {
      const next = getCurrentWeekLabel();
      if (next !== lastCalendarWeekRef.current) {
        lastCalendarWeekRef.current = next;
        void fetchDashboard();
      }
    };
    const intervalId = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchDashboard]);

  return { data, weekLabel: weekLabel ?? currentWeekLabel, loading, error, fetchDashboard };
}
