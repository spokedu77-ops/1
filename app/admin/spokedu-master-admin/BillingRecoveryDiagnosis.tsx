import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

export type RecoveryPreview = {
  diagnosis: {
    status: 'applied' | 'recovery_candidate' | 'verification_required' | 'not_recoverable' | 'manual_review' | 'data_lookup_error';
    label: string;
    orderKind: 'initial' | 'upgrade' | 'renewal' | 'invalid';
    evidence: string[];
    blockers: string[];
    checksRequired: string[];
    entitlement: { applied: boolean; subscriptionActive: boolean; plan: string | null };
    processing: { warningAt: string | null; reclaimableAt: string | null; phase: 'not_processing' | 'within_warning' | 'warning' | 'reclaimable' };
    recommendedAction: string;
  };
};

const tone = {
  applied: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  recovery_candidate: 'border-amber-200 bg-amber-50 text-amber-900',
  verification_required: 'border-blue-200 bg-blue-50 text-blue-900',
  not_recoverable: 'border-slate-300 bg-slate-100 text-slate-800',
  manual_review: 'border-rose-200 bg-rose-50 text-rose-800',
  data_lookup_error: 'border-rose-200 bg-rose-50 text-rose-800',
} as const;

const kindLabel = { initial: '신규 결제', upgrade: '플랜 업그레이드', renewal: '정기 갱신', invalid: '식별 불가' } as const;
const processingLabel = { not_processing: '해당 없음', within_warning: '정상 처리 대기(10분 미만)', warning: '조기 경고(10분 경과·15분 lease 전)', reclaimable: '15분 lease 만료' } as const;

export function BillingRecoveryDiagnosis({ preview, loading, error }: { preview: RecoveryPreview | null; loading: boolean; error: string }) {
  return <section className="mt-6 border-t border-slate-200 pt-5" aria-label="복구 진단">
    <div className="mb-3 flex items-center gap-2"><ShieldAlert size={18} className="text-blue-700"/><h4 className="font-black text-slate-950">복구 진단</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">읽기 전용</span></div>
    {loading && <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin"/>진단 중</div>}
    {error && !loading && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle size={18}/><span>{error}</span></div>}
    {preview && !loading && <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${tone[preview.diagnosis.status]}`}><div className="flex items-center gap-2">{preview.diagnosis.status === 'applied' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<b>{preview.diagnosis.label}</b></div><p className="mt-2 text-sm">{preview.diagnosis.recommendedAction}</p></div>
      <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <dt className="text-slate-500">주문 유형</dt><dd className="font-semibold">{kindLabel[preview.diagnosis.orderKind]}</dd>
        <dt className="text-slate-500">권한 반영</dt><dd className="font-semibold">{preview.diagnosis.entitlement.applied ? '반영 확인' : '미반영 또는 불일치'}</dd>
        <dt className="text-slate-500">구독 상태</dt><dd>{preview.diagnosis.entitlement.subscriptionActive ? `활성 · ${preview.diagnosis.entitlement.plan ?? '-'}` : '활성 유료 구독 미확인'}</dd>
        <dt className="text-slate-500">처리 지연</dt><dd>{processingLabel[preview.diagnosis.processing.phase]}</dd>
      </dl>
      <DiagnosisList title="확인된 근거" rows={preview.diagnosis.evidence}/>
      <DiagnosisList title="복구 차단 사유" rows={preview.diagnosis.blockers}/>
      <DiagnosisList title="추가 확인 필요" rows={preview.diagnosis.checksRequired}/>
    </div>}
  </section>;
}

function DiagnosisList({ title, rows }: { title: string; rows: string[] }) {
  return <div><p className="mb-2 text-xs font-black text-slate-600">{title}</p>{rows.length ? <ul className="space-y-1 text-sm text-slate-700">{rows.map((row) => <li key={row} className="break-words">• {row}</li>)}</ul> : <p className="text-sm text-slate-400">기록 없음</p>}</div>;
}
