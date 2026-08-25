'use client';

import { ClipboardList, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { formatElapsedSeconds } from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';

export function MasterSessionResult({
  status,
  activityTitle,
  elapsedMs,
  settings,
  recordHref,
  hubHref,
  sessionReturnHref,
  canMarkComplete = false,
  markCompleteStatus = 'idle',
  onMarkCompleteAndReturn,
  onRetry,
}: {
  status: 'done' | 'ended';
  activityTitle: string;
  elapsedMs: number;
  settings: string[];
  recordHref: string | null;
  hubHref: string;
  /** Session operating origin — Primary return when present. */
  sessionReturnHref?: string | null;
  /** Explicit teacher action only — never auto from engine done. */
  canMarkComplete?: boolean;
  markCompleteStatus?: 'idle' | 'saving' | 'error';
  onMarkCompleteAndReturn?: () => void;
  onRetry: () => void;
}) {
  const done = status === 'done';
  const fromSession = Boolean(sessionReturnHref);
  const marking = markCompleteStatus === 'saving';
  return (
    <main className="flex h-dvh items-center justify-center overflow-y-auto bg-slate-100 px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-950">
      <section className="w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-7">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
          {done ? '정상 완료' : '중도 종료'}
        </span>
        <h1 className="mt-4 text-[28px] font-black leading-tight sm:text-[34px]">{done ? '훈련 완료' : '수업을 종료했습니다'}</h1>
        <p className="mt-2 text-[17px] font-bold text-slate-700">{activityTitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">진행 시간</p>
            <p className="mt-1 text-xl font-black">{formatElapsedSeconds(elapsedMs)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">종료 상태</p>
            <p className="mt-1 text-xl font-black">{done ? '완료' : '중도 종료'}</p>
          </div>
        </div>

        <section className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-xs font-black tracking-wide text-slate-500">사용한 설정</h2>
          <p className="mt-2 break-words text-[15px] font-bold leading-6 text-slate-800">{settings.filter(Boolean).join(' · ')}</p>
        </section>
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
          {fromSession
            ? '실행 종료와 수업 활동 완료 기록은 별개입니다. 수업 화면에서 진행 체크하거나, 아래에서 완료로 표시할 수 있습니다.'
            : '표시된 정보는 실행 시간과 사용 설정이며, 수행 능력을 자동 채점한 결과가 아닙니다.'}
        </p>
        {fromSession && markCompleteStatus === 'error' ? (
          <p role="status" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            완료 기록을 저장하지 못했습니다. 수업 화면에서 직접 완료해 주세요.
          </p>
        ) : null}

        <div className="mt-6 grid gap-2">
          {sessionReturnHref ? (
            <Link href={sessionReturnHref} className={`${SPM_PRIMARY_BTN} min-h-12 w-full`}>
              수업으로 돌아가기
            </Link>
          ) : null}
          {fromSession && canMarkComplete && onMarkCompleteAndReturn ? (
            <button
              type="button"
              disabled={marking}
              onClick={onMarkCompleteAndReturn}
              className={`${SPM_SECONDARY_BTN} min-h-11 w-full disabled:opacity-55`}
            >
              {marking ? '기록 중…' : '완료로 표시하고 수업으로'}
            </button>
          ) : null}
          {recordHref && !fromSession ? (
            <Link href={recordHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
              <ClipboardList className="mr-2 h-4 w-4" /> 수업 기록 남기기
            </Link>
          ) : null}
          <button type="button" onClick={onRetry} className={`${fromSession || recordHref ? SPM_SECONDARY_BTN : SPM_PRIMARY_BTN} min-h-12 w-full`}>
            <RefreshCw className="mr-2 h-4 w-4" /> 같은 설정으로 다시 실행
          </button>
          <Link href={hubHref} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[14px] font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            {fromSession ? 'SPOMOVE 활동 목록' : '활동 목록으로'}
          </Link>
        </div>
      </section>
    </main>
  );
}
