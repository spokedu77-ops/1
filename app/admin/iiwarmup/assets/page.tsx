'use client';

import { useState } from 'react';
import { AssetHubHeader } from '@/app/components/admin/assets/AssetHubHeader';
import { AssetHubTabs, type AssetHubTabId } from '@/app/components/admin/assets/AssetHubTabs';
import { ThinkAssetPanel } from '@/app/components/admin/assets/ThinkAssetPanel';
import { FlowBgmPanel } from '@/app/components/admin/assets/FlowBgmPanel';

const CURRENT_YEAR = new Date().getFullYear();

export default function AssetHubPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(1);
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(2);
  const [activeTab, setActiveTabState] = useState<AssetHubTabId>('think');

  const setActiveTab = (tab: AssetHubTabId) => {
    if (tab === 'think' && week === 1) setWeek(2);
    setActiveTabState(tab);
  };

  const weekOptions = activeTab === 'think' ? ([] as const) : ([1, 2, 3, 4] as const);
  const effectiveWeek = activeTab === 'think' ? 3 : week;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">AssetHub</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Think / Flow 자산 관리 (챌린지는 Challenge 스튜디오에서 직접 수정)
        </p>
      </div>

      <AssetHubTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab !== 'flow' && (
        <AssetHubHeader
          year={year}
          month={month}
          week={effectiveWeek}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onWeekChange={(w) => setWeek(w as 1 | 2 | 3 | 4)}
          weekOptions={weekOptions}
        />
      )}

      {activeTab === 'think' && <ThinkAssetPanel selectedMonth={month} />}
      {activeTab === 'flow' && <FlowBgmPanel />}
    </div>
  );
}
