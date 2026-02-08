'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCenters } from './actions/centers';
import type { Center } from '@/app/lib/centers/types';
import CentersClient from './CentersClient';

export default function CentersListPage() {
  const [initialCenters, setInitialCenters] = useState<Center[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadCenters = useCallback(async () => {
    setFetchError(null);
    setInitialCenters(null);
    try {
      const data = await getCenters({ status: 'active' });
      setInitialCenters(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '센터 목록을 불러올 수 없습니다.');
      setInitialCenters([]);
    }
  }, []);

  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

  if (initialCenters === null && !fetchError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md px-4 text-center">
          <p className="text-sm font-bold text-red-600">{fetchError}</p>
          <button
            type="button"
            onClick={loadCenters}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return <CentersClient initialCenters={initialCenters ?? []} />;
}
