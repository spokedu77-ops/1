'use client';

export type AssetHubTabId = 'think' | 'play' | 'flow';

export interface AssetHubTabsProps {
  activeTab: AssetHubTabId;
  onTabChange: (tab: AssetHubTabId) => void;
}

const TAB_ORDER: AssetHubTabId[] = ['play', 'think', 'flow'];

const TAB_LABELS: Record<AssetHubTabId, string> = {
  play: 'Play Asset',
  think: 'Think Asset',
  flow: 'Flow Asset',
};

export function AssetHubTabs({ activeTab, onTabChange }: AssetHubTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-neutral-700 bg-neutral-900/50 p-1">
      {TAB_ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          onClick={() => onTabChange(tab)}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
