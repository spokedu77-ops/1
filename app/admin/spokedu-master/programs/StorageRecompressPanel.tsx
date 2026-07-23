'use client';

import { useCallback, useEffect, useState } from 'react';
import { HardDrive, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ScopeMode = 'master' | 'media';

type MasterSummary = {
  recompressCount: number;
  orphanCount: number;
  skipCount: number;
  beforeBytes: number;
  beforeMb: number;
  setupRecompress: number;
  thumbnailRecompress: number;
};

type MediaSummary = {
  recompressCount: number;
  orphanCount: number;
  skipCount: number;
  beforeBytes: number;
  beforeMb: number;
  byScope?: Record<string, { recompress: number; orphan: number; bytes: number }>;
};

type ApplyResponse = {
  error?: string;
  processed?: number;
  okCount?: number;
  errorCount?: number;
  remaining?: number;
  savedMb?: number;
};

const MEDIA_SCOPES = ['notices', 'weekly_best', 'note-assets', 'curriculum', 'legacy'] as const;

const SCOPE_LABEL: Record<(typeof MEDIA_SCOPES)[number], string> = {
  notices: '공지',
  weekly_best: '주간베스트',
  'note-assets': '노트',
  curriculum: '커리큘럼',
  legacy: '레거시',
};

function formatMb(bytes: number) {
  return `${(Math.round((bytes / 1024 / 1024) * 10) / 10).toFixed(1)}MB`;
}

export function StorageRecompressPanel() {
  const [mode, setMode] = useState<ScopeMode>('master');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [mediaSummary, setMediaSummary] = useState<MediaSummary | null>(null);
  const [lastSavedMb, setLastSavedMb] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const loadPreview = useCallback(async (nextMode: ScopeMode = mode) => {
    setLoading(true);
    try {
      if (nextMode === 'master') {
        const res = await fetch('/api/admin/spokedu-master/storage/recompress', { cache: 'no-store' });
        const json = (await res.json()) as { summary?: MasterSummary; error?: string };
        if (!res.ok) throw new Error(json.error ?? 'MASTER 미리보기 실패');
        setMasterSummary(json.summary ?? null);
      } else {
        const qs = MEDIA_SCOPES.map((s) => `scope=${s}`).join('&');
        const res = await fetch(`/api/admin/storage/cleanup-iiwarmup?${qs}`, { cache: 'no-store' });
        const json = (await res.json()) as { summary?: MediaSummary; error?: string };
        if (!res.ok) throw new Error(json.error ?? '미디어 미리보기 실패');
        setMediaSummary(json.summary ?? null);
      }
      setRemaining(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '미리보기에 실패했습니다.');
      if (nextMode === 'master') setMasterSummary(null);
      else setMediaSummary(null);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadPreview(mode);
  }, [loadPreview, mode]);

  const summary =
    mode === 'master'
      ? masterSummary
        ? {
            recompressCount: masterSummary.recompressCount,
            orphanCount: masterSummary.orphanCount,
            skipCount: masterSummary.skipCount,
            beforeMb: masterSummary.beforeMb,
            beforeBytes: masterSummary.beforeBytes,
          }
        : null
      : mediaSummary
        ? {
            recompressCount: mediaSummary.recompressCount,
            orphanCount: mediaSummary.orphanCount,
            skipCount: mediaSummary.skipCount,
            beforeMb: mediaSummary.beforeMb,
            beforeBytes: mediaSummary.beforeBytes,
          }
        : null;

  const actionable = (summary?.recompressCount ?? 0) + (summary?.orphanCount ?? 0);

  const runBatch = async () => {
    if (!summary || actionable <= 0) {
      toast.message('줄일 대상이 없습니다.');
      return;
    }

    const label =
      mode === 'master'
        ? `MASTER 세팅/썸네일 재압축 ${summary.recompressCount} + 고아 ${summary.orphanCount}`
        : `공지·주간베스트·노트·커리큘럼·레거시 재압축 ${summary.recompressCount} + 고아/레거시 ${summary.orphanCount}`;

    const ok = window.confirm(
      `${label} 을(를) 진행할까요?\n` +
        `대상 합계 약 ${summary.beforeMb}MB (한 번에 최대 25개)\n` +
        `레거시(play_assets/flow_backgrounds)는 삭제됩니다.`
    );
    if (!ok) return;

    setRunning(true);
    try {
      const endpoint =
        mode === 'master'
          ? '/api/admin/spokedu-master/storage/recompress'
          : '/api/admin/storage/cleanup-iiwarmup';
      const body =
        mode === 'master'
          ? { limit: 25, deleteOrphans: true }
          : { limit: 25, deleteOrphans: true, scopes: [...MEDIA_SCOPES] };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApplyResponse;
      if (!res.ok) throw new Error(json.error ?? '정리에 실패했습니다.');

      const saved = json.savedMb ?? 0;
      setLastSavedMb(saved);
      setRemaining(json.remaining ?? 0);
      toast.success(
        `이번 배치: ${json.okCount ?? 0}건 처리, 약 ${saved}MB 절감` +
          (json.errorCount ? ` (실패 ${json.errorCount})` : '') +
          (json.remaining ? ` · 남은 ${json.remaining}건` : '')
      );
      await loadPreview(mode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '정리에 실패했습니다.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[13px] font-black text-amber-950">
            <HardDrive size={16} />
            Storage 용량 줄이기 (기존 파일)
          </div>
          <p className="text-[12px] font-semibold leading-5 text-amber-900/80">
            MASTER뿐 아니라 공지·주간베스트·노트·커리큘럼·레거시 폴더까지 정리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPreview(mode)}
            disabled={loading || running}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-[12px] font-black text-amber-900 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            다시 측정
          </button>
          <button
            type="button"
            onClick={() => void runBatch()}
            disabled={loading || running || actionable <= 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-700 px-3 text-[12px] font-black text-white disabled:opacity-50"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            25개씩 줄이기
          </button>
        </div>
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-amber-200 bg-white/80 p-1">
        <button
          type="button"
          onClick={() => setMode('master')}
          className="h-8 rounded-md px-3 text-[11px] font-black"
          style={{
            background: mode === 'master' ? '#b45309' : 'transparent',
            color: mode === 'master' ? '#fff' : '#92400e',
          }}
        >
          MASTER
        </button>
        <button
          type="button"
          onClick={() => setMode('media')}
          className="h-8 rounded-md px-3 text-[11px] font-black"
          style={{
            background: mode === 'media' ? '#b45309' : 'transparent',
            color: mode === 'media' ? '#fff' : '#92400e',
          }}
        >
          공지·기타
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black text-slate-500">재압축 대상</p>
          <p className="mt-0.5 text-[16px] font-black text-slate-900">
            {loading ? '…' : summary?.recompressCount ?? 0}
          </p>
          {mode === 'master' && masterSummary ? (
            <p className="text-[10px] font-semibold text-slate-500">
              세팅 {masterSummary.setupRecompress} · 썸네일 {masterSummary.thumbnailRecompress}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black text-slate-500">고아/레거시 삭제</p>
          <p className="mt-0.5 text-[16px] font-black text-slate-900">
            {loading ? '…' : summary?.orphanCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black text-slate-500">대상 합계</p>
          <p className="mt-0.5 text-[16px] font-black text-slate-900">
            {loading ? '…' : `${summary?.beforeMb ?? 0}MB`}
          </p>
          <p className="text-[10px] font-semibold text-slate-500">스킵 {summary?.skipCount ?? 0}건</p>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black text-slate-500">직전 절감</p>
          <p className="mt-0.5 text-[16px] font-black text-emerald-700">
            {lastSavedMb == null ? '—' : `${lastSavedMb}MB`}
          </p>
          <p className="text-[10px] font-semibold text-slate-500">
            {remaining == null ? '남은 배치 —' : `남은 ${remaining}건`}
          </p>
        </div>
      </div>

      {mode === 'media' && !loading && mediaSummary?.byScope ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MEDIA_SCOPES.map((scope) => {
            const row = mediaSummary.byScope?.[scope];
            const mb = row ? Math.round((row.bytes / 1024 / 1024) * 10) / 10 : 0;
            return (
              <span
                key={scope}
                className="rounded-full border border-amber-200 bg-white/90 px-2.5 py-1 text-[10px] font-black text-amber-950"
              >
                {SCOPE_LABEL[scope]} {row ? row.recompress + row.orphan : 0}건 · {mb}MB
              </span>
            );
          })}
        </div>
      ) : null}

      {!loading && summary && actionable <= 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-emerald-800">
          이 범위는 더 줄일 대상이 없습니다.
        </p>
      ) : null}

      {!loading && summary && actionable > 0 ? (
        <p className="mt-3 text-[11px] font-semibold text-amber-900/70">
          예상 대상 {formatMb(summary.beforeBytes)}. 버튼을 여러 번 눌러 남은 배치를 처리하세요.
          {mode === 'media' ? ' (centers 범죄경력 첨부·themes·audio BGM은 제외)' : ''}
        </p>
      ) : null}
    </section>
  );
}
