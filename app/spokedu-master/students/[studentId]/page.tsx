'use client';

import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { StudentSessionObservation } from '../../components/records/CaptureProjections';
import { MasterCollectionRow, MasterPageHeader, MasterPageShell, MasterSection } from '../../components/ui/MasterPrimitives';
import { studentMetaToDisplay } from '../../lib/operationalDataAdapter';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';

function attendanceLabel(status: 'present' | 'absent') {
  return status === 'present' ? '출석' : '결석';
}

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const data = useOperationalData();
  const student = data.students.find((item) => item.id === studentId) ?? null;
  const classes = data.classes.filter((item) => item.studentIds.includes(studentId));
  const history = useMemo(() => data.sessions
    .flatMap((session) => {
      if (session.status !== 'completed') return [];
      const attendance = session.attendance.find((item) => item.studentId === studentId);
      return attendance ? [{ session, attendance }] : [];
    })
    .sort((a, b) => new Date(b.session.startAt).getTime() - new Date(a.session.startAt).getTime()), [data.sessions, studentId]);

  if (data.status === 'loading' || data.status === 'idle') {
    return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p role="status" className="text-sm font-medium text-slate-500">학생 이력을 불러오는 중입니다.</p></MasterPageShell></main>;
  }
  if (data.status === 'error') {
    return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p role="alert" className="text-sm font-medium text-rose-700">학생 이력을 불러오지 못했습니다. <button type="button" onClick={() => void data.reload()} className="underline underline-offset-4">다시 시도</button></p></MasterPageShell></main>;
  }
  if (!student) {
    return <main className="h-full bg-[var(--spm-bg)]"><MasterPageShell><p className="text-sm font-medium text-slate-700">학생을 찾을 수 없습니다.</p><Link href="/spokedu-master/students" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700">학생 목록으로</Link></MasterPageShell></main>;
  }

  const profileMeta = [studentMetaToDisplay(student.meta), classes.map((item) => item.name).join(', ') || '수업반 미지정'].filter(Boolean).join(' · ');

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <MasterPageShell variant="operational" className="max-w-4xl">
        <Link href="/spokedu-master/students" className="mb-5 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-500"><ArrowLeft size={16} />학생 목록</Link>
        <MasterPageHeader title={student.name} description={profileMeta} />

        <MasterSection title="지도 참고" className="mt-10">
          {student.guidanceNote?.trim()
            ? <p className="max-w-3xl whitespace-pre-wrap text-[15px] font-normal leading-7 text-slate-700">{student.guidanceNote.trim()}</p>
            : <p className="text-sm font-medium text-slate-500">지도 참고가 없습니다.</p>}
        </MasterSection>

        <MasterSection title="수업 이력" className="mt-10">
          {history.length ? <div className="border-y border-slate-200">
            {history.map(({ session, attendance }) => (
              <MasterCollectionRow key={session.id} className="flex-wrap items-start py-4">
                <Link href={`/spokedu-master/activity?session=${encodeURIComponent(session.id)}`} className="flex w-full min-w-0 items-start gap-3 sm:gap-4">
                  <span className={`mt-0.5 rounded-full px-2.5 py-1 text-xs font-semibold ${attendance.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{attendanceLabel(attendance.status)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-slate-900">{session.className}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">{formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} · {formatSeoulSessionTime(session.startAt)}</span>
                    {session.programs.length ? <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600">{session.programs.map((program) => <span key={program.id} className="inline-flex items-center gap-1">{program.isCompleted ? <CheckCircle2 size={12} className="text-emerald-600" /> : null}{program.programTitle ?? '이름 없는 활동'}</span>)}</span> : null}
                  </span>
                  <ChevronRight size={17} className="mt-1 shrink-0 text-slate-400" />
                </Link>
                <div className="w-full pl-0 pt-2 sm:pl-[76px]"><StudentSessionObservation studentId={studentId} sessionId={session.id} />{session.memo?.trim() ? <p className="mt-2 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-600">{session.memo.trim()}</p> : null}</div>
              </MasterCollectionRow>
            ))}
          </div> : <p className="text-sm font-medium text-slate-500">아직 출석이 기록된 수업이 없습니다.</p>}
        </MasterSection>
      </MasterPageShell>
    </main>
  );
}
