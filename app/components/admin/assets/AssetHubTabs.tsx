'use client';

export type AssetHubTabId = 'think' | 'play' | 'flow';

export interface AssetHubTabsProps {
  activeTab: AssetHubTabId;
  onTabChange: (tab: AssetHubTabId) => void;
}

export function AssetHubTabs({ activeTab, onTabChange }: AssetHubTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-neutral-700 bg-neutral-900/50 p-1">
      <button
        type="button"
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'think'
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        onClick={() => onTabChange('think')}
      >
        Think Asset
      </button>
      <button
        type="button"
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'play'
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        onClick={() => onTabChange('play')}
      >
        Play Asset
      </button>
      <button
        type="button"
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'flow'
            ? 'bg-neutral-700 text-white'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        onClick={() => onTabChange('flow')}
      >
        Flow Asset
      </button>
    </div>
  );
}
