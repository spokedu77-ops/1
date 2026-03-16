'use client';

/**
 * 동적 반(ClassGroup) 관리 훅.
 * GET/POST /api/spokedu-pro/classes
 * PATCH/DELETE /api/spokedu-pro/classes/[id]
 */
import { useState, useEffect, useCallback } from 'react';

export type ClassGroup = {
  id: string;
  name: string;
  createdAt: string;
};

type ClassLimitError = {
  error: 'class_limit_exceeded';
  plan: string;
  limit: number;
  current: number;
  message: string;
};

// ── API helpers ────────────────────────────────────────────────────────────

async function apiFetchClasses(): Promise<ClassGroup[]> {
  const res = await fetch('/api/spokedu-pro/classes');
  if (!res.ok) throw new Error('classes fetch failed');
  const data = await res.json();
  return (data.classes ?? []) as ClassGroup[];
}

async function apiCreateClass(name: string): Promise<ClassGroup | ClassLimitError> {
  const res = await fetch('/api/spokedu-pro/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) return data as ClassLimitError;
  return data.class as ClassGroup;
}

async function apiRenameClass(id: string, name: string): Promise<ClassGroup | { error: string }> {
  const res = await fetch(`/api/spokedu-pro/classes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) return data as { error: string };
  return data.class as ClassGroup;
}

async function apiDeleteClass(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/spokedu-pro/classes/${id}`, { method: 'DELETE' });
  return await res.json();
}

// ── 훅 ────────────────────────────────────────────────────────────────────

export function useClassStore() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const loadClasses = useCallback(async () => {
    setSyncing(true);
    setSyncError(false);
    try {
      const fetched = await apiFetchClasses();
      setClasses(fetched);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  /**
   * 반 생성.
   * 성공 시 ClassGroup 반환.
   * 한도 초과 시 ClassLimitError 반환 (팝업 등에서 처리).
   */
  const createClass = useCallback(
    async (name: string): Promise<ClassGroup | ClassLimitError | { error: string }> => {
      const result = await apiCreateClass(name);
      if ('id' in result) {
        setClasses((prev) => [...prev, result]);
      }
      return result;
    },
    []
  );

  const renameClass = useCallback(async (id: string, name: string): Promise<boolean> => {
    const result = await apiRenameClass(id, name);
    if ('id' in result) {
      setClasses((prev) => prev.map((c) => (c.id === id ? result : c)));
      return true;
    }
    return false;
  }, []);

  const deleteClass = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiDeleteClass(id);
    if (result.ok) {
      setClasses((prev) => prev.filter((c) => c.id !== id));
      return true;
    }
    return false;
  }, []);

  return {
    classes,
    loaded,
    syncing,
    syncError,
    createClass,
    renameClass,
    deleteClass,
    reload: loadClasses,
  };
}
