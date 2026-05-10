'use client';

import { useState } from 'react';
import { AssetHubTabs, type AssetHubTabId } from '@/app/components/admin/assets/AssetHubTabs';
import { FlowBgmPanel } from '@/app/components/admin/assets/FlowBgmPanel';
import { AssetHubBgmPanel } from '@/app/components/admin/assets/AssetHubBgmPanel';
import { SpomoveColorPerceptionPanel } from '@/app/components/admin/assets/SpomoveColorPerceptionPanel';

export default function AssetHubPage() {
  const [activeTab, setActiveTabState] = useState<AssetHubTabId>('spomove');

  const setActiveTab = (tab: AssetHubTabId) => setActiveTabState(tab);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">AssetHub</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Flow / SPOMOVE 색지각 자산 — <strong className="text-neutral-200">BGM</strong> 탭은 SPOMOVE 트레이닝용 배경음
          풀만 관리합니다(시작 시 목록 중 무작위 재생). 색지각 탭은 <strong className="text-neutral-200">6개 섹션</strong>(1 테마·2~6
          자산)으로 나뉩니다. (챌린지 그리드·템플릿은 Challenge 스튜디오에서 수정)
        </p>
      </div>

      <AssetHubTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'flow' && <FlowBgmPanel />}
      {activeTab === 'bgm' && <AssetHubBgmPanel />}
      {activeTab === 'spomove' && <SpomoveColorPerceptionPanel />}
    </div>
  );
}
