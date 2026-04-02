'use client';

import { useCallback, useState } from 'react';
import { devLogger } from '@/app/lib/logging/devLogger';

type Scope = 'public' | 'catalog';

export type ContentMap = Record<string, { value: unknown; published_at: string | null }>;

/**
 * 공용 콘텐츠 GET. 필요한 scope·keys만 요청 (지연 로딩).
 * D9: 캐시 키에 activeCenterId 포함. activeCenter 변경 시 데이터 리셋/재요청 필수.
 */
export function useSpokeduProContent(scope: Scope, keys: string[], activeCenterId?: string | null) {
  const [data, setData] = useState<ContentMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (keys.length === 0) {
      setData({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ scope, keys: keys.join(',') });
      const res = await fetch(`/api/spokedu-pro/content?${q}`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch((err) => {
          devLogger.error('[useSpokeduProContent] fetchContent error body', err);
          return {};
        });
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
  }, [scope, keys.join(','), activeCenterId]);

  return { data, loading, error, fetchContent };
}

/** Admin 블록 한 건: draft_value, published_value, version */
export type BlockEntry = {
  draft_value: unknown;
  published_value: unknown;
  version: number;
};

/**
 * Admin 전용: 공용·테넌트 블록 draft 조회 + 초안 저장/게시.
 * requireAdmin 구간에서만 사용 (Admin 페이지).
 */
export function useSpokeduProAdminBlocks() {
  const [content, setContent] = useState<Record<string, BlockEntry>>({});
  const [tenant, setTenant] = useState<Record<string, BlockEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spokedu-pro/admin/blocks', { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch((err) => {
          devLogger.error('[useSpokeduProContent] fetchBlocks error body', err);
          return {};
        });
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const j = await res.json();
      setContent(j.content ?? {});
      setTenant(j.tenant ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveContentDraft = useCallback(
    async (key: string, value: unknown, expectedVersion?: number): Promise<{ ok: true; version: number } | { ok: false; error?: string }> => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/spokedu-pro/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key, value, expectedVersion }),
        });
        const j = await res.json().catch((err) => {
          devLogger.error('[useSpokeduProContent] saveContentDraft error body', err);
          return {};
        });
        if (!res.ok) {
          const errMsg = (j.error ?? j.message ?? `HTTP ${res.status}`) as string;
          setError(errMsg);
          return { ok: false as const, error: errMsg };
        }
        const newVersion = j.version as number;
        setContent((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            draft_value: value,
            published_value: prev[key]?.published_value ?? {},
            version: newVersion,
          },
        }));
        return { ok: true as const, version: newVersion };
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Network error';
        setError(errMsg);
        return { ok: false as const, error: errMsg };
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const publishContent = useCallback(async (keys: string[]) => {
    if (keys.length === 0) return { ok: false };
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/spokedu-pro/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keys }),
      });
      const j = await res.json().catch((err) => {
        devLogger.error('[useSpokeduProContent] publishContent error body', err);
        return {};
      });
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`);
        return { ok: false };
      }
      await fetchBlocks();
      return { ok: true };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      return { ok: false };
    } finally {
      setPublishing(false);
    }
  }, [fetchBlocks]);

  const saveTenantDraft = useCallback(
    async (key: string, value: unknown, expectedVersion?: number) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/spokedu-pro/tenant', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key, value, expectedVersion }),
        });
        const j = await res.json().catch((err) => {
          devLogger.error('[useSpokeduProContent] saveTenantDraft error body', err);
          return {};
        });
        if (!res.ok) {
          setError(j.error ?? j.message ?? `HTTP ${res.status}`);
          return { ok: false as const, version: undefined };
        }
        const newVersion = j.version as number;
        setTenant((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            draft_value: value,
            published_value: prev[key]?.published_value ?? {},
            version: newVersion,
          },
        }));
        return { ok: true as const, version: newVersion };
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        return { ok: false as const, version: undefined };
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const publishTenant = useCallback(async (keys: string[]) => {
    if (keys.length === 0) return { ok: false };
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/spokedu-pro/tenant/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keys }),
      });
      const j = await res.json().catch((err) => {
        devLogger.error('[useSpokeduProContent] publishTenant error body', err);
        return {};
      });
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`);
        return { ok: false };
      }
      await fetchBlocks();
      return { ok: true };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      return { ok: false };
    } finally {
      setPublishing(false);
    }
  }, [fetchBlocks]);

  return {
    content,
    tenant,
    loading,
    error,
    saving,
    publishing,
    fetchBlocks,
    saveContentDraft,
    publishContent,
    saveTenantDraft,
    publishTenant,
  };
}
