'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { BillingIncidentList } from './BillingIncidentList';

type Props = { version: number; onSelectMember: (userId: string) => void };
type Customer = { userId: string; name: string | null; email: string | null; order: null | { order_id: string; plan: string; amount: number; status: string; updated_at: string; applied_at: string | null; paymentApproved: boolean; last_error_code: string | null }; subscription: null | { plan: string; status: string; pg_provider: string | null; next_billing_at: string | null; cancel_at_period_end: boolean }; issue: { code: string; label: string; severity: string } };

const when = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
const money = (value: number | null | undefined) => value == null ? '-' : `${value.toLocaleString()}원`;

export function BillingOperationsPanel({ version, onSelectMember }: Props) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentType, setIncidentType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/spokedu-master-admin/billing?page=${page}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&incidentPage=${incidentPage}&incidentType=${encodeURIComponent(incidentType)}&severity=${encodeURIComponent(severity)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: 'include', cache: 'no-store', signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || '결제 운영 데이터를 불러오지 못했습니다.');
      setData(json);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : '조회에 실패했습니다.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, q, status, incidentPage, incidentType, severity, from, to]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 250); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load, version]);
  const openOrder = async (orderId: string) => { const response = await fetch(`/api/admin/spokedu-master-admin/billing?orderId=${encodeURIComponent(orderId)}`, { credentials: 'include' }); const json = await response.json(); if (response.ok) setDetail(json); };
  const summary = data?.summary;
  const customers: Customer[] = data?.customers?.rows ?? [];
  const total = data?.customers?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));
  return <section className="space-y-5" aria-label="결제·구독 운영">
    <div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2"><CreditCard className="text-blue-600" size={20}/><h2 className="text-lg font-black">결제·구독 운영</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">조회 전용</span><button type="button" onClick={()=>void load()} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"><RefreshCw size={15}/>새로고침</button></div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} · 다시 시도</div>}
    {loading && !data ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div> : <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[
        ['결제 완료', `${summary?.paidCount ?? 0}건 · ${money(summary?.paidAmount)}`], ['유효 유료 구독', `${summary?.paidSubscriptions ?? 0}명`], ['해지 예약', `${summary?.cancelScheduled ?? 0}건`], ['갱신 확인 필요', `${summary?.renewalAttention ?? 0}건`], ['승인 후 반영 실패', `${summary?.applyFailed ?? 0}건`], ['환불·취소 검토', `${summary?.refundReview ?? 0}건`],
      ].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-slate-950">{value}</p></div>)}</div>
      <div className={`rounded-xl border p-4 ${data?.scheduler?.issueCount ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3"><AlertTriangle size={18} className={data?.scheduler?.issueCount ? 'text-rose-600' : 'text-emerald-600'}/><div><b>정기결제 스케줄러</b><p className="mt-1 text-sm text-slate-600">실패 누적 {data?.scheduler?.issueCount ?? 0}건 · 마지막 정상 실행 {when(data?.scheduler?.lastSuccessfulAt)}</p>{data?.scheduler?.latestIssue && <p className="mt-1 text-xs text-rose-700">최근 오류: {data.scheduler.latestIssue.error_code ?? data.scheduler.latestIssue.status} · {when(data.scheduler.latestIssue.started_at)}</p>}</div></div></div>
      <BillingIncidentList incidents={data?.incidents ?? null} type={incidentType} severity={severity} from={from} to={to} onType={(value)=>{setIncidentType(value);setIncidentPage(1);}} onSeverity={(value)=>{setSeverity(value);setIncidentPage(1);}} onFrom={(value)=>{setFrom(value);setIncidentPage(1);}} onTo={(value)=>{setTo(value);setIncidentPage(1);}} onPage={setIncidentPage} onSelectMember={onSelectMember}/>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={q} onChange={(event)=>{setQ(event.target.value);setPage(1);}} placeholder="고객명·이메일·주문 ID 검색" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"/><select value={status} onChange={(event)=>{setStatus(event.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">전체 상태</option><option value="payment_failed">결제 실패</option><option value="approved_apply_failed">승인 후 반영 실패</option><option value="processing_stale">처리 지연</option><option value="renewal_failed">갱신 실패</option><option value="cancel_scheduled">해지 예약</option><option value="manual_qa">수동 QA</option></select></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="text-xs text-slate-500"><tr>{['고객','요금제','구독 상태','최근 결제','금액','최근 결제일','다음 결제일','해지','후속 조치'].map((label)=><th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{customers.map((row)=><tr key={row.userId} className="border-b border-slate-100 align-top"><td className="p-3"><button className="text-left font-bold text-blue-700" onClick={()=>onSelectMember(row.userId)}>{row.name || '이름 없음'}</button><span className="block break-all text-xs text-slate-500">{row.email || '-'}</span></td><td className="p-3">{row.subscription?.plan ?? row.order?.plan ?? '-'}</td><td className="p-3">{row.subscription?.status ?? '-'}</td><td className="p-3"><button className="font-mono text-xs text-blue-700" onClick={()=>row.order&&void openOrder(row.order.order_id)}>{row.order?.status ?? '-'}</button></td><td className="p-3">{money(row.order?.amount)}</td><td className="p-3">{when(row.order?.updated_at)}</td><td className="p-3">{when(row.subscription?.next_billing_at)}</td><td className="p-3">{row.subscription?.cancel_at_period_end?'예약':'-'}</td><td className="p-3"><span className={row.issue.severity==='danger'?'font-bold text-rose-700':'text-slate-600'}>{row.issue.label}</span></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 md:hidden">{customers.map((row)=><article key={row.userId} className="rounded-xl border border-slate-200 p-4"><button onClick={()=>onSelectMember(row.userId)} className="font-bold text-blue-700">{row.name || '이름 없음'}</button><p className="break-all text-xs text-slate-500">{row.email || '-'}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">플랜</dt><dd>{row.subscription?.plan ?? row.order?.plan ?? '-'}</dd><dt className="text-slate-500">최근 결제</dt><dd>{row.order?.status ?? '-'}</dd><dt className="text-slate-500">다음 결제</dt><dd>{when(row.subscription?.next_billing_at)}</dd><dt className="text-slate-500">상태</dt><dd>{row.issue.label}</dd></dl></article>)}</div>
        {!customers.length && <div className="p-10 text-center text-sm text-slate-500">조건에 맞는 결제·구독 내역이 없습니다.</div>}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>총 {total}건 · {page}/{pageCount}페이지</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(page-1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">이전</button><button disabled={page>=pageCount} onClick={()=>setPage(page+1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">다음</button></div></div>
      </div>
    </>}
    {detail && <div className="fixed inset-0 z-[550] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><div className="flex justify-between gap-3"><h3 className="text-lg font-black">결제 상세</h3><button onClick={()=>setDetail(null)} className="min-h-10 rounded-lg border px-3">닫기</button></div><dl className="mt-5 grid grid-cols-[9rem_1fr] gap-3 text-sm"><dt className="text-slate-500">주문 ID</dt><dd className="break-all font-mono">{detail.order.order_id}</dd><dt className="text-slate-500">고객</dt><dd>{detail.member?.name || '-'} · {detail.member?.email || '-'}</dd><dt className="text-slate-500">플랜·금액</dt><dd>{detail.order.plan} · {money(detail.order.amount)}</dd><dt className="text-slate-500">결제 상태</dt><dd>{detail.order.status}</dd><dt className="text-slate-500">승인 근거</dt><dd>{detail.order.paymentApproved?'확인됨':'없음'}</dd><dt className="text-slate-500">권한 반영</dt><dd>{when(detail.order.applied_at)}</dd><dt className="text-slate-500">구독 상태</dt><dd>{detail.subscription?.status ?? '-'}</dd><dt className="text-slate-500">오류 코드</dt><dd>{detail.order.last_error_code ?? '-'}</dd><dt className="text-slate-500">웹훅</dt><dd>{detail.webhooks.length ? detail.webhooks.map((event:any)=>`${event.event_type} · ${event.status}`).join(', ') : '기록 없음'}</dd></dl></div></div>}
  </section>;
}
