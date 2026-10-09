'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';

type Detail = {
  member: { id: string; email: string | null; name: string | null; created_at: string | null; account_type: string | null; onboarding_done: boolean | null };
  access: { effectivePlan: string; effectiveSource: string; promoStartsAt: string | null; promoEndsAt: string | null; fallbackPlan: string };
  grants: Array<{ id: string; plan: string; source: string; campaign_id: string | null; starts_at: string; ends_at: string; created_at: string; revoked_at: string | null; status: string; metadata?: { reason?: string; extension_history?: unknown[] } }>;
  subscription: Record<string, unknown> | null;
  orders: Array<{ id: string; plan: string | null; amount: number | null; status: string | null; updated_at: string | null; applied_at: string | null; payment_key?: string | null; last_error_code: string | null }>;
  billingIncident: { label: string; tone: string };
};

const formatDate = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value))
  : '-';
const planName = (plan: string | null | undefined) => plan === 'premium' || plan === 'team' ? 'Premium' : plan === 'lite' ? 'Lite' : 'Free';
const sourceName = (source: string) => source === 'billing' ? '유료 결제' : source === 'promotion' ? '증정 이용권' : '기본';
const statusName = (status: string) => ({ active: '활성', scheduled: '예정', expired: '만료', revoked: '회수' }[status] ?? status);

export function MemberDetailPanel({ detail, loading, error, onClose }: { detail: Detail | null; loading: boolean; error: string; onClose: () => void }) {
  if (!detail && !loading && !error) return null;
  return <aside className="fixed inset-0 z-[450] overflow-y-auto bg-white p-4 sm:p-6 lg:inset-y-0 lg:left-auto lg:w-[520px] lg:border-l lg:border-slate-200 lg:shadow-2xl" aria-label="회원 상세">
    <div className="mx-auto max-w-xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div><p className="text-xs font-bold text-blue-700">회원 상세</p><h2 className="mt-1 text-xl font-bold text-slate-950">{detail?.member.name || detail?.member.email || '회원 정보'}</h2></div>
        <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200" aria-label="회원 상세 닫기"><X size={18}/></button>
      </div>
      {loading && <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-blue-600"/></div>}
      {error && <div className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle size={18}/>{error}</div>}
      {detail && !loading && <div className="space-y-8 py-6">
        <Section title="기본 정보"><Facts rows={[
          ['이름', detail.member.name || '-'], ['이메일', detail.member.email || '-'], ['회원 ID', detail.member.id],
          ['가입일', formatDate(detail.member.created_at)], ['계정 유형', detail.member.account_type === 'institution' ? '기관' : '개인'],
          ['초기 설정', detail.member.onboarding_done ? '완료' : '미완료'],
        ]}/></Section>
        <Section title="현재 이용 권한"><Facts rows={[
          ['현재 플랜', planName(detail.access.effectivePlan)], ['권한 출처', sourceName(detail.access.effectiveSource)],
          ['시작일', formatDate(detail.access.promoStartsAt)], ['종료일', formatDate(detail.access.promoEndsAt)],
          ['만료 후 예상', planName(detail.access.fallbackPlan)],
        ]}/></Section>
        <Section title="증정 이용권"><div className="space-y-3">{detail.grants.length ? detail.grants.map((grant) => <article key={grant.id} className="rounded-xl border border-slate-200 p-4 text-sm"><div className="flex justify-between gap-3"><b>{planName(grant.plan)}</b><span>{statusName(grant.status)}</span></div><p className="mt-2 text-slate-500">{formatDate(grant.starts_at)} → {formatDate(grant.ends_at)}</p><p className="mt-1 break-words text-slate-500">사유: {grant.metadata?.reason || '기록 없음'} · 캠페인: {grant.campaign_id || '-'}</p></article>) : <Empty/>}</div></Section>
        <Section title="결제 구독"><Facts rows={[
          ['구독', detail.subscription ? String(detail.subscription.status ?? '확인 필요') : '없음'],
          ['결제 상태', detail.billingIncident.label], ['최근 주문', detail.orders[0]?.status || '없음'],
          ['승인 근거', detail.orders[0]?.payment_key ? '있음' : '없음'], ['최근 주문 시각', formatDate(detail.orders[0]?.updated_at)],
        ]}/></Section>
        <Section title="이용권 작업 이력"><div className="space-y-2">{detail.grants.length ? detail.grants.map((grant) => <div key={'history-'+grant.id} className="border-b border-slate-100 py-3 text-sm"><b>{formatDate(grant.created_at)} · {planName(grant.plan)} 지급</b><p className="mt-1 text-slate-500">{grant.revoked_at ? `회수 ${formatDate(grant.revoked_at)}` : statusName(grant.status)} · {grant.metadata?.reason || '사유 기록 없음'}</p></div>) : <Empty/>}</div></Section>
      </div>}
    </div>
  </aside>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-3 text-base font-bold text-slate-950">{title}</h3>{children}</section>; }
function Facts({ rows }: { rows: Array<[string, string]> }) { return <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{rows.map(([label,value]) => <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="break-words text-right font-semibold text-slate-900">{value}</dd></div>)}</dl>; }
function Empty() { return <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">기록이 없습니다.</p>; }
