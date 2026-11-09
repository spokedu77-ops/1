'use client';

import { useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CenterListItem } from '@/app/lib/centers/types';
import CentersClient from './CentersClient';
import PrivateLessonsClient from './PrivateLessonsClient';
import PrivateV11Manager from './private-v11/PrivateV11Manager';

type TabId = 'centers' | 'private';

interface CentersHubClientProps {
  initialCenters: CenterListItem[];
}

export default function CentersHubClient({ initialCenters }: CentersHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: TabId = searchParams.get('tab') === 'private' ? 'private' : 'centers';
  const settlementView = tab === 'private' && searchParams.get('view') === 'settlement';
  const privateDirty = useRef(false);
  const onPrivateDirtyChange = useCallback((dirty: boolean) => { privateDirty.current = dirty; }, []);
  const checkUnsaved = () => !privateDirty.current || window.confirm('저장하지 않은 개인수업 변경사항을 버릴까요?');
  const selectTab = (next: TabId) => {
    if (next === tab) return;
    if (tab === 'private' && !checkUnsaved()) return;
    privateDirty.current = false;
    router.replace(next === 'private' ? '/admin/centers?tab=private' : '/admin/centers', { scroll: false });
  };


  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight mb-4">기관·개인 관리</h1>
        <div className="inline-flex gap-1 p-1 rounded-full bg-slate-100 border border-slate-200/80 mb-4" role="tablist" aria-label="기관·개인 관리 탭">
          <button type="button" role="tab" id="centers-database-tab" aria-controls="centers-database-panel" aria-selected={tab === 'centers'} onClick={() => selectTab('centers')} className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation ${tab === 'centers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>기관 관리</button>
          <button type="button" role="tab" id="private-lessons-tab" aria-controls="private-lessons-panel" aria-selected={tab === 'private'} onClick={() => selectTab('private')} className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation ${tab === 'private' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>개인 수업 관리</button>
        </div>
      </div>
      {tab === 'centers' ? (
        <section role="tabpanel" id="centers-database-panel" aria-labelledby="centers-database-tab"><CentersClient initialCenters={initialCenters} embedded /></section>
      ) : (
        <section role="tabpanel" id="private-lessons-panel" aria-labelledby="private-lessons-tab">
          {settlementView
            ? <PrivateLessonsClient onDirtyChange={onPrivateDirtyChange} />
            : <PrivateV11Manager onDirtyChange={onPrivateDirtyChange} />}
        </section>
      )}
    </div>
  );
}
