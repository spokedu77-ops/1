'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { studentMetaToDisplay } from '../../lib/operationalDataAdapter';
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
      const attendance = session.attendance.find((item) => item.studentId === studentId);
      return attendance ? [{ session, attendance }] : [];
    })
    .sort((a, b) => new Date(b.session.startAt).getTime() - new Date(a.session.startAt).getTime()), [data.sessions, studentId]);
  const presentCount = history.filter((item) => item.attendance.status === 'present').length;
  const absentCount = history.filter((item) => item.attendance.status === 'absent').length;

  if (data.status === 'loading' || data.status === 'idle') {
    return <main className="h-full bg-[var(--spm-bg)] p-6 text-sm font-bold text-slate-500">학생 이력을 불러오는 중입니다.</main>;
  }
  if (data.status === 'error') {
    return <main className="h-full bg-[var(--spm-bg)] p-6"><div className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700">학생 이력을 불러오지 못했습니다.<button type="button" onClick={() => void data.reload()} className="ml-2 underline">다시 시도</button></div></main>;
  }
  if (!student) {
    return <main className="h-full bg-[var(--spm-bg)] p-6"><div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="font-black text-slate-800">학생을 찾을 수 없습니다.</p><Link href="/spokedu-master/students" className="mt-3 inline-block text-sm font-black text-emerald-700">학생 목록으로</Link></div></main>;
  }

  return (
    <main className="h-full overflow-y-auto bg-[var(--spm-bg)] pb-28 lg:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        <Link href="/spokedu-master/students" className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><ArrowLeft size={15} />학생 목록</Link>
        <header className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-black text-emerald-700">학생 이력</p><h1 className="mt-1 text-2xl font-black text-slate-900">{student.name}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{[classes.map((item) => item.name).join(', '), studentMetaToDisplay(student.meta)].filter(Boolean).join(' · ') || '수업반 미지정'}</p></div>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-white"><UserRound size={22} /></span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[[`${history.length}건`, '참여 수업'], [`${presentCount}건`, '출석'], [`${absentCount}건`, '결석']].map(([value, label]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-center"><strong className="block text-lg text-slate-900">{value}</strong><span className="text-[11px] font-bold text-slate-500">{label}</span></div>)}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/spokedu-master/activity" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white"><CalendarDays size={15} />수업 캘린더 열기</Link>{history[0] ? <Link href={`/spokedu-master/report?session=${history[0].session.id}`} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><FileText size={15} />최근 수업 안내문</Link> : null}</div>
        </header>

        <section className="mt-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">수업 이력</h2><span className="text-xs font-bold text-slate-400">Session에서 자동 생성</span></div>
          <div className="mt-3 space-y-3">
            {history.map(({ session, attendance }) => (
              <article key={session.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-slate-500">{format(new Date(session.startAt), 'yyyy년 M월 d일 EEEE HH:mm', { locale: ko })}</p><h3 className="mt-1 text-base font-black text-slate-900">{session.className}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${attendance.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{attendanceLabel(attendance.status)}</span></div>
                <div className="mt-3 flex flex-wrap gap-1.5">{session.programs.length ? session.programs.map((program) => <span key={program.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{program.isCompleted ? <CheckCircle2 size={12} className="text-emerald-600" /> : null}{program.programTitle ?? '이름 없는 활동'}{program.sourceType === 'spomove' ? ' · SPOMOVE' : ''}</span>) : <span className="text-xs font-semibold text-slate-400">등록된 활동 없음</span>}</div>
                {session.memo?.trim() ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">{session.memo.trim()}</p> : null}
              </article>
            ))}
            {!history.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="text-sm font-black text-slate-700">아직 출석이 기록된 수업이 없습니다.</p><p className="mt-2 text-xs font-semibold text-slate-500">수업에서 출석을 저장하면 이곳에 자동으로 쌓입니다.</p><Link href="/spokedu-master/activity" className="mt-4 inline-block text-sm font-black text-emerald-700">수업 캘린더 열기</Link></div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
