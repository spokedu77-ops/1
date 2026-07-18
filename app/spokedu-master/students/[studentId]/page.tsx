'use client';

import Link from 'next/link';
import { CalendarDays, ClipboardList, FileText, Star, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { RecordProgramPicker } from '../../components/record/RecordProgramPicker';
import { toClassRecord, toStudentProfile } from '../../lib/operationalDataAdapter';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { ClassRecord } from '../../types';

type StudentRecordEntry = {
  record: ClassRecord;
  student: ClassRecord['students'][number];
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function getAttendanceLabel(attendance: StudentRecordEntry['student']['attendance']) {
  if (attendance === 'present') return '출석';
  if (attendance === 'absent') return '결석';
  return '미확인';
}

function getStudentEntries(records: ClassRecord[], studentId: string): StudentRecordEntry[] {
  return records
    .flatMap((record) => {
      const student = record.students.find((item) => item.studentId === studentId);
      return student ? [{ record, student }] : [];
    })
    .sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());
}

function hasEvidence(entry: StudentRecordEntry) {
  return Boolean(
    entry.student.focused
      || entry.student.memo?.trim()
      || entry.student.skills.length
      || entry.record.memo?.trim()
      || entry.record.parentNoteSnapshot?.trim(),
  );
}

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const operationalData = useOperationalData();
  const students = useMemo(() => operationalData.students.map(toStudentProfile), [operationalData.students]);
  const records = useMemo(() => operationalData.classRecords.map(toClassRecord), [operationalData.classRecords]);
  const student = students.find((item) => item.id === studentId) ?? null;
  const entries = student ? getStudentEntries(records, student.id) : [];
  const latest = entries[0] ?? null;
  const presentCount = entries.filter((entry) => entry.student.attendance === 'present').length;
  const absentCount = entries.filter((entry) => entry.student.attendance === 'absent').length;
  const focusedCount = entries.filter((entry) => entry.student.focused).length;
  const evidenceCount = entries.filter(hasEvidence).length;
  const recentObservations = entries.filter(hasEvidence).slice(0, 3);

  if (operationalData.status === 'loading' || operationalData.status === 'idle') {
    return <div className="h-full p-6 text-[13px] font-bold" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t2)' }}>학생 기록을 불러오는 중입니다.</div>;
  }

  if (!student) {
    return (
      <div className="h-full overflow-y-auto p-[22px] pb-28 lg:p-10" style={{ background: 'var(--spm-bg)' }}>
        <section className="rounded-[18px] p-6 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h1 className="text-[22px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>학생 기록을 찾을 수 없습니다.</h1>
          <p className="mt-2 text-[13px] font-semibold leading-6" style={{ color: 'var(--spm-t2)' }}>현재 계정의 학생 목록에 있는 학생만 확인할 수 있습니다.</p>
          <Link href="/spokedu-master/students" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 목록으로</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>학생 이력</p>
        <h1 className="mt-1 break-words text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{student.name}</h1>
        <p className="mt-2 text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>{[student.group, student.meta].filter(Boolean).join(' / ')}</p>
        {entries.length > 0 ? (
          <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--spm-grn)' }}>
            수업 증거 {evidenceCount}건 · 기록 {entries.length}건이 쌓여 있습니다.
          </p>
        ) : null}
      </header>

      <main className="grid gap-5 px-[22px] sm:px-8 lg:px-10">
        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>1. 학생 기본 정보</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Info label="이름" value={student.name} />
            {student.group ? <Info label="반" value={student.group} /> : null}
            {student.meta ? <Info label="메모" value={student.meta} /> : null}
          </div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>2. 빠른 행동</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <RecordProgramPicker label="수업 골라 기록" studentId={student.id} />
            {latest ? (
              <Link href={`/spokedu-master/report?record=${latest.record.id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><FileText size={15} />안내문 작성</Link>
            ) : (
              <span className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-black opacity-60" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><FileText size={15} />기록 후 안내문</span>
            )}
            <Link href="/spokedu-master/students" className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><Users size={15} />학생 목록 관리</Link>
          </div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>3. 수업 참여 요약</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Info label="전체 기록" value={`${entries.length}건`} />
            <Info label="쌓인 증거" value={`${evidenceCount}건`} />
            <Info label="출석" value={`${presentCount}건`} />
            <Info label="결석" value={`${absentCount}건`} />
            <Info label="집중 관찰" value={`${focusedCount}건`} />
            {latest ? <Info label="최근 수업일" value={formatDate(latest.record.date)} /> : null}
          </div>
          {latest ? (
            <p className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
              최근 프로그램: {latest.record.programTitle}
            </p>
          ) : null}
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="flex items-center gap-2 text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>
            <CalendarDays size={17} color="var(--spm-acc)" />
            4. 최근 수업 기록
          </h2>
          <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
            빠른 기록·보강 기록이 이 학생의 학습 증거로 쌓입니다.
          </p>
          {entries.length ? (
            <div className="mt-4 grid gap-3">
              {entries.slice(0, 5).map(({ record, student: recordStudent }) => {
                const isQuick = record.recordType === 'quick';
                return (
                  <article key={record.id} className="rounded-[14px] p-4" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>
                        {formatDate(record.date)} · {getAttendanceLabel(recordStudent.attendance)}
                      </p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: isQuick ? 'var(--spm-grn-a12)' : 'var(--spm-acc-a12)', color: isQuick ? 'var(--spm-grn)' : 'var(--spm-acc)' }}>
                        {isQuick ? '빠른 기록' : '상세 기록'}
                      </span>
                      {recordStudent.focused ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'var(--spm-amb-a16)', color: 'var(--spm-amb)' }}>
                          <Star size={10} fill="currentColor" /> 집중 관찰
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 break-words text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>{record.programTitle}</h3>
                    {record.memo ? (
                      <p className="mt-2 break-words rounded-[10px] p-2 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)' }}>
                        공통 메모: {record.memo}
                      </p>
                    ) : null}
                    {recordStudent.skills.length ? (
                      <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
                        수행 기록: {recordStudent.skills.join(', ')}
                      </p>
                    ) : null}
                    {recordStudent.memo ? (
                      <p className="mt-2 break-words rounded-[10px] p-2 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>
                        학생별 메모: {recordStudent.memo}
                      </p>
                    ) : null}
                    {record.parentNoteSnapshot?.trim() ? (
                      <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                        안내문 초안이 이 기록에 남아 있습니다.
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/spokedu-master/class-record?record=${record.id}&student=${student.id}&program=${record.programId}`}
                        className="inline-flex min-h-10 items-center gap-1 rounded-[10px] px-3 text-[11px] font-black"
                        style={{ background: 'var(--spm-acc-a12)', color: 'var(--spm-acc)' }}
                      >
                        <ClipboardList size={12} />
                        {isQuick ? '이 기록 보강' : '기록 보기·수정'}
                      </Link>
                      <Link href={`/spokedu-master/report?record=${record.id}`} className="inline-flex min-h-10 items-center rounded-[10px] px-3 text-[11px] font-black" style={{ background: 'var(--spm-grn-a12)', color: 'var(--spm-grn)' }}>
                        안내문 작성
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[14px] p-4" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
              <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>아직 이 학생의 수업 기록이 없습니다.</p>
              <p className="mt-2 text-[12px] font-semibold leading-5">첫 수업 기록을 작성하면 참여 이력을 학생별로 확인할 수 있습니다.</p>
              <div className="mt-3">
                <RecordProgramPicker label="수업 골라 기록" studentId={student.id} />
              </div>
            </div>
          )}
        </section>

        {recentObservations.length > 0 ? (
          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>최근 관찰 기록</h2>
            <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
              메모·집중 관찰·수행 태그가 학습 증거로 모입니다.
            </p>
            <div className="mt-3 grid gap-2">
              {recentObservations.map(({ record, student: recordStudent }) => {
                const bits = [
                  recordStudent.focused ? '집중 관찰' : '',
                  record.memo?.trim() || '',
                  recordStudent.skills.join(', '),
                  recordStudent.memo?.trim() || '',
                ].filter(Boolean);
                return (
                  <p key={record.id} className="break-words rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                    {formatDate(record.date)} · {record.programTitle}
                    {bits.length ? ` — ${bits.join(' / ')}` : ''}
                  </p>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>5. 과거 안내문</h2>
          <div className="mt-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
            <p className="text-[13px] font-bold">이 학생과 연결된 안내문이 없습니다.</p>
            <p className="mt-2 text-[12px] font-semibold leading-5">수업 기록을 작성한 뒤 학생별 안내문을 만들 수 있습니다.</p>
            {latest ? (
              <Link href={`/spokedu-master/report?record=${latest.record.id}`} className="mt-3 inline-flex min-h-11 items-center rounded-[10px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                최근 수업 기록 보기
              </Link>
            ) : (
              <div className="mt-3">
                <RecordProgramPicker label="수업 골라 기록" studentId={student.id} />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
      <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      <p className="mt-1 break-words text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{value}</p>
    </div>
  );
}
