'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type DryRunResponse = {
  ok: boolean;
  dryRun: true;
  bucket: string;
  days: number;
  cutoffIso: string;
  candidateFileCount: number;
  listErrorCount: number;
  listErrors?: string[];
  samplePaths?: string[];
  error?: string;
};

type RunResponse = {
  ok: boolean;
  dryRun: false;
  bucket: string;
  days: number;
  cutoffIso: string;
  candidateFileCount: number;
  deletedFileCount: number;
  scannedSessionCount: number;
  updatedSessionCount: number;
  listErrorCount: number;
  removeErrorCount: number;
  sessionErrorCount: number;
  listErrors?: string[];
  removeErrors?: string[];
  sessionErrors?: string[];
  samplePaths?: string[];
  error?: string;
};

async function postJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'POST', credentials: 'include' });
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(payload?.error || res.statusText);
  }
  return payload as T;
}

export function SessionPhotosCleanupButton({ days = 7 }: { days?: number }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const dry = await postJson<DryRunResponse>(
        `/api/admin/storage/cleanup-session-photos?dryRun=1&days=${days}`
      );

      if (!dry.ok) throw new Error(dry.error || 'dry-run 실패');

      const msgLines = [
        `대상 버킷: ${dry.bucket}`,
        `기준: ${dry.days}일 경과`,
        `삭제 후보(파일): ${dry.candidateFileCount}개`,
        `list 오류: ${dry.listErrorCount}개`,
        '',
        '진짜 삭제를 실행할까요?',
        '(수업 데이터는 삭제되지 않고, photo_url 링크만 정리됩니다)',
      ];

      const proceed = window.confirm(msgLines.join('\n'));
      if (!proceed) return;

      const run = await postJson<RunResponse>(
        `/api/admin/storage/cleanup-session-photos?days=${days}`
      );

      if (!run.ok) throw new Error(run.error || '정리 실행 실패');

      toast.success(
        `완료: Storage ${run.deletedFileCount}개 삭제, 세션 ${run.updatedSessionCount}개 photo_url 정리`
      );

      if (run.removeErrorCount + run.sessionErrorCount + run.listErrorCount > 0) {
        toast.error(
          `일부 오류가 있습니다 (list:${run.listErrorCount}, remove:${run.removeErrorCount}, session:${run.sessionErrorCount})`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`세션 사진 정리 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`rounded-lg px-3 py-2 text-sm font-bold ${
        loading
          ? 'cursor-not-allowed bg-neutral-700 text-neutral-400'
          : 'bg-red-600 text-white hover:bg-red-500'
      }`}
      title="session-photos 버킷에서 오래된 사진을 정리합니다"
    >
      {loading ? '정리 준비 중...' : `세션 사진 정리 (${days}일)`}
    </button>
  );
}

