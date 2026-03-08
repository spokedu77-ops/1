'use client';

import { useCallback, useState } from 'react';
import type { DashboardV4 } from '@/app/lib/spokedu-pro/dashboardDefaults';

/**
 * v4 대시보드 큐레이션 데이터. GET /api/spokedu-pro/dashboard 호출.
 * D9: activeCenterId 변경 시 refetch 필요(캐시 키에 포함 권장).
 */
export function useSpokeduProDashboard(activeCenterId?: string | null) {
  const [data, setData] = useState<DashboardV4 | null>(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [activeCenterId]);

  return { data, loading, error, fetchDashboard };
}
