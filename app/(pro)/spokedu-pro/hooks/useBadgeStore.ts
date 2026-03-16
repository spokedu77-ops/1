'use client';

/**
 * 성취 뱃지 목록 훅.
 * GET /api/spokedu-pro/badges
 */
import { useState, useEffect, useCallback } from 'react';

export type Badge = {
  id: string;
  studentName: string;
  classGroup: string;
  strengthSummary: string;
  growthTag: string;
  period: string;
  generatedAt: string;
};

async function apiFetchBadges(): Promise<Badge[]> {
  const res = await fetch('/api/spokedu-pro/badges');
  if (!res.ok) throw new Error('badges fetch failed');
  const data = await res.json();
  return (data.badges ?? []) as Badge[];
}

export function useBadgeStore() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadBadges = useCallback(async () => {
    try {
      const list = await apiFetchBadges();
      setBadges(list);
    } catch {
      setBadges([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  return { badges, loaded, reload: loadBadges };
}
