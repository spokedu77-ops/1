'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, FileText, UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { toClassRecord, toStudentProfile } from '../lib/operationalDataAdapter';
import { getLatestClassPreparationSummary } from '../lib/studentRecordFacts';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore } from '../store';

function formatDate(value?: string | null) {
  if (!value) return '최근';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

export default function ActivityPage() {
  const operationalData = useOperationalData();
  const explanationData = useExplanationData();
  const programs = useMasterStore((state) => state.programs);
  const students = operationalData.students.map(toStudentProfile);
  const records = useMemo(
    () =>
      operationalData.classRecords
        .map(toClassRecord)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [operationalData.classRecords],
  );
  const explanations = useMemo(
    () =>
      [...explanationData.explanations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [explanationData.explanations],
  );
  const latestPreparation = useMemo(() => getLatestClassPreparationSummary(records), [records]);
  const latestProgramExists = latestPreparation
    ? programs.some((program) => program.id === latestPreparation.programId)
    : false;
  const latestExplanation = latestPreparation
    ? explanations.find((item) => item.programId === latestPreparation.programId)
    : null;
  const earlierRecords = latestPreparation
    ? records.filter((record) => record.id !== latestPreparation.recordId)
    : records;

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>activity</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          내 활동·기록
        </h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          최근 기록의 수업·학생 맥락을 확인하고 다음 준비로 이어갑니다.
        </p>
      </header>

      <main className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
        <section className="grid gap-3 md:grid-cols-3 lg:col-span-2">
          {[
            { href: '/spokedu-master/students', title: '학생', desc: '학생별 수업 기록과 메모를 확인합니다.', Icon: UsersRound },
            { href: '/spokedu-master/class-record', title: '수업 기록', desc: '수업 후 출석과 관찰을 남깁니다.', Icon: ClipboardList },
            { href: '/spokedu-master/report', title: '안내문', desc: '수업 기록을 바탕으로 전달할 안내문을 작성합니다.', Icon: FileText },
          ].map(({ href, title, desc, Icon }) => (
            <Link key={href} href={href} className="rounded-[18px] p-5 transition active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <span className="grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: 'rgba(99,102,241,0.14)', color: 'var(--spm-acc)' }}>
                <Icon size={20} />
              </span>
              <h2 className="mt-4 text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>{title}</h2>
              <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{desc}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-[18px] p-5 lg:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>
              <BookOpen size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>다음 수업 준비</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                최근 수업 기록의 참여·메모·수행 여부를 확인하고 다음 행동을 선택하세요.
              </p>

              {latestPreparation ? (
                <div className="mt-4 rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                  <p className="text-[12px] font-black" style={{ color: 'var(--spm-t3)' }}>{formatDate(latestPreparation.date)} 기록 기준</p>
                  <p className="mt-1 break-words text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{latestPreparation.programTitle}</p>
                  <p className="mt-1 break-words text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    참여 {latestPreparation.presentCount}명
                    {latestPreparation.participantNames.length ? ` · ${latestPreparation.participantNames.join(', ')}` : ''}
                    {latestPreparation.memoCount > 0 ? ` · 학생 메모 ${latestPreparation.memoCount}명` : ''}
                    {latestPreparation.skillCount > 0 ? ` · 수행 기록 ${latestPreparation.skillCount}명` : ''}
                    {latestPreparation.hasClassMemo ? ' · 수업 메모 있음' : ''}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Link
                      href={latestProgramExists ? `/spokedu-master/library/${latestPreparation.programId}` : `/spokedu-master/class-record?record=${latestPreparation.recordId}`}
                      className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-[10px] px-3 text-center text-[12px] font-black text-white"
                      style={{ background: 'var(--spm-acc)' }}
                    >
                      {latestProgramExists ? '전체 수업 자료 보기' : '기존 기록 보기'}
                    </Link>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {latestProgramExists ? (
                        <Link href={`/spokedu-master/class-record?record=${latestPreparation.recordId}&program=${latestPreparation.programId}`} className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 text-center text-[12px] font-black" style={{ color: 'var(--spm-acc)', border: '1px solid var(--spm-br2)' }}>기존 기록 보기</Link>
                      ) : null}
                      <Link
                        href={latestExplanation ? `/spokedu-master/report?saved=${latestExplanation.id}&program=${latestExplanation.programId}` : `/spokedu-master/report?record=${latestPreparation.recordId}&program=${latestPreparation.programId}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 text-center text-[12px] font-black"
                        style={{ color: 'var(--spm-acc)', border: '1px solid var(--spm-br2)' }}
                      >
                        {latestExplanation ? '저장 안내문 보기' : '안내문 작성'}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[13px] p-4" style={{ background: 'var(--spm-s3)' }}>
                  <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>최근 수업 기록이 없습니다.</p>
                  <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
                    수업 후 기록을 저장하면 여기에서 다음 수업 자료와 안내문으로 이어갈 수 있습니다.
                  </p>
                  <Link href="/spokedu-master/library" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>라이브러리에서 수업 선택</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>최근 수업 기록</h2>
            <Link href="/spokedu-master/class-record" className="text-[12px] font-black" style={{ color: 'var(--spm-acc)' }}>전체 보기</Link>
          </div>
          {earlierRecords.length ? (
            <div className="mt-4 grid gap-2">
              {earlierRecords.slice(0, 3).map((record) => (
                <Link key={record.id} href={`/spokedu-master/class-record?record=${record.id}&program=${record.programId}`} className="rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                  <p className="break-words text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{record.programTitle}</p>
                  <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{formatDate(record.date)} · 출석 {record.present}명</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[13px] p-4 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
              다음 수업 준비에 표시된 기록 외에 이전 기록이 없습니다.
            </p>
          )}
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>최근 안내문</h2>
            <Link href="/spokedu-master/report" className="text-[12px] font-black" style={{ color: 'var(--spm-acc)' }}>작성하기</Link>
          </div>
          {explanations.length ? (
            <div className="mt-4 grid gap-2">
              {explanations.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/spokedu-master/report?saved=${item.id}&program=${item.programId}`} className="rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                  <p className="break-words text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{item.programTitle}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{formatDate(item.createdAt)} · {item.text}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[13px] p-4 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
              저장한 안내문이 없습니다. 수업 기록을 바탕으로 안내문을 작성할 수 있습니다.
            </p>
          )}
        </section>

        <section className="rounded-[18px] p-5 lg:row-start-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>학생</h2>
          {students.length ? (
            <div className="mt-4 grid gap-2">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--spm-t2)' }}>등록된 학생 {students.length}명</p>
              <Link href="/spokedu-master/students" className="inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 보기</Link>
            </div>
          ) : (
            <div className="mt-4 rounded-[13px] p-4" style={{ background: 'var(--spm-s3)' }}>
              <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>등록된 학생이 없습니다.</p>
              <p className="mt-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>학생을 추가하면 수업 기록을 학생별로 확인할 수 있습니다.</p>
              <Link href="/spokedu-master/students?add=1" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 추가</Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
