'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, FileText, Loader2, UserPlus, UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useOperationalData } from '../operational/OperationalDataProvider';

function formatDate(value?: string | null) {
  if (!value) return '최근';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

function ActivityLoadingState() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 rounded-[15px] p-8" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
      <Loader2 size={18} className="animate-spin" color="var(--spm-acc)" />
      <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>수업 기록을 불러오는 중입니다.</p>
    </div>
  );
}

function ActivityErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-4 rounded-[15px] p-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
      <p className="text-[13px] font-bold" style={{ color: 'var(--spm-red)' }}>수업 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry} className="mt-3 h-11 rounded-[10px] px-4 text-[12px] font-black text-white" style={{ background: 'var(--spm-red)' }}>
        다시 시도
      </button>
    </div>
  );
}

export default function ActivityPage() {
  const operationalData = useOperationalData();
  const operationalLoading = operationalData.status === 'idle' || operationalData.status === 'loading';
  const operationalError = operationalData.status === 'error';
  const records = useMemo(
    () =>
      operationalData.classRecords
        .map(toClassRecord)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operationalData.classRecords],
  );

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,var(--spm-s1)_0%,var(--spm-s2)_68%,color-mix(in_srgb,var(--spm-s3)_72%,white)_100%)] p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)] ring-1 ring-white/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#111827_0%,#475569_45%,rgba(71,85,105,0)_100%)] sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">수업 기록</p>
        <h1 className="mt-1 text-[27px] font-black leading-tight text-[color:var(--spm-t)]">
          수업 기록
        </h1>
        <p className="mt-2 max-w-[620px] text-[13px] font-semibold leading-6 text-slate-600">
          빠른 기록과 보강된 상세 기록이 학생 이력·안내문 근거로 쌓입니다.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/spokedu-master/library" className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-slate-950 px-4 text-[13px] font-black text-white">
            <BookOpen size={17} />
            라이브러리에서 수업 고르기
          </Link>
          <Link href="/spokedu-master/students?add=1" className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-700">
            <UserPlus size={16} />
            학생 추가
          </Link>
        </div>
      </header>

      <main className="mt-4">
        <section className="rounded-[16px] border border-slate-200 bg-white/86 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">기록</p>
              <h2 className="mt-0.5 text-[18px] font-black leading-tight text-[color:var(--spm-t)]">최근 수업 기록</h2>
            </div>
          </div>

          {operationalLoading ? (
            <ActivityLoadingState />
          ) : operationalError ? (
            <ActivityErrorState onRetry={() => void operationalData.reload()} />
          ) : records.length ? (
            <div className="mt-4 grid gap-3">
              {records.slice(0, 8).map((record) => {
                const isQuick = record.recordType === 'quick';
                const hasMemo = Boolean(record.memo?.trim() || record.parentNoteSnapshot?.trim());
                const hasObservation = record.focusCount > 0 || record.skillCount > 0 || record.students.some((student) => Boolean(student.memo?.trim()));
                return (
                  <article key={record.id} className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[12px] font-black" style={{ color: 'var(--spm-t3)' }}>
                      {formatDate(record.date)}
                      {isQuick ? ' · 빠른 기록' : ' · 상세 기록'}
                    </p>
                    <h3 className="mt-1 break-words text-[17px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
                      {record.programTitle || record.lessonTitle}
                    </h3>
                    <p className="mt-2 break-words text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                      {record.classId}
                      {isQuick
                        ? (hasMemo ? ' · 관찰 메모 있음' : ' · 관찰 메모 없음') + (record.focusCount > 0 ? ' · 집중 관찰 있음' : '')
                        : ` · 출석 ${record.present}명${hasMemo ? ' · 메모 있음' : hasObservation ? ' · 관찰 기록 있음' : ''}`}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Link href={`/spokedu-master/class-record?record=${record.id}&program=${record.programId}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] bg-slate-950 px-3 text-[12px] font-black text-white">
                        <ClipboardList size={14} />
                        {isQuick ? '이 기록 보강' : '기록 보기'}
                      </Link>
                      <Link href={`/spokedu-master/report?record=${record.id}&program=${record.programId}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700">
                        <FileText size={14} />
                        안내문 만들기
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[12px] border border-dashed border-slate-200 bg-slate-50 p-5">
              <div className="mx-auto max-w-[620px] text-center">
                <h3 className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>아직 진행한 수업 기록이 없습니다.</h3>
                <p className="mx-auto mt-2 max-w-[460px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
                  라이브러리에서 오늘 수업을 고르면 기록, 학생 이력, 안내문까지 이어집니다.
                </p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link href={`/spokedu-master/library`} className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-slate-950 px-5 text-[13px] font-black text-white">
                  <BookOpen size={16} />
                  수업 라이브러리 열기
                </Link>
                <Link href="/spokedu-master/students?add=1" className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-5 text-[13px] font-black text-slate-700">
                  <UserPlus size={16} />
                  학생 추가
                </Link>
              </div>
              <Link href="/spokedu-master/students" className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-600">
                <UsersRound size={14} />
                학생 명단 관리
              </Link>
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
}
