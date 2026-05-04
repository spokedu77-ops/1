'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslator } from '@/app/providers/I18nProvider';
import { toast } from 'sonner';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const SpokeduProClient = dynamic(() => import('@/app/(pro)/spokedu-pro/SpokeduProClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0F172A]">
      <div className="flex items-center gap-3 text-slate-300">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-300 rounded-full animate-spin" />
        <p className="text-sm font-bold">화면 준비 중...</p>
      </div>
    </div>
  ),
});

/**
 * 스포키듀 구독 Admin 편집 페이지.
 * 편집은 드로어에서만 수행(대시보드 큐레이션·프로그램 상세). 사이드바 "대시보드 편집"으로 큐레이션 드로어 열기.
 * 업로드 버튼: 프로그램 CSV 업로드. (스크린플레이 일괄 업로드는 /admin/spokedu-pro/screenplays/upload)
 */
export default function AdminSpokeduProPage() {
  const t = useTranslator();
  const [syncing, setSyncing] = useState(false);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <button
          type="button"
          disabled={syncing}
          onClick={async () => {
            if (syncing) return;
            setSyncing(true);
            try {
              const res = await fetch('/api/spokedu-pro/programs/import-center?hardDelete=1', {
                method: 'POST',
                credentials: 'include',
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast.error(t(`동기화 실패: ${j.error ?? `HTTP ${res.status}`}`));
              } else {
                toast.success(t(`센터 커리큘럼 동기화 완료 (updated ${j.updated ?? 0}, inserted ${j.inserted ?? 0})`));
              }
            } catch {
              toast.error(t('동기화 실패: 네트워크 오류'));
            } finally {
              setSyncing(false);
            }
          }}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 disabled:opacity-50"
        >
          {syncing ? t('동기화 중…') : t('센터 커리큘럼 동기화(찌꺼기 삭제)')}
        </button>
        <details className="relative">
          <summary className="list-none cursor-pointer px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600 inline-flex items-center gap-2">
            {t('더보기')}
            <ChevronDown className="w-4 h-4" />
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-50">
            <Link
              href="/spokedu-pro"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              {t('구독자 보기 (새 탭)')}
            </Link>
            <Link
              href="/admin/spokedu-pro/subscriptions"
              className="block px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              {t('구독 운영')}
            </Link>
            <Link
              href="/admin/spokedu-pro/leads"
              className="block px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              {t('리드 관리')}
            </Link>
            <Link
              href="/admin/spokedu-pro/upload"
              className="block px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              {t('프로그램 업로드')}
            </Link>
            <Link
              href="/admin/spokedu-pro/lesson-details"
              className="block px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800/80 border-t border-slate-800"
            >
              {t('수업안 보조정보 관리')}
            </Link>
          </div>
        </details>
      </div>
      <div className="flex-1 min-h-0">
        <SpokeduProClient isEditMode />
      </div>
    </div>
  );
}
