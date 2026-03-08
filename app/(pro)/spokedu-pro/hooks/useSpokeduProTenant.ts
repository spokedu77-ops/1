'use client';

import { useCallback, useState } from 'react';

export type TenantMap = Record<string, { value: unknown; published_at: string | null }>;

const TENANT_KEYS = ['tenant_roadmap', 'tenant_favorites', 'tenant_students', 'tenant_report_config'] as const;

/**
 * 테넌트 콘텐츠 GET. keys는 TENANT_KEYS 내에서만.
 * D9: v2 view/center 사용 시 캐시 키에 activeCenterId 포함. 전환 시 리셋/재요청.
 */
export function useSpokeduProTenant(keys: string[], _activeCenterId?: string | null) {
  const [data, setData] = useState<TenantMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    const requested = keys.filter((k) => (TENANT_KEYS as readonly string[]).includes(k));
    if (requested.length === 0) {
      setData({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ keys: requested.join(',') });
      const res = await fetch(`/api/spokedu-pro/tenant?${q}`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const j = await res.json();
      setData(j.data ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [keys.join(',')]);

  return { data, loading, error, fetchTenant };
}
