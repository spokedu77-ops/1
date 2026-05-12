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

type LoadingPhase = 'idle' | 'scanning' | 'deleting';

export function SessionCenterFilesCleanupButton({ days = 7 }: { days?: number }) {
  const [phase, setPhase] = useState<LoadingPhase>('idle');

  const handleClick = async () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    try {
      const dry = await postJson<DryRunResponse>(
        `/api/admin/storage/cleanup-session-files?dryRun=1&days=${days}`
      );

      if (!dry.ok) throw new Error(dry.error || 'dry-run 실패');

      const msgLines = [
        `대상 버킷: ${dry.bucket} (센터 피드백 일지·첨부)`,
        `기준: Storage 업로드 시각 기준 ${dry.days}일 경과분 삭제`,
        `삭제 후보(파일): ${dry.candidateFileCount}개`,
        `list 오류: ${dry.listErrorCount}개`,
        '',
        '진짜 삭제를 실행할까요?',
        '· 수업 행은 삭제되지 않고, file_url 링크와 표시 파일명(feedback_fields)만 정리됩니다.',
        '· 오래된 첨부는 관리자 검수·다운로드에서 더 이상 열 수 없습니다.',
      ];

      const proceed = window.confirm(msgLines.join('\n'));
      if (!proceed) return;

      setPhase('deleting');
      const run = await postJson<RunResponse>(
        `/api/admin/storage/cleanup-session-files?days=${days}`
      );

      if (!run.ok) throw new Error(run.error || '정리 실행 실패');

      toast.success(
        `완료: Storage ${run.deletedFileCount}개 삭제, 세션 ${run.updatedSessionCount}개 file_url·첨부명 정리`
      );

      if (run.removeErrorCount + run.sessionErrorCount + run.listErrorCount > 0) {
        toast.error(
          `일부 오류가 있습니다 (list:${run.listErrorCount}, remove:${run.removeErrorCount}, session:${run.sessionErrorCount})`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`센터 첨부 정리 실패: ${msg}`);
    } finally {
      setPhase('idle');
    }
  };

  const label =
    phase === 'scanning'
      ? `스캔 중… (대용량이면 수 분, 완료 후 확인 창이 뜹니다)`
      : phase === 'deleting'
        ? '삭제·DB 정리 중…'
        : `센터 첨부 정리 (${days}일)`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={phase !== 'idle'}
      className={`rounded-lg px-3 py-2 text-sm font-bold ${
        phase !== 'idle'
          ? 'cursor-not-allowed bg-neutral-700 text-neutral-400'
          : 'bg-amber-700 text-white hover:bg-amber-600'
      }`}
      title="session-files 버킷에서 업로드 시각 기준 오래된 센터 일지·첨부를 정리합니다. 첫 단계에서 전체 버킷을 나열하므로 시간이 걸릴 수 있습니다."
    >
      {label}
    </button>
  );
}
