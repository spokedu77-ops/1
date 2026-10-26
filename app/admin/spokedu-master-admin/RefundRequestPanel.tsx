'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileSearch, Loader2, X } from 'lucide-react';

export type RefundRequestRow = {
  id: string;
  requestedAt: string;
  customer: { userId: string; name: string | null; email: string | null };
  orderId: string;
  originalAmount: number;
  requestedAmount: number;
  refundType: 'full' | 'partial';
  reason: string;
  status: 'received' | 'under_review' | 'approved' | 'rejected' | 'follow_up_pending' | 'completed' | 'cancelled';
  requester: string | null;
  reviewer: string | null;
  reviewNote: string | null;
  providerEvidence: 'unverified' | 'verified' | 'unavailable' | 'conflict';
  entitlementApplied: boolean;
  events: Array<{ id: string; at: string; type: string; actor: string | null; from: string | null; to: string; reason: string | null }>;
};

export type RefundCreatePayload = {
  orderId: string;
  userId: string;
  requestedAmount: number;
  refundType: 'full' | 'partial';
  reason: string;
  idempotencyKey: string;
};

export type RefundTransitionPayload = {
  requestId: string;
  expectedStatus: RefundRequestRow['status'];
  action: 'start_review' | 'approve' | 'reject' | 'cancel' | 'add_note' | 'mark_follow_up' | 'complete' | 'pg_attempt_failed';
  reviewNote?: string;
};

type Props = {
  availability: 'schema_pending' | 'available' | 'error';
  rows: RefundRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  onSelectMember: (userId: string) => void;
  query?: string;
  status?: RefundRequestRow['status'] | 'all';
  onQueryChange?: (value: string) => void;
  onStatusChange?: (value: RefundRequestRow['status'] | 'all') => void;
  onPageChange?: (page: number) => void;
  createSeed?: { orderId: string; userId: string; amount: number } | null;
  onCreateRequest?: (payload: RefundCreatePayload) => Promise<{ ok: boolean; error?: string }>;
  onTransition?: (payload: RefundTransitionPayload) => Promise<{ ok: boolean; error?: string }>;
  busy?: boolean;
  actionMessage?: string | null;
};

const money = (value: number) => `${value.toLocaleString()}원`;
const when = (value: string) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
const statusLabel: Record<RefundRequestRow['status'], string> = { received: '접수', under_review: '검토 중', approved: '내부 승인', rejected: '반려', follow_up_pending: '후속 처리 대기', completed: '내부 처리 완료', cancelled: '취소' };

export function RefundRequestPanel({
  availability,
  rows,
  total,
  page,
  pageSize,
  onSelectMember,
  query = '',
  status = 'all',
  onQueryChange,
  onStatusChange,
  onPageChange,
  createSeed = null,
  onCreateRequest,
  onTransition,
  busy = false,
  actionMessage = null,
}: Props) {
  const [detail, setDetail] = useState<RefundRequestRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [createOrderId, setCreateOrderId] = useState('');
  const [createUserId, setCreateUserId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createRefundType, setCreateRefundType] = useState<'full' | 'partial'>('full');
  const [createReason, setCreateReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!createSeed) return;
    setCreateOrderId(createSeed.orderId);
    setCreateUserId(createSeed.userId);
    setCreateAmount(String(createSeed.amount));
    setCreateRefundType('full');
  }, [createSeed]);

  useEffect(() => {
    setReviewNote(detail?.reviewNote ?? '');
  }, [detail]);

  const submitCreate = async () => {
    if (!onCreateRequest) return;
    setLocalError(null);
    const requestedAmount = Number(createAmount);
    if (!createOrderId.trim() || !createUserId.trim() || !createReason.trim() || !Number.isInteger(requestedAmount) || requestedAmount <= 0) {
      setLocalError('주문 ID, 회원 ID, 금액, 사유를 확인해 주세요.');
      return;
    }
    const result = await onCreateRequest({
      orderId: createOrderId.trim(),
      userId: createUserId.trim(),
      requestedAmount,
      refundType: createRefundType,
      reason: createReason.trim(),
      idempotencyKey: `refund-${createOrderId.trim()}-${requestedAmount}-${Date.now()}`,
    });
    if (!result.ok) {
      setLocalError(result.error ?? '환불 요청 접수에 실패했습니다.');
      return;
    }
    setCreateReason('');
  };

  const runTransition = async (action: RefundTransitionPayload['action']) => {
    if (!detail || !onTransition) return;
    setLocalError(null);
    const result = await onTransition({
      requestId: detail.id,
      expectedStatus: detail.status,
      action,
      reviewNote: reviewNote.trim() || undefined,
    });
    if (!result.ok) {
      setLocalError(result.error ?? '상태 변경에 실패했습니다.');
      return;
    }
    setDetail(null);
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="환불 요청 관리">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileSearch size={18} className="text-blue-700"/><h3 className="font-black text-slate-950">환불 요청 관리</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">내부 접수·검토·승인 기록을 관리합니다. 실제 PG 환불·구독 권한 변경은 이 화면에서 실행하지 않습니다.</p></div>{availability === 'available' ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">업무 처리</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">집계 준비</span>}</div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input aria-label="환불 요청 검색" value={query} onChange={(event)=>onQueryChange?.(event.target.value)} disabled={availability !== 'available'} placeholder="고객명·이메일·주문 ID 검색" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-50"/><select aria-label="환불 요청 상태" value={status} onChange={(event)=>onStatusChange?.(event.target.value as RefundRequestRow['status'] | 'all')} disabled={availability !== 'available'} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-50"><option value="all">전체 상태</option>{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    {availability === 'schema_pending' && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="shrink-0" size={18}/><p><b>DB 마이그레이션 대기</b><br/>환불 요청 테이블이 Supabase에 적용되면 접수·검토·승인 기록을 저장할 수 있습니다.</p></div>}
    {availability === 'error' && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">환불 요청을 불러오지 못했습니다 · 다시 시도</div>}
    {(localError || actionMessage) && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{localError ?? actionMessage}</div>}
    {availability === 'available' && onCreateRequest && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">환불 요청 등록</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label="주문 ID" value={createOrderId} onChange={(e)=>setCreateOrderId(e.target.value)} placeholder="주문 ID" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"/><input aria-label="회원 user ID" value={createUserId} onChange={(e)=>setCreateUserId(e.target.value)} placeholder="회원 user ID" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"/><input aria-label="요청 금액" value={createAmount} onChange={(e)=>setCreateAmount(e.target.value)} placeholder="요청 금액(원)" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"/><select aria-label="환불 구분" value={createRefundType} onChange={(e)=>setCreateRefundType(e.target.value as 'full' | 'partial')} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="full">전액</option><option value="partial">부분</option></select></div><textarea aria-label="요청 사유" value={createReason} onChange={(e)=>setCreateReason(e.target.value)} placeholder="요청 사유" className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/><button type="button" disabled={busy} onClick={()=>void submitCreate()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : null}요청 접수</button></div>}
    {availability === 'available' && !rows.length && <div className="mt-4 p-8 text-center text-sm text-slate-500">접수된 환불 요청이 없습니다. · 0건</div>}
    {availability === 'available' && rows.length > 0 && <><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="text-xs text-slate-500"><tr>{['접수일','고객','주문 ID','결제 금액','요청 금액','요청 사유','검토 상태','담당자','상세'].map((label)=><th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.id} className="border-b border-slate-100 align-top"><td className="p-3">{when(row.requestedAt)}</td><td className="p-3"><button type="button" onClick={()=>onSelectMember(row.customer.userId)} className="font-bold text-blue-700">{row.customer.name || '이름 없음'}</button><span className="block break-all text-xs text-slate-500">{row.customer.email || '-'}</span></td><td className="break-all p-3 font-mono text-xs">{row.orderId}</td><td className="p-3">{money(row.originalAmount)}</td><td className="p-3 font-bold">{money(row.requestedAmount)}</td><td className="max-w-[220px] break-words p-3">{row.reason}</td><td className="p-3">{statusLabel[row.status]}</td><td className="break-all p-3">{row.reviewer || '기록 없음'}</td><td className="p-3"><button type="button" onClick={()=>setDetail(row)} className="min-h-10 rounded-lg border px-3 font-bold">상세·처리</button></td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 md:hidden">{rows.map((row)=><article key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={()=>onSelectMember(row.customer.userId)} className="min-w-0 break-words text-left font-bold text-blue-700">{row.customer.name || row.customer.email || '이름 없음'}</button><span className="shrink-0 text-xs font-bold">{statusLabel[row.status]}</span></div><p className="mt-2 break-all font-mono text-xs text-slate-500">{row.orderId}</p><p className="mt-3 text-sm">{money(row.originalAmount)} 중 <b>{money(row.requestedAmount)}</b></p><p className="mt-1 break-words text-sm text-slate-600">{row.reason}</p><button type="button" onClick={()=>setDetail(row)} className="mt-3 min-h-11 w-full rounded-lg border font-bold">상세·처리</button></article>)}</div><div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500"><span>총 {total}건 · {page}/{pageCount}페이지</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={()=>onPageChange?.(page - 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">이전</button><button type="button" disabled={page >= pageCount} onClick={()=>onPageChange?.(page + 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">다음</button></div></div></>}
    {detail && <div className="fixed inset-0 z-[560] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="환불 요청 상세"><div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-700">환불 요청 상세</p><h4 className="mt-1 break-all font-mono text-sm font-black">{detail.orderId}</h4></div><button type="button" onClick={()=>setDetail(null)} aria-label="환불 요청 상세 닫기" className="grid min-h-11 min-w-11 place-items-center rounded-lg border"><X size={18}/></button></div><dl className="mt-5 grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm"><dt className="text-slate-500">업무 상태</dt><dd className="font-bold">{statusLabel[detail.status]}</dd><dt className="text-slate-500">환불 구분</dt><dd>{detail.refundType === 'full' ? '전액' : '부분'}</dd><dt className="text-slate-500">금액</dt><dd>{money(detail.originalAmount)} 중 {money(detail.requestedAmount)}</dd><dt className="text-slate-500">PG 근거</dt><dd>{detail.providerEvidence === 'verified' ? '확인됨' : '추가 확인 필요'}</dd><dt className="text-slate-500">권한 반영</dt><dd>{detail.entitlementApplied ? '기존 반영 기록 있음' : '반영 기록 없음'}</dd><dt className="text-slate-500">요청 사유</dt><dd className="break-words">{detail.reason}</dd></dl><label className="mt-4 block text-sm font-bold text-slate-700">검토 의견<textarea value={reviewNote} onChange={(e)=>setReviewNote(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="검토·승인·반려 사유"/></label>{onTransition && <div className="mt-4 flex flex-wrap gap-2">{detail.status === 'received' && <button type="button" disabled={busy} onClick={()=>void runTransition('start_review')} className="min-h-10 rounded-lg border px-3 text-sm font-bold">검토 시작</button>}{['received','under_review'].includes(detail.status) && <><button type="button" disabled={busy} onClick={()=>void runTransition('approve')} className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white">내부 승인</button><button type="button" disabled={busy} onClick={()=>void runTransition('reject')} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white">반려</button><button type="button" disabled={busy} onClick={()=>void runTransition('cancel')} className="min-h-10 rounded-lg border px-3 text-sm font-bold">접수 취소</button></>}{detail.status === 'approved' && <button type="button" disabled={busy} onClick={()=>void runTransition('mark_follow_up')} className="min-h-10 rounded-lg border px-3 text-sm font-bold">후속 처리 대기</button>}{detail.status === 'follow_up_pending' && <><button type="button" disabled={busy} onClick={()=>void runTransition('pg_attempt_failed')} className="min-h-10 rounded-lg border px-3 text-sm font-bold">PG Mock 실패 기록</button><button type="button" disabled={busy} onClick={()=>void runTransition('complete')} className="min-h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white">내부 처리 완료</button></>}{['under_review','received','approved'].includes(detail.status) && <button type="button" disabled={busy} onClick={()=>void runTransition('add_note')} className="min-h-10 rounded-lg border px-3 text-sm font-bold">의견만 저장</button>}</div>}<div className="mt-6 border-t pt-4"><h5 className="font-bold">승인·반려 이력</h5>{detail.events.length ? <div className="mt-2 divide-y">{detail.events.map((event)=><div key={event.id} className="py-3 text-sm"><b>{when(event.at)} · {event.type}</b><p className="mt-1 break-words text-slate-500">{event.from || '최초'} → {event.to} · {event.actor || '기록 없음'} · {event.reason || '기록 없음'}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">기록 없음</p>}</div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Toss PG 취소·구독 권한 재조정은 Product Decision 승인 후 별도 경로에서 활성화합니다.</p></div></div>}
  </section>;
}
