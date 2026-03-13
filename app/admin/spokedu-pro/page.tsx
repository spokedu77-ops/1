'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ViewId } from '@/app/(pro)/spokedu-pro/hooks/useSpokeduProUI';

const SpokeduProClient = dynamic(() => import('@/app/(pro)/spokedu-pro/SpokeduProClient'), { ssr: false });

/**
 * 스포키듀 구독 Admin 편집 페이지.
 * 편집은 드로어에서만 수행(대시보드 큐레이션·프로그램 상세). 사이드바 "대시보드 편집"으로 큐레이션 드로어 열기.
 * 업로드 버튼은 현재 뷰에 따라 문구·링크 전환(스크린 플레이 → 스크린플레이 업로드, 그 외 → 프로그램 업로드).
 */
export default function AdminSpokeduProPage() {
  const [currentViewId, setCurrentViewId] = useState<ViewId>('roadmap');

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        {currentViewId === 'screenplay' ? (
          <Link
            href="/admin/spokedu-pro/screenplays/upload"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600"
          >
            스크린플레이 업로드
          </Link>
        ) : (
          <Link
            href="/admin/spokedu-pro/upload"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600"
          >
            프로그램 업로드
          </Link>
        )}
        <Link
          href="/spokedu-pro"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
        >
          구독자 보기 (새 탭)
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <SpokeduProClient isEditMode onViewChange={setCurrentViewId} />
      </div>
    </div>
  );
}
