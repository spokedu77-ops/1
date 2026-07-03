'use client';

import Link from 'next/link';
import { ClipboardList, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { RecordProgramPicker } from '../components/record/RecordProgramPicker';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useOperationalData } from '../operational/OperationalDataProvider';

function formatDate(value?: string | null) {
  if (!value) return '최근';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

export default function ActivityPage() {
  const operationalData = useOperationalData();
  const records = useMemo(
    () =>
      operationalData.classRecords
        .map(toClassRecord)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operationalData.classRecords],
  );

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>class records</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          수업 기록
        </h1>
        <p className="mt-2 max-w-[620px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업 후 짧게 남긴 기록은 학생 이력과 안내문 작성에 활용됩니다.
        </p>
        <div className="mt-5">
          <RecordProgramPicker label="오늘 수업 기록 남기기" />
        </div>
      </header>

      <main className="px-[22px] sm:px-8 lg:px-10">
        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>최근 수업 기록</h2>
          </div>

          {records.length ? (
            <div className="mt-4 grid gap-3">
              {records.slice(0, 8).map((record) => {
                const hasMemo = Boolean(record.memo?.trim() || record.parentNoteSnapshot?.trim());
                const hasObservation = record.focusCount > 0 || record.skillCount > 0 || record.students.some((student) => Boolean(student.memo?.trim()));
                return (
                  <article key={record.id} className="rounded-[15px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <p className="text-[12px] font-black" style={{ color: 'var(--spm-t3)' }}>{formatDate(record.date)}</p>
                    <h3 className="mt-1 break-words text-[17px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>
                      {record.programTitle || record.lessonTitle}
                    </h3>
                    <p className="mt-2 break-words text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                      {record.classId} · 출석 {record.present}명
                      {hasMemo ? ' · 메모 있음' : hasObservation ? ' · 관찰 기록 있음' : ''}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link href={`/spokedu-master/class-record?record=${record.id}&program=${record.programId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                        <ClipboardList size={14} />
                        기록 보기
                      </Link>
                      <Link href={`/spokedu-master/report?record=${record.id}&program=${record.programId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
                        <FileText size={14} />
                        안내문 만들기
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[15px] p-5 text-center" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
              <h3 className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>아직 남긴 수업 기록이 없습니다.</h3>
              <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
                수업 후 날짜와 출석, 간단한 메모만 남겨도 학생 이력과 안내문 작성에 활용할 수 있습니다.
              </p>
              <div className="mt-5 flex justify-center">
                <RecordProgramPicker label="첫 수업 기록 남기기" />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
