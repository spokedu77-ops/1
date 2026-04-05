'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, ExternalLink, Loader2, RefreshCw, Search, Trash2, X } from 'lucide-react';

type LeadRow = {
  id: string;
  phone: string;
  child_name: string | null;
  age_group: string | null;
  profile_key: string | null;
  profile_title: string | null;
  consent: boolean;
  created_at: string;
};

export default function AdminMoveReportPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/move-report/leads', { credentials: 'include' });
      const json = (await res.json()) as { ok?: boolean; leads?: LeadRow[]; error?: string };
      if (!json.ok) {
        setError(json.error ?? '리드 데이터를 불러오지 못했습니다.');
        setRows([]);
        return;
      }
      setRows(json.leads ?? []);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const profileOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.profile_key) set.add(r.profile_key);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((r) => {
      if (ageFilter !== 'all' && (r.age_group ?? '') !== ageFilter) return false;
      if (profileFilter !== 'all' && (r.profile_key ?? '') !== profileFilter) return false;

      if (!q) return true;
      const haystack = [r.phone, r.child_name ?? '', r.age_group ?? '', r.profile_key ?? '', r.profile_title ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, ageFilter, profileFilter]);

  const copyToClipboard = async (text: string) => {
    const v = text.trim();
    if (!v) return false;
    try {
      await navigator.clipboard.writeText(v);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = v;
        ta.setAttribute('readonly', 'true');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const onCopyRowPhone = async (r: LeadRow) => {
    const ok = await copyToClipboard(r.phone);
    if (!ok) return;
    setCopiedId(r.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === r.id ? null : prev)), 1200);
  };

  const onCopySelectedPhone = async () => {
    if (!selected) return;
    const ok = await copyToClipboard(selected.phone);
    if (!ok) return;
    setCopiedPhone(selected.phone);
    window.setTimeout(() => setCopiedPhone((prev) => (prev === selected.phone ? null : prev)), 1200);
  };

  const onDeleteRow = async (row: LeadRow) => {
    const okToDelete = window.confirm(`이 리드를 삭제할까요?\n전화번호: ${row.phone}`);
    if (!okToDelete) return;
    setDeletingId(row.id);
    try {
      const res = await fetch('/api/admin/move-report/leads', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        window.alert(json.error ?? '삭제 중 오류가 발생했습니다.');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setSelected((prev) => (prev?.id === row.id ? null : prev));
    } catch {
      window.alert('네트워크 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const total = useMemo(() => rows.length, [rows]);

  const exportCsv = () => {
    const header = ['created_at', 'phone', 'child_name', 'age_group', 'profile_key', 'profile_title', 'consent'];
    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filteredRows.map((r) =>
        [
          new Date(r.created_at).toISOString(),
          r.phone,
          r.child_name ?? '',
          r.age_group ?? '',
          r.profile_key ?? '',
          r.profile_title ?? '',
          r.consent ? 'Y' : 'N',
        ]
          .map((v) => escapeCell(String(v)))
          .join(',')
      ),
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    a.href = url;
    a.download = `move_report_leads_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MOVE 리포트</h1>
            <p className="text-sm text-slate-500 mt-1">리드(전화번호) 목록 확인 및 리포트 테스트 진입</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="h-4 w-4" />
              CSV 다운로드
            </button>
            <Link
              href="/move-report"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              MOVE 리포트 새창 열기
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-500">검색</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="전화번호, 아이 이름, 프로필키"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">연령대</label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="all">전체</option>
                <option value="preschool">preschool</option>
                <option value="elementary">elementary</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">프로필키</label>
              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="all">전체</option>
                {profileOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3 text-xs text-slate-500">
          총 <span className="font-semibold text-slate-700">{total}</span>건
          {' · '}
          필터 결과 <span className="font-semibold text-slate-700">{filteredRows.length}</span>건
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-10 px-4 text-center text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-slate-500">저장된 리드가 없습니다.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">생성일</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">전화번호</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">아이 이름</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">연령대</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">프로필키</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">프로필명</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">동의</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">상세</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(r.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-800">{r.phone}</div>
                        <button
                          type="button"
                          onClick={() => void onCopyRowPhone(r)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {copiedId === r.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === r.id ? '복사됨' : '복사'}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.child_name ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.age_group ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.profile_key ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.profile_title ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.consent ? 'Y' : 'N'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void onDeleteRow(r)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === r.id ? '삭제 중' : '삭제'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">리드 상세</h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">생성일</div>
                  <div className="mt-1 text-slate-800">
                    {new Date(selected.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">전화번호</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="font-medium text-slate-900">{selected.phone}</div>
                    <button
                      type="button"
                      onClick={() => void onCopySelectedPhone()}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedPhone === selected.phone ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedPhone === selected.phone ? '복사됨' : '복사'}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">아이 이름</div>
                  <div className="mt-1 text-slate-800">{selected.child_name ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">연령대</div>
                  <div className="mt-1 text-slate-800">{selected.age_group ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">프로필키</div>
                  <div className="mt-1 text-slate-800">{selected.profile_key ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">프로필명</div>
                  <div className="mt-1 text-slate-800">{selected.profile_title ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">개인정보 동의</div>
                  <div className="mt-1 text-slate-800">{selected.consent ? 'Y' : 'N'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">ID</div>
                  <div className="mt-1 text-slate-700 break-all">{selected.id}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

