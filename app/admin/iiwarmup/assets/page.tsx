'use client';

import { useState, useEffect } from 'react';
import { AssetHubHeader } from '@/app/components/admin/assets/AssetHubHeader';
import { AssetHubTabs, type AssetHubTabId } from '@/app/components/admin/assets/AssetHubTabs';
import { ThinkAssetPanel } from '@/app/components/admin/assets/ThinkAssetPanel';
import { PlayAssetPanel } from '@/app/components/admin/assets/PlayAssetPanel';
import { FlowBgmPanel } from '@/app/components/admin/assets/FlowBgmPanel';

const CURRENT_YEAR = new Date().getFullYear();

export default function AssetHubPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(1);
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(2);
  const [activeTab, setActiveTab] = useState<AssetHubTabId>('think');

  // Think는 2·3·4주차만 지원 → Play에서 1주차 선택 후 Think로 전환 시 2로 보정
  useEffect(() => {
    if (activeTab === 'think' && week === 1) setWeek(2);
  }, [activeTab, week]);

  const weekOptions = activeTab === 'think' ? ([2, 3, 4] as const) : ([1, 2, 3, 4] as const);
  const effectiveWeek = activeTab === 'think' ? (week === 1 ? 2 : week) : week;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">AssetHub</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Think / Play 자산 관리 (월·주차별)
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

      {activeTab === 'think' && (
        <ThinkAssetPanel selectedMonth={month} selectedWeek={effectiveWeek as 2 | 3 | 4} />
      )}
      {activeTab === 'play' && (
        <PlayAssetPanel year={year} month={month} week={effectiveWeek} />
      )}
      {activeTab === 'flow' && <FlowBgmPanel />}
    </div>
  );
}
