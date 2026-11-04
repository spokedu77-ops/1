'use client';

import { Image, Music2, Orbit } from 'lucide-react';
import styles from './AssetHubUi.module.css';

export type AssetHubTabId = 'spomove' | 'bgm' | 'dive';

export interface AssetHubTabsProps {
  activeTab: AssetHubTabId;
  onTabChange: (tab: AssetHubTabId) => void;
}

const TAB_ORDER: AssetHubTabId[] = ['spomove', 'bgm', 'dive'];
const TAB_ICONS = { spomove: Image, bgm: Music2, dive: Orbit };

const TAB_LABELS: Record<AssetHubTabId, string> = {
  spomove: 'SPOMOVE · 연상 색지각',
  bgm: 'BGM',
  dive: 'DIVE 환경',
};

export function AssetHubTabs({ activeTab, onTabChange }: AssetHubTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="자산 종류">
      {TAB_ORDER.map((tab) => {
        const Icon = TAB_ICONS[tab];
        return (
        <button
          key={tab}
          type="button"
          className={styles.tab}
          role="tab"
          id={`asset-tab-${tab}`}
          aria-selected={activeTab === tab}
          aria-controls={`asset-panel-${tab}`}
          tabIndex={activeTab === tab ? 0 : -1}
          onClick={() => onTabChange(tab)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = TAB_ORDER.indexOf(tab);
            const next = event.key === 'Home' ? TAB_ORDER[0]
              : event.key === 'End' ? TAB_ORDER[TAB_ORDER.length - 1]
                : TAB_ORDER[(index + (event.key === 'ArrowRight' ? 1 : -1) + TAB_ORDER.length) % TAB_ORDER.length];
            onTabChange(next);
            document.getElementById(`asset-tab-${next}`)?.focus();
          }}
        >
          <Icon size={16} />{TAB_LABELS[tab]}
        </button>
      );})}
    </div>
  );
}
