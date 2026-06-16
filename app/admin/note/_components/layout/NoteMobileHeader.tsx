'use client';

import { Plus } from 'lucide-react';
import { useNotePage } from '../../_page/NotePageContext';

export function NoteMobileHeader() {
  const { mobileTab, setMobileTab, handleCreateDocument, loadingState } = useNotePage();

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 md:hidden">
      <div className="flex items-center gap-0">
        {(['list', 'editor'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-3 py-3 text-[14px] font-medium transition-colors ${
              mobileTab === tab ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-500'
            } disabled:opacity-40`}
            onClick={() => setMobileTab(tab)}
            disabled={false}
          >
            {tab === 'list' ? '목록' : '편집'}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => handleCreateDocument(null)}
        disabled={loadingState === 'loading'}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        새 페이지
      </button>
    </div>
  );
}
