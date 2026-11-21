'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SettlementSheet from './SettlementSheet';
import TeacherSettlementReport from './TeacherSettlementReport';

export default function SettlementReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'teacher' ? 'teacher' : 'sheet';
  const changeTab = (next: 'sheet' | 'teacher') => router.replace(`/admin/master/reports?tab=${next}`, { scroll: false });
  return <main className="min-h-full bg-slate-50">
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1">
        <div className="flex gap-1" role="tablist" aria-label="정산 리포트">
        <button role="tab" aria-selected={tab==='sheet'} onClick={()=>changeTab('sheet')} className={`min-h-11 rounded-xl px-5 text-sm font-bold ${tab==='sheet'?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100'}`}>정산 시트</button>
        <button role="tab" aria-selected={tab==='teacher'} onClick={()=>changeTab('teacher')} className={`min-h-11 rounded-xl px-5 text-sm font-bold ${tab==='teacher'?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100'}`}>강사 정산</button>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="관리 도구">
          {[
            { name: '업무 노트', href: '/admin/note' },
            { name: '업데이트 로그', href: '/admin/update-log' },
            { name: 'Health Lab', href: '/admin/health-lab' },
          ].map(item => <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-bold text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950">{item.name}</Link>)}
        </nav>
      </div>
    </div>
    {tab === 'sheet' ? <SettlementSheet/> : <TeacherSettlementReport/>}
  </main>;
}
