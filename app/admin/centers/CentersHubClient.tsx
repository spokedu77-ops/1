'use client';

import { useState } from 'react';
import type { Center } from '@/app/lib/centers/types';
import CentersClient from './CentersClient';
import CenterTbdCalendar from './components/CenterTbdCalendar';

type TabId = 'list' | 'calendar';

interface CentersHubClientProps {
  initialCenters: Center[];
}

export default function CentersHubClient({ initialCenters }: CentersHubClientProps) {
  const [tab, setTab] = useState<TabId>('list');

  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight mb-4">
          센터 관리
        </h1>
        <div
          className="inline-flex gap-1 p-1 rounded-full bg-slate-100 border border-slate-200/80 mb-4"
          role="tablist"
          aria-label="센터 관리 탭"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'list'}
            onClick={() => setTab('list')}
            className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation ${
              tab === 'list'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            목록
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'calendar'}
            onClick={() => setTab('calendar')}
            className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation ${
              tab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            센터 미정 캘린더
          </button>
        </div>
      </div>

      {tab === 'list' ? (
        <CentersClient initialCenters={initialCenters} embedded />
      ) : (
        <CenterTbdCalendar />
      )}
    </div>
  );
}
