'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import SettlementSheet from './SettlementSheet';
import TeacherSettlementReport from './TeacherSettlementReport';
import ReportVersionNav from './ReportVersionNav';

export default function SettlementReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'teacher' ? 'teacher' : 'sheet';
  const changeTab = (next: 'sheet' | 'teacher') => router.replace(`/admin/master/reports?tab=${next}`, { scroll: false });
  return <main className="min-h-full bg-slate-50">
    <ReportVersionNav />
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] gap-1" role="tablist" aria-label="정산 리포트">
        <button role="tab" aria-selected={tab==='sheet'} onClick={()=>changeTab('sheet')} className={`min-h-11 rounded-xl px-5 text-sm font-bold ${tab==='sheet'?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100'}`}>정산 시트</button>
        <button role="tab" aria-selected={tab==='teacher'} onClick={()=>changeTab('teacher')} className={`min-h-11 rounded-xl px-5 text-sm font-bold ${tab==='teacher'?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100'}`}>강사 정산</button>
      </div>
    </div>
    {tab === 'sheet' ? <SettlementSheet/> : <TeacherSettlementReport/>}
  </main>;
}
