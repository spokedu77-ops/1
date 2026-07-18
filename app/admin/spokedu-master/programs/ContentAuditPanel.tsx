'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentAuditItem } from '@/app/spokedu-master/lib/contentAuditReport';

type AuditSummary = {
  total: number;
  passCount: number;
  failCount: number;
  byMissing: {
    video: number;
    equipment: number;
    safety: number;
    steps: number;
    tags: number;
  };
};

type AuditResponse = {
  data?: ContentAuditItem[];
  summary?: AuditSummary;
  meta?: { limit: number; source: string; checklistColumns: string[] };
  error?: string;
};

type ViewFilter = 'all' | 'fail' | 'pass';

const CHECK_LABELS: Array<{ key: keyof ContentAuditItem['checks']; label: string }> = [
  { key: 'video', label: '영상' },
  { key: 'equipment', label: '준비물' },
  { key: 'safety', label: '안전' },
  { key: 'steps', label: '단계' },
  { key: 'tags', label: '태그' },
];

function CheckCell({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
      <CheckCircle2 size={13} />
      OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600">
      <XCircle size={13} />
      없음
    </span>
  );
}

export function ContentAuditPanel({
  onOpenProgram,
}: {
  onOpenProgram: (curriculumId: number) => void;
}) {
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentAuditItem[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [source, setSource] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/spokedu-master/programs/content-audit?limit=${limit}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as AuditResponse;
      if (!res.ok) throw new Error(json.error ?? '콘텐츠 감사를 불러오지 못했습니다.');
      setItems(json.data ?? []);
      setSummary(json.summary ?? null);
      setSource(json.meta?.source ?? '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '콘텐츠 감사를 불러오지 못했습니다.');
      setItems([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (viewFilter === 'fail') return items.filter((item) => !item.pass);
    if (viewFilter === 'pass') return items.filter((item) => item.pass);
    return items;
  }, [items, viewFilter]);

  const copyChecklist = async () => {
    const lines = [
      ['#', 'curriculumId', '제목', '영상', '준비물', '안전', '단계', '태그', 'API pass'].join('\t'),
      ...visible.map((item, index) =>
        [
          `E${index + 1}`,
          String(item.curriculumId),
          item.title,
          item.checks.video ? 'Y' : 'N',
          item.checks.equipment ? 'Y' : 'N',
          item.checks.safety ? 'Y' : 'N',
          item.checks.steps ? 'Y' : 'N',
          item.checks.tags ? 'Y' : 'N',
          item.pass ? 'Y' : 'N',
        ].join('\t'),
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('QA Phase E 표를 클립보드에 복사했습니다.');
    } catch {
      toast.error('복사에 실패했습니다. 표를 직접 선택해 주세요.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-5 py-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">Phase E</p>
            <h2 className="mt-1 text-[20px] font-black text-slate-950">상용화 콘텐츠 샘플 감사</h2>
            <p className="mt-1 max-w-2xl text-[12px] font-semibold leading-5 text-slate-500">
              HOT 우선 상위 N개 수업의 영상·준비물·안전·단계·태그를 자동 점검합니다. API pass는 필드 존재 여부이고,
              품질 Pass는 사람이 최종 판단합니다.
            </p>
            {source ? <p className="mt-2 text-[11px] font-bold text-slate-400">정렬: {source}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-black text-slate-600">
              상위
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="bg-transparent font-black text-slate-950 outline-none"
              >
                {[10, 20, 40, 60].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void copyChecklist()}
              disabled={visible.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 disabled:opacity-50"
            >
              <Clipboard size={14} />
              표 복사
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-[12px] font-black text-white disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              새로고침
            </button>
          </div>
        </div>

        {summary ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-[10px] font-black text-slate-500">표본</p>
              <p className="mt-1 text-[18px] font-black">{summary.total}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-black text-emerald-700">API pass</p>
              <p className="mt-1 text-[18px] font-black text-emerald-900">{summary.passCount}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <p className="text-[10px] font-black text-rose-700">API fail</p>
              <p className="mt-1 text-[18px] font-black text-rose-900">{summary.failCount}</p>
            </div>
            {CHECK_LABELS.map((check) => (
              <div key={check.key} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black text-slate-500">{check.label} 없음</p>
                <p className="mt-1 text-[18px] font-black text-slate-900">{summary.byMissing[check.key]}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(
            [
              { key: 'all', label: '전체' },
              { key: 'fail', label: '미완성만' },
              { key: 'pass', label: '완성만' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setViewFilter(filter.key)}
              className="h-8 rounded-full border px-3 text-[11px] font-black"
              style={{
                borderColor: viewFilter === filter.key ? '#4f46e5' : '#e2e8f0',
                background: viewFilter === filter.key ? '#eef2ff' : '#ffffff',
                color: viewFilter === filter.key ? '#4338ca' : '#64748b',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">수업</th>
                {CHECK_LABELS.map((check) => (
                  <th key={check.key} className="px-3 py-3">
                    {check.label}
                  </th>
                ))}
                <th className="px-3 py-3">API</th>
                <th className="px-3 py-3">부족</th>
                <th className="px-3 py-3">편집</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-3 py-16 text-center text-[13px] font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-500" />
                    감사 중…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-16 text-center text-[13px] font-bold text-slate-400">
                    표시할 수업이 없습니다.
                  </td>
                </tr>
              ) : (
                visible.map((item, index) => (
                  <tr key={item.curriculumId} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-[12px] font-black text-slate-400">E{index + 1}</td>
                    <td className="px-3 py-3">
                      <p className="max-w-[280px] text-[13px] font-black text-slate-950">{item.title}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                        #{item.curriculumId}
                        {item.isHot ? ' · HOT' : ''}
                      </p>
                    </td>
                    {CHECK_LABELS.map((check) => (
                      <td key={check.key} className="px-3 py-3">
                        <CheckCell ok={item.checks[check.key]} />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-1 text-[10px] font-black"
                        style={{
                          background: item.pass ? '#ecfdf5' : '#fff1f2',
                          color: item.pass ? '#047857' : '#be123c',
                        }}
                      >
                        {item.pass ? 'pass' : 'fail'} · {item.score}/5
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-bold text-slate-500">
                      {item.missing.length
                        ? item.missing
                            .map((key) => CHECK_LABELS.find((check) => check.key === key)?.label ?? key)
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenProgram(item.curriculumId)}
                        className="h-8 rounded-lg bg-slate-950 px-3 text-[11px] font-black text-white"
                      >
                        편집기에서 열기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
