import Link from 'next/link';
import type { CenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';

export default function CenterSettlementPanel({ defaults, onEdit }: { defaults: CenterSettlementDefaults; onEdit: () => void }) {
  return <section className="space-y-3" aria-label="월별 정산">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-semibold">정산 기본정보</h2>
      <Link href="/admin/master/reports?tab=sheet" className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">정산 시트 열기</Link>
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-200 bg-white p-3 text-xs sm:grid-cols-3">
      {[
        ['수업 구분', defaults.type === 'regular' ? '정규' : defaults.type === 'short' ? '단기' : '기타'],
        ['기본 회기', defaults.sessions == null ? '추가 시 입력' : `${defaults.sessions}회`],
        ['부가세', defaults.vat === 'none' ? '없음' : '자동 계산'],
        ['원천징수율', `${defaults.whRate}%`],
        ['결제조건', defaults.termType === 'end' ? '당월 말일' : defaults.termType === 'day' ? `익월 ${defaults.termValue}일` : `월말 이후 ${defaults.termValue}일`],
      ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>)}
    </dl>
    <button type="button" onClick={onEdit} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">정산 기본정보 수정</button>
    <p className="text-sm text-slate-600">정산 시트에서 월을 선택한 뒤 ‘센터 DB에서 수업 추가’로 센터를 선택하세요. 수업료와 메인·보조 강사료를 불러와 회기별 매출·인건비에 반영합니다.</p>
  </section>;
}
