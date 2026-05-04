'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslator } from '@/app/providers/I18nProvider';
import { toast } from 'sonner';
import { RefreshCw, X, ExternalLink, Copy } from 'lucide-react';
import { buildTrialInviteMessageTemplate } from '@/app/lib/spokeduProTrialInviteMessage';

type LeadStatus = 'new' | 'contacted' | 'trial_invited' | 'trial_started' | 'converted' | 'lost';

export type SpokeduProLeadRow = {
  id: string;
  created_at: string;
  dojo_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  region: string;
  interested_plan: string;
  has_kids_class: string;
  has_screen_equipment: string;
  website_url: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  meta: Record<string, unknown> | null;
  admin_note: string | null;
  contacted_at: string | null;
  trial_started_at: string | null;
  converted_at: string | null;
  updated_at: string | null;
};

const STATUSES: LeadStatus[] = ['new', 'contacted', 'trial_invited', 'trial_started', 'converted', 'lost'];

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: '신규',
  contacted: '연락 완료',
  trial_invited: '체험 승인',
  trial_started: '체험 시작',
  converted: '결제 전환',
  lost: '보류/이탈',
};

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-slate-600/90 text-white border border-slate-500/50',
  contacted: 'bg-amber-600/90 text-amber-50 border border-amber-400/40',
  trial_invited: 'bg-sky-600/90 text-sky-50 border border-sky-400/40',
  trial_started: 'bg-violet-600/90 text-violet-50 border border-violet-400/40',
  converted: 'bg-emerald-600/90 text-emerald-50 border border-emerald-400/40',
  lost: 'bg-slate-700/90 text-slate-300 border border-slate-600/60',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function metaTrialString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const v = meta[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function hasTrialTrackingMeta(meta: Record<string, unknown> | null | undefined): boolean {
  return (
    Boolean(metaTrialString(meta, 'trialApprovedAt')) ||
    Boolean(metaTrialString(meta, 'trialStartedAt')) ||
    Boolean(metaTrialString(meta, 'trialEndAt')) ||
    Boolean(metaTrialString(meta, 'centerId')) ||
    Boolean(metaTrialString(meta, 'userId')) ||
    Boolean(metaTrialString(meta, 'bootstrapSource'))
  );
}

function formatMetaIsoOrRaw(value: string | null): string {
  if (!value) return '—';
  const t = Date.parse(value);
  if (!Number.isNaN(t)) return formatDate(value);
  return value;
}

function entryLabel(meta: Record<string, unknown> | null): string {
  const e = meta && typeof meta.entry === 'string' ? meta.entry : '';
  if (e === 'inquiry') return '도입 문의';
  return '베타 신청';
}

function getTrialInviteTemplateText(lead: SpokeduProLeadRow): string {
  const fromMeta = lead.meta && typeof lead.meta.trialMessageTemplate === 'string' ? lead.meta.trialMessageTemplate : '';
  if (fromMeta.trim()) return fromMeta;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://spokedu.co.kr';
  return buildTrialInviteMessageTemplate(
    { contact_name: lead.contact_name, email: lead.email },
    origin
  );
}

function leadOriginBase(): string {
  const o = typeof window !== 'undefined' ? window.location.origin : 'https://spokedu.co.kr';
  return o.replace(/\/$/, '');
}

/** 베타 운영용 복사 문구(approve-trial messageTemplate과 별도). */
function buildBetaOperationsMessages(lead: SpokeduProLeadRow): { key: string; title: string; body: string }[] {
  const name = (lead.contact_name ?? '').trim() || '관장님';
  const email = (lead.email ?? '').trim() || '(이메일 미입력)';
  const dojo = (lead.dojo_name ?? '').trim() || '도장';
  const plan = (lead.interested_plan ?? '').trim() || '관심 플랜 미정';
  const source = (lead.source ?? '').trim() || '—';
  const origin = leadOriginBase();

  return [
    {
      key: 'approve',
      title: '체험 승인 안내',
      body: `안녕하세요, ${name}님 (${dojo}).
SPOKEDU PRO 14일 프리미엄 체험이 승인되었습니다.

· 로그인 이메일: ${email} (신청 시와 동일한 계정으로 로그인해 주세요)
· PRO 대시보드: ${origin}/spokedu-pro
· PRO 소개: ${origin}/pro

관심 플랜(참고): ${plan}
신청 경로: ${source}

로그인 후 안내에 따라 설정을 마치시면 라이브러리·SPOMOVE 체험이 바로 열립니다.`,
    },
    {
      key: 'day1',
      title: 'Day 1 안내',
      body: `안녕하세요, ${name}님.

체험 첫날 안내드립니다.
1) ${origin}/spokedu-pro 에 접속해 ${email} 계정으로 로그인
2) 상단에서 프로그램 라이브러리 / SPOMOVE / 보조기능·리포트 순으로 둘러보기
3) 도장 설정·수업 맥락이 있다면 메모에 남겨 주시면 이후 상담에 반영하겠습니다.

문의: 회신 또는 PRO 내 안내 채널을 이용해 주세요.`,
    },
    {
      key: 'day4',
      title: 'Day 4 리마인드',
      body: `안녕하세요, ${name}님.

체험 4일차입니다. 잠깐만 점검 부탁드립니다.
· 라이브러리에서 실제 수업에 쓸 만한 프로그램을 2~3개 골라 보셨는지
· SPOMOVE를 한 번이라도 실행해 보셨는지
· ${dojo}에서 화면·인원 구성은 무리 없는지

PRO: ${origin}/spokedu-pro
피드백 주시면 남은 기간 활용에 도움 드리겠습니다.`,
    },
    {
      key: 'day10',
      title: 'Day 10 리마인드',
      body: `안녕하세요, ${name}님.

체험이 약 4일 남았습니다 (${dojo}).
· 아직 SPOMOVE·라이브러리를 충분히 보지 못하셨다면 오늘 한 번씩만이라도 둘러봐 주세요.
· 도입 검토를 위해 궁금한 점을 정리해 두시면 종료 전 상담 시 빠르게 답 드릴 수 있습니다.

접속: ${origin}/spokedu-pro`,
    },
    {
      key: 'preclose',
      title: '종료 전 전환 안내',
      body: `안녕하세요, ${name}님.

14일 체험이 곧 종료됩니다. 도입을 원하시면 체험 종료 전에 결제·플랜 선택을 완료해 주시면 끊김 없이 이어집니다.
· PRO 소개·요금: ${origin}/pro
· PRO 사용: ${origin}/spokedu-pro

관심 플랜(참고): ${plan}
미전환 시 체험 종료일 이후 PRO 기능은 제한될 수 있습니다. 일정 조율이 필요하면 회신 부탁드립니다.`,
    },
    {
      key: 'questions',
      title: '상담 질문',
      body: `(${dojo} / ${name}님 기준 상담 체크리스트 — 복사 후 필요 없는 항목은 삭제해 사용하세요)

1) 주당 놀이체육·단체 수업은 대략 몇 회인가요?
2) TV·빔·태블릿 등 화면 연결은 어떤 방식으로 쓰고 계신가요?
3) SPOMOVE(반응·움직임)와 라이브러리(프로그램 뱅크) 중 어떤 축이 더 급한가요?
4) 유아부·초등부 비중과 인원대는 어떻게 되나요? (신청서: ${lead.has_kids_class})
5) 체험 기간 중 가장 유용했던 화면/기능과, 아쉬웠던 점이 있나요?
6) 결제·세금계산서·계약서 발급 일정에 제약이 있나요?

신청 이메일: ${email}
신청 경로: ${source}`,
    },
  ];
}

function canShowApproveTrialButton(lead: SpokeduProLeadRow): boolean {
  const em = typeof lead.email === 'string' ? lead.email.trim() : '';
  if (!em) return false;
  if (lead.status === 'converted' || lead.status === 'trial_started' || lead.status === 'trial_invited') return false;
  return lead.status === 'new' || lead.status === 'contacted';
}

function showTrialInviteMessageBlock(lead: SpokeduProLeadRow): boolean {
  if (lead.status === 'trial_invited') return true;
  const m = lead.meta && typeof lead.meta.trialMessageTemplate === 'string' ? lead.meta.trialMessageTemplate : '';
  return m.trim().length > 0;
}

export default function AdminSpokeduProLeadsPage() {
  const t = useTranslator();
  const [leads, setLeads] = useState<SpokeduProLeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [selected, setSelected] = useState<SpokeduProLeadRow | null>(null);
  const [draftStatus, setDraftStatus] = useState<LeadStatus>('new');
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [inviteTemplateText, setInviteTemplateText] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  useEffect(() => {
    const tmr = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(tmr);
  }, [q]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', '0');
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('interestedPlan', planFilter);
      if (qDebounced) params.set('q', qDebounced);
      const res = await fetch(`/api/admin/spokedu-pro/leads?${params.toString()}`, { credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        leads?: SpokeduProLeadRow[];
        total?: number;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.leads)) {
        setLoadError(true);
        setLeads([]);
        setTotal(0);
        return;
      }
      setLeads(data.leads);
      setTotal(typeof data.total === 'number' ? data.total : data.leads.length);
    } catch {
      setLoadError(true);
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, planFilter, qDebounced]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const openDrawer = useCallback((row: SpokeduProLeadRow) => {
    setSelected(row);
    setDraftStatus(row.status);
    setDraftNote(row.admin_note ?? '');
    setDrawerError(null);
  }, []);

  useEffect(() => {
    if (!selected) {
      setInviteTemplateText('');
      return;
    }
    setInviteTemplateText(getTrialInviteTemplateText(selected));
  }, [selected]);

  const closeDrawer = useCallback(() => {
    setSelected(null);
    setDrawerError(null);
    setInviteTemplateText('');
  }, []);

  const copyInviteTemplate = useCallback(async () => {
    const text = inviteTemplateText.trim() || (selected ? getTrialInviteTemplateText(selected) : '');
    if (!text) {
      toast.error('복사할 내용이 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('메시지를 복사했습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }, [inviteTemplateText, selected]);

  const copyBetaOpsMessage = useCallback(async (body: string, title: string) => {
    const text = body.trim();
    if (!text) {
      toast.error('복사할 내용이 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`「${title}」 문구를 복사했습니다.`);
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }, []);

  const approveTrial = useCallback(async () => {
    if (!selected) return;
    if (!window.confirm('이 리드에 대해 14일 프리미엄 체험을 승인할까요?')) return;
    setApproveLoading(true);
    try {
      const res = await fetch(`/api/admin/spokedu-pro/leads/${selected.id}/approve-trial`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        lead?: SpokeduProLeadRow;
        messageTemplate?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.lead) {
        toast.error('체험 승인에 실패했습니다. 사유를 확인해 주세요.');
        return;
      }
      toast.success('14일 프리미엄 체험이 승인되었습니다.');
      const updated = data.lead;
      setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelected(updated);
      setDraftStatus(updated.status);
      if (typeof data.messageTemplate === 'string' && data.messageTemplate.trim()) {
        setInviteTemplateText(data.messageTemplate);
      }
    } catch {
      toast.error('체험 승인에 실패했습니다. 사유를 확인해 주세요.');
    } finally {
      setApproveLoading(false);
    }
  }, [selected]);

  const saveDrawer = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    setDrawerError(null);
    try {
      const res = await fetch('/api/admin/spokedu-pro/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: selected.id,
          status: draftStatus,
          adminNote: draftNote,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; lead?: SpokeduProLeadRow; error?: string };
      if (!res.ok || !data.ok || !data.lead) {
        setDrawerError('저장에 실패했습니다.');
        return;
      }
      const updated = data.lead;
      setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelected(updated);
      setDraftStatus(updated.status);
      setDraftNote(updated.admin_note ?? '');
    } catch {
      setDrawerError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [selected, draftStatus, draftNote]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-950 text-slate-100">
      <div className="flex-shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">SPOKEDU PRO</p>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">SPOKEDU PRO 리드 관리</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              베타 관장단 신청과 도입 문의를 확인하고 상담 상태를 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/spokedu-pro"
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              ← 스포키듀 구독
            </Link>
            <button
              type="button"
              onClick={() => void fetchLeads()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('새로고침')}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[140px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">상태</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
            >
              <option value="">전체</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-[10px] font-bold uppercase text-slate-500">관심 플랜</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
            >
              <option value="">전체</option>
              {['Library', 'All-in-One', 'SPOMOVE 단독', '아직 모르겠음'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <label className="text-[10px] font-bold uppercase text-slate-500">검색</label>
            <input
              type="search"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
              placeholder="도장명, 담당자, 연락처, 이메일 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {loadError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-4 text-sm text-rose-200">
            리드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            불러오는 중…
          </div>
        ) : leads.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
            아직 접수된 신청이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3">신청일</th>
                  <th className="px-3 py-3">도장명</th>
                  <th className="px-3 py-3">담당자</th>
                  <th className="px-3 py-3">연락처</th>
                  <th className="px-3 py-3">이메일</th>
                  <th className="px-3 py-3">지역</th>
                  <th className="px-3 py-3">관심 플랜</th>
                  <th className="px-3 py-3">유아·초등부</th>
                  <th className="px-3 py-3">화면 장비</th>
                  <th className="px-3 py-3">문의 유형</th>
                  <th className="px-3 py-3">상태</th>
                  <th className="px-3 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/90 hover:bg-slate-900/40">
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-white">{row.dojo_name}</td>
                    <td className="px-3 py-2.5 text-slate-300">{row.contact_name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{row.phone}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-300" title={row.email ?? ''}>
                      {row.email?.trim() ? row.email : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{row.region}</td>
                    <td className="px-3 py-2.5 text-slate-300">{row.interested_plan}</td>
                    <td className="px-3 py-2.5 text-slate-400">{row.has_kids_class}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-400" title={row.has_screen_equipment}>
                      {row.has_screen_equipment}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{entryLabel(row.meta)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                          STATUS_BADGE[row.status as LeadStatus] ?? STATUS_BADGE.new
                        }`}
                      >
                        {STATUS_LABEL[row.status as LeadStatus] ?? row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openDrawer(row)}
                        className="rounded-lg bg-cyan-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500"
                      >
                        관리
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
              총 {total}건 · 표시 {leads.length}건
            </p>
          </div>
        )}
      </div>

      {selected ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60"
            aria-label="닫기"
            onClick={closeDrawer}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-lg font-black text-white">리드 관리</h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm">
              <dl className="space-y-2 text-slate-300">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">도장명</dt>
                  <dd className="font-semibold text-white">{selected.dojo_name}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-slate-500">담당자</dt>
                    <dd>{selected.contact_name}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-slate-500">연락처</dt>
                    <dd>{selected.phone}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">이메일</dt>
                  <dd className="break-all font-medium text-cyan-200">{selected.email?.trim() ? selected.email : '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">지역</dt>
                  <dd>{selected.region}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-slate-500">관심 플랜</dt>
                    <dd>{selected.interested_plan}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-slate-500">문의 유형</dt>
                    <dd>{entryLabel(selected.meta)}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">유아·초등부</dt>
                  <dd>{selected.has_kids_class}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">화면 장비</dt>
                  <dd>{selected.has_screen_equipment}</dd>
                </div>
                {selected.website_url ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-slate-500">인스타 / 홈페이지</dt>
                    <dd>
                      <a
                        href={selected.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:underline"
                      >
                        {selected.website_url}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">문의 내용</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-slate-300">
                    {selected.message?.trim() ? selected.message : '—'}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>연락: {formatDate(selected.contacted_at)}</div>
                  <div>체험: {formatDate(selected.trial_started_at)}</div>
                  <div>전환: {formatDate(selected.converted_at)}</div>
                  <div>수정: {formatDate(selected.updated_at)}</div>
                </div>
              </dl>

              {selected && hasTrialTrackingMeta(selected.meta) ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">체험·연결 정보</p>
                  <dl className="space-y-2 text-xs text-slate-300">
                    {metaTrialString(selected.meta, 'trialApprovedAt') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">체험 승인일</dt>
                        <dd className="font-mono text-[11px] text-slate-200">
                          {formatMetaIsoOrRaw(metaTrialString(selected.meta, 'trialApprovedAt'))}
                        </dd>
                      </div>
                    ) : null}
                    {metaTrialString(selected.meta, 'trialStartedAt') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">체험 시작일</dt>
                        <dd className="font-mono text-[11px] text-slate-200">
                          {formatMetaIsoOrRaw(metaTrialString(selected.meta, 'trialStartedAt'))}
                        </dd>
                      </div>
                    ) : null}
                    {metaTrialString(selected.meta, 'trialEndAt') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">체험 종료일</dt>
                        <dd className="font-mono text-[11px] text-slate-200">
                          {formatMetaIsoOrRaw(metaTrialString(selected.meta, 'trialEndAt'))}
                        </dd>
                      </div>
                    ) : null}
                    {metaTrialString(selected.meta, 'centerId') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">연결 센터 ID</dt>
                        <dd className="break-all font-mono text-[11px] text-slate-200">
                          {metaTrialString(selected.meta, 'centerId')}
                        </dd>
                      </div>
                    ) : null}
                    {metaTrialString(selected.meta, 'userId') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">연결 사용자 ID</dt>
                        <dd className="break-all font-mono text-[11px] text-slate-200">
                          {metaTrialString(selected.meta, 'userId')}
                        </dd>
                      </div>
                    ) : null}
                    {metaTrialString(selected.meta, 'bootstrapSource') ? (
                      <div>
                        <dt className="text-[10px] font-bold uppercase text-slate-500">시작 방식</dt>
                        <dd className="break-all font-mono text-[11px] text-slate-200">
                          {metaTrialString(selected.meta, 'bootstrapSource')}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {selected && showTrialInviteMessageBlock(selected) ? (
                <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase text-sky-400">체험 안내 메시지</p>
                    <button
                      type="button"
                      onClick={() => void copyInviteTemplate()}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-600/50 bg-sky-900/40 px-2.5 py-1 text-[11px] font-bold text-sky-100 hover:bg-sky-800/50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      복사
                    </button>
                  </div>
                  <textarea
                    readOnly
                    className="min-h-[200px] w-full resize-y rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs leading-relaxed text-slate-200"
                    value={inviteTemplateText}
                  />
                </div>
              ) : null}

              {selected ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-amber-400">베타 운영 메시지</p>
                  <p className="text-[11px] leading-snug text-slate-500">
                    승인 직후·Day 리마인드·전환 안내용입니다. 위「체험 안내 메시지」와 별도이며, 담당자명·도장명·이메일·접속
                    URL·신청 경로가 반영됩니다.
                  </p>
                  <div className="space-y-1.5">
                    {buildBetaOperationsMessages(selected).map((item) => (
                      <details
                        key={item.key}
                        className="group rounded-lg border border-slate-800 bg-slate-900/70 open:border-amber-600/35"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-2 text-xs font-bold text-slate-100 [&::-webkit-details-marker]:hidden">
                          <span className="min-w-0 flex-1">{item.title}</span>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void copyBetaOpsMessage(item.body, item.title)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-700/50 bg-amber-950/40 px-2 py-1 text-[10px] font-bold text-amber-100 hover:bg-amber-900/50"
                          >
                            <Copy className="h-3 w-3" />
                            복사
                          </button>
                        </summary>
                        <div className="border-t border-slate-800 px-2 pb-2 pt-2">
                          <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-slate-300">
                            {item.body}
                          </pre>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected && canShowApproveTrialButton(selected) ? (
                <button
                  type="button"
                  disabled={approveLoading}
                  onClick={() => void approveTrial()}
                  className="w-full rounded-xl border border-sky-500/40 bg-sky-700/80 py-3 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {approveLoading ? '처리 중…' : '14일 체험 승인'}
                </button>
              ) : null}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">상태</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as LeadStatus)}
                  style={{ colorScheme: 'dark' }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">관리자 메모</label>
                <textarea
                  className="mt-1 min-h-[120px] w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="상담 메모를 입력하세요."
                  maxLength={8000}
                />
              </div>

              {drawerError ? <p className="text-sm text-rose-400">{drawerError}</p> : null}

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDrawer()}
                className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
