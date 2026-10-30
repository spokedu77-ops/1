import Link from 'next/link';

export default function ReportVersionNav({ lab = false }: { lab?: boolean }) {
  return <nav aria-label="정산 버전 전환" className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm">
    <Link href="/admin/master/reports?tab=sheet" aria-current={!lab ? 'page' : undefined} className={`min-h-11 rounded-lg px-4 py-3 ${!lab ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>기존 정산 · 안정 버전</Link>
    <Link href="/admin/master/reports-lab" aria-current={lab ? 'page' : undefined} className={`min-h-11 rounded-lg px-4 py-3 ${lab ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>정산 LAB · 격리 테스트</Link>
  </nav>;
}
