'use client';

import { useState } from 'react';
import { AssetHubHeader } from '@/app/components/admin/assets/AssetHubHeader';
import { AssetHubTabs, type AssetHubTabId } from '@/app/components/admin/assets/AssetHubTabs';
import { ThinkAssetPanel } from '@/app/components/admin/assets/ThinkAssetPanel';
import { FlowBgmPanel } from '@/app/components/admin/assets/FlowBgmPanel';
import { AssetHubBgmPanel } from '@/app/components/admin/assets/AssetHubBgmPanel';
import { SpomoveColorPerceptionPanel } from '@/app/components/admin/assets/SpomoveColorPerceptionPanel';

const CURRENT_YEAR = new Date().getFullYear();

export default function AssetHubPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(1);
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(2);
  const [activeTab, setActiveTabState] = useState<AssetHubTabId>('spomove');

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
          Think / Flow / SPOMOVE 색지각 자산 — <strong className="text-neutral-200">BGM</strong> 탭은 SPOMOVE 트레이닝용 배경음
          풀만 관리합니다(시작 시 목록 중 무작위 재생). 색지각 탭은 <strong className="text-neutral-200">5개 섹션</strong>(1 테마·2~5
          자산)으로 나뉩니다. (챌린지 그리드·템플릿은 Challenge 스튜디오에서 수정)
        </p>
      </div>

      <AssetHubTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab !== 'flow' && activeTab !== 'spomove' && activeTab !== 'bgm' && (
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
      {activeTab === 'bgm' && <AssetHubBgmPanel />}
      {activeTab === 'spomove' && <SpomoveColorPerceptionPanel />}
    </div>
  );
}
