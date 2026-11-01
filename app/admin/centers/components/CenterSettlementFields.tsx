import type { CenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';

const control = 'mt-1 h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm';
export default function CenterSettlementFields({ value, onChange }: {
  value: CenterSettlementDefaults; onChange: (value: CenterSettlementDefaults) => void;
}) {
  return <fieldset className="space-y-2 border-b border-slate-100 pb-3">
    <legend className="text-xs font-semibold text-slate-500">정산 기본정보</legend>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <label className="text-xs text-slate-600">수업 구분<select className={control} value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value as CenterSettlementDefaults['type'] })}><option value="regular">정규</option><option value="short">단기</option><option value="etc">기타</option></select></label>
      <label className="text-xs text-slate-600">기본 회기<input className={control} type="number" min={1} max={1000} step={1} placeholder="추가할 때 입력" value={value.sessions ?? ''} onChange={(event) => onChange({ ...value, sessions: event.target.value === '' ? null : Number(event.target.value) })} /></label>
      <label className="text-xs text-slate-600">부가세<select className={control} value={value.vat} onChange={(event) => onChange({ ...value, vat: event.target.value as 'auto' | 'none' })}><option value="auto">자동 계산</option><option value="none">없음</option></select></label>
      <label className="text-xs text-slate-600">원천징수율 (%)<input className={control} type="number" min={0} max={100} step="any" value={value.whRate} onChange={(event) => onChange({ ...value, whRate: Number(event.target.value) })} /></label>
      <label className="text-xs text-slate-600">결제조건<select className={control} value={value.termType} onChange={(event) => { const termType = event.target.value as CenterSettlementDefaults['termType']; onChange({ ...value, termType, termValue: termType === 'end' ? 0 : termType === 'day' ? 10 : 30 }); }}><option value="end">당월 말일</option><option value="day">익월 지정일</option><option value="days">월말 이후 일수</option></select></label>
      {value.termType !== 'end' ? <label className="text-xs text-slate-600">{value.termType === 'day' ? '결제일 (일)' : '월말 이후 (일)'}<input className={control} type="number" min={1} max={value.termType === 'day' ? 31 : 365} step={1} value={value.termValue} onChange={(event) => onChange({ ...value, termValue: Number(event.target.value) })} /></label> : null}
    </div>
  </fieldset>;
}
