'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Schedule } from '@/app/lib/schedules/types';
import type { Center } from '@/app/lib/centers/types';
import SchedulesClient from '../SchedulesClient';
import CentersClient from '../../centers/CentersClient';
import { CalendarDays, Building2 } from 'lucide-react';

interface ScheduleCenterTabsProps {
  initialSchedules: Schedule[];
  initialCenters: Center[];
}

type TabId = 'schedules' | 'centers';

export function ScheduleCenterTabs({
  initialSchedules,
  initialCenters,
}: ScheduleCenterTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('schedules');
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const centerOptions = initialCenters.map((c) => ({ id: c.id, name: c.name }));
  const selectedCenterName = selectedCenterId
    ? initialCenters.find((c) => c.id === selectedCenterId)?.name ?? null
    : null;

  const handleCenterClick = useCallback(
    (centerId: string) => {
      setSelectedCenterId(centerId);
      setActiveTab('centers');
      router.push(`/admin/centers/${centerId}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-6 min-w-0">
        <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px] touch-manipulation cursor-pointer ${
              activeTab === 'schedules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate">일정</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('centers');
              setSelectedCenterId(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 md:px-8 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px] touch-manipulation cursor-pointer ${
              activeTab === 'centers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">센터 관리</span>
          </button>
        </div>

        {activeTab === 'schedules' && (
          <SchedulesClient
            initialSchedules={initialSchedules}
            centers={centerOptions}
            onCenterClick={handleCenterClick}
          />
        )}

        {activeTab === 'centers' && (
          <div className="space-y-4">
            {selectedCenterId && selectedCenterName && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-indigo-900">
                  선택된 센터: {selectedCenterName}
                </span>
                <Link
                  href={`/admin/centers/${selectedCenterId}`}
                  className="shrink-0 text-sm font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  상세 보기
                </Link>
              </div>
            )}
            <CentersClient initialCenters={initialCenters} />
          </div>
        )}
      </div>
    </div>
  );
}
