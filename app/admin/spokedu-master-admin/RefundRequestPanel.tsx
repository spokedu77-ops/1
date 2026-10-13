'use client';

import { useState } from 'react';
import { AlertTriangle, FileSearch, X } from 'lucide-react';

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
};

const money = (value: number) => `${value.toLocaleString()}원`;
const when = (value: string) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
const statusLabel: Record<RefundRequestRow['status'], string> = { received: '접수', under_review: '검토 중', approved: '내부 승인', rejected: '반려', follow_up_pending: '후속 처리 대기', completed: '처리 완료', cancelled: '취소' };

export function RefundRequestPanel({ availability, rows, total, page, pageSize, onSelectMember, query = '', status = 'all', onQueryChange, onStatusChange, onPageChange }: Props) {
  const [detail, setDetail] = useState<RefundRequestRow | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="환불 요청 관리">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileSearch size={18} className="text-blue-700"/><h3 className="font-black text-slate-950">환불 요청 관리</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">내부 승인과 실제 PG 환불 완료는 별도 상태입니다. 이 화면에서 금전 변경은 실행하지 않습니다.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">읽기 전용 시안</span></div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input aria-label="환불 요청 검색" value={query} onChange={(event)=>onQueryChange?.(event.target.value)} disabled={availability !== 'available'} placeholder="고객명·이메일·주문 ID 검색" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-50"/><select aria-label="환불 요청 상태" value={status} onChange={(event)=>onStatusChange?.(event.target.value as RefundRequestRow['status'] | 'all')} disabled={availability !== 'available'} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-50"><option value="all">전체 상태</option>{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    {availability === 'schema_pending' && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="shrink-0" size={18}/><p><b>집계 준비 중</b><br/>환불 정책, 승인자 권한, DB 마이그레이션이 승인되기 전에는 요청을 저장하거나 승인할 수 없습니다.</p></div>}
    {availability === 'error' && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">환불 요청을 불러오지 못했습니다 · 다시 시도</div>}
    {availability === 'available' && !rows.length && <div className="mt-4 p-8 text-center text-sm text-slate-500">접수된 환불 요청이 없습니다. · 0건</div>}
    {availability === 'available' && rows.length > 0 && <><div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="text-xs text-slate-500"><tr>{['접수일','고객','주문 ID','결제 금액','요청 금액','요청 사유','검토 상태','담당자','상세'].map((label)=><th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.id} className="border-b border-slate-100 align-top"><td className="p-3">{when(row.requestedAt)}</td><td className="p-3"><button type="button" onClick={()=>onSelectMember(row.customer.userId)} className="font-bold text-blue-700">{row.customer.name || '이름 없음'}</button><span className="block break-all text-xs text-slate-500">{row.customer.email || '-'}</span></td><td className="break-all p-3 font-mono text-xs">{row.orderId}</td><td className="p-3">{money(row.originalAmount)}</td><td className="p-3 font-bold">{money(row.requestedAmount)}</td><td className="max-w-[220px] break-words p-3">{row.reason}</td><td className="p-3">{statusLabel[row.status]}</td><td className="break-all p-3">{row.reviewer || '기록 없음'}</td><td className="p-3"><button type="button" onClick={()=>setDetail(row)} className="min-h-10 rounded-lg border px-3 font-bold">상세 보기</button></td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 md:hidden">{rows.map((row)=><article key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={()=>onSelectMember(row.customer.userId)} className="min-w-0 break-words text-left font-bold text-blue-700">{row.customer.name || row.customer.email || '이름 없음'}</button><span className="shrink-0 text-xs font-bold">{statusLabel[row.status]}</span></div><p className="mt-2 break-all font-mono text-xs text-slate-500">{row.orderId}</p><p className="mt-3 text-sm">{money(row.originalAmount)} 중 <b>{money(row.requestedAmount)}</b></p><p className="mt-1 break-words text-sm text-slate-600">{row.reason}</p><button type="button" onClick={()=>setDetail(row)} className="mt-3 min-h-11 w-full rounded-lg border font-bold">상세 보기</button></article>)}</div><div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500"><span>총 {total}건 · {page}/{pageCount}페이지</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={()=>onPageChange?.(page - 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">이전</button><button type="button" disabled={page >= pageCount} onClick={()=>onPageChange?.(page + 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-40">다음</button></div></div></>}
    {detail && <div className="fixed inset-0 z-[560] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="환불 요청 상세"><div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-700">환불 요청 상세</p><h4 className="mt-1 break-all font-mono text-sm font-black">{detail.orderId}</h4></div><button type="button" onClick={()=>setDetail(null)} aria-label="환불 요청 상세 닫기" className="grid min-h-11 min-w-11 place-items-center rounded-lg border"><X size={18}/></button></div><dl className="mt-5 grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm"><dt className="text-slate-500">업무 상태</dt><dd className="font-bold">{statusLabel[detail.status]}</dd><dt className="text-slate-500">환불 구분</dt><dd>{detail.refundType === 'full' ? '전액' : '부분'}</dd><dt className="text-slate-500">금액</dt><dd>{money(detail.originalAmount)} 중 {money(detail.requestedAmount)}</dd><dt className="text-slate-500">PG 근거</dt><dd>{detail.providerEvidence === 'verified' ? '확인됨' : '추가 확인 필요'}</dd><dt className="text-slate-500">권한 반영</dt><dd>{detail.entitlementApplied ? '기존 반영 기록 있음' : '반영 기록 없음'}</dd><dt className="text-slate-500">요청 사유</dt><dd className="break-words">{detail.reason}</dd><dt className="text-slate-500">검토 의견</dt><dd className="break-words">{detail.reviewNote || '기록 없음'}</dd></dl><div className="mt-6 border-t pt-4"><h5 className="font-bold">승인·반려 이력</h5>{detail.events.length ? <div className="mt-2 divide-y">{detail.events.map((event)=><div key={event.id} className="py-3 text-sm"><b>{when(event.at)} · {event.type}</b><p className="mt-1 break-words text-slate-500">{event.from || '최초'} → {event.to} · {event.actor || '기록 없음'} · {event.reason || '기록 없음'}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">기록 없음</p>}</div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">실제 환불 실행 기능은 Product Decision과 권한 정책 승인 후 별도로 구현합니다.</p></div></div>}
  </section>;
}
