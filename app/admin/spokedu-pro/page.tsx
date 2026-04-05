'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const SpokeduProClient = dynamic(() => import('@/app/(pro)/spokedu-pro/SpokeduProClient'), { ssr: false });

/**
 * 스포키듀 구독 Admin 편집 페이지.
 * 편집은 드로어에서만 수행(대시보드 큐레이션·프로그램 상세). 사이드바 "대시보드 편집"으로 큐레이션 드로어 열기.
 * 업로드 버튼: 프로그램 CSV 업로드. (스크린플레이 일괄 업로드는 /admin/spokedu-pro/screenplays/upload)
 */
export default function AdminSpokeduProPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <Link
          href="/admin/spokedu-pro/subscriptions"
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
        >
          구독 운영
        </Link>
        <Link
          href="/admin/spokedu-pro/upload"
          className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600"
        >
          프로그램 업로드
        </Link>
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
        <SpokeduProClient isEditMode />
      </div>
    </div>
  );
}
