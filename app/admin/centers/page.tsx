'use client';

import { useState, useEffect } from 'react';
import { getCenters } from './actions/centers';
import type { Center } from '@/app/lib/centers/types';
import CentersClient from './CentersClient';

export default function CentersListPage() {
  const [initialCenters, setInitialCenters] = useState<Center[] | null>(null);

  useEffect(() => {
    getCenters({ status: 'active' }).then(setInitialCenters);
  }, []);

  if (initialCenters === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <CentersClient initialCenters={initialCenters} />;
}
