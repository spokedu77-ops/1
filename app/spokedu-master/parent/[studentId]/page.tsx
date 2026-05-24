'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Award, CalendarDays, CheckCircle2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { validateParentShareToken } from '../../lib/subscription';
import { useMasterStore } from '../../store';

function SkillBar({ label, value, delta }: { label: string; value: number; delta: string }) {
  const tone = delta.startsWith('-') || delta === '정체' ? 'var(--spm-red)' : 'var(--spm-grn)';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{label}</span>
        <span className="text-[11px] font-black" style={{ color: tone }}>{delta}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--spm-s4)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
      </div>
    </div>
  );
}

function InvalidLink({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)' }}>
      <div className="max-w-[360px] rounded-[20px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <ShieldAlert className="mx-auto mb-4 h-10 w-10" color="var(--spm-red)" />
        <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h1>
        <p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--spm-t2)' }}>{body}</p>
      </div>
    </div>
  );
}

function ParentStudentViewContent() {
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const students = useMasterStore((state) => state.students);
  const records = useMasterStore((state) => state.classRecords);
  const student = students.find((item) => item.id === params.studentId);
  const tokenStatus = validateParentShareToken(token, params.studentId);
  const studentRecords = records
    .filter((record) => record.students.some((item) => item.studentId === params.studentId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestRecord = studentRecords[0];
  const latestStudentRecord = latestRecord?.students.find((item) => item.studentId === params.studentId);

  if (!tokenStatus.allowed) {
    return <InvalidLink title="링크가 유효하지 않습니다" body={tokenStatus.reason ?? '강사에게 성장 기록 링크 재발급을 요청해 주세요.'} />;
  }

  if (!student) {
    return <InvalidLink title="학생 정보를 찾을 수 없습니다" body="이 링크는 강사의 기기에서만 열람할 수 있습니다. 강사에게 직접 기기에서 화면을 보여달라고 요청해 주세요." />;
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <main className="mx-auto w-full max-w-[760px] px-[22px] py-7 sm:px-8">
        <header className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU GROWTH</p>
          <h1 className="mt-3 text-[34px] font-black leading-[1.12]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{student.name} 수업 참여 기록</h1>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>강사가 공유한 읽기 전용 화면입니다. 링크는 7일 동안만 유효하며 수정이나 댓글 입력은 지원하지 않습니다.</p>
        </header>

        <section className="mb-5 grid gap-2 sm:grid-cols-3">
          {[
            ['읽기 전용', '보호자 확인용'],
            ['유효 기간', '7일'],
            ['공유 범위', '해당 학생 기록'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[10px] font-black" style={{ color: 'var(--spm-t3)' }}>{label}</p>
              <p className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-5 overflow-hidden rounded-[22px] p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(16,185,129,0.12), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.28)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{student.group}</p>
              <h2 className="mt-1 text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{student.level}</h2>
              <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--spm-t2)' }}>{student.meta}</p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full text-[20px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>{student.name.slice(0, 1)}</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ['수업', `${student.classes}회`],
              ['출석률', `${student.attendance}%`],
              ['연속', `${student.streak}주`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[14px] p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[19px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{value}</p>
                <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} color="var(--spm-grn)" />
            <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>오늘의 요약</h2>
          </div>
          <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
            {latestRecord ? `${latestRecord.programTitle} 수업에서 ${student.name}의 참여 기록이 저장되었습니다. 오늘 기록은 수업 안내와 다음 활동 준비를 더 구체적으로 만드는 데 활용됩니다.` : `${student.name}의 수업 참여 기록을 확인할 수 있습니다. 수업 기록이 쌓일수록 더 구체적인 변화가 표시됩니다.`}
          </p>
          {latestStudentRecord ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>출결</p>
                <p className="mt-1 text-[14px] font-black" style={{ color: latestStudentRecord.attendance === 'present' ? 'var(--spm-grn)' : latestStudentRecord.attendance === 'absent' ? 'var(--spm-red)' : 'var(--spm-t)' }}>
                  {latestStudentRecord.attendance === 'present' ? '출석' : latestStudentRecord.attendance === 'absent' ? '결석' : '미확인'}
                </p>
              </div>
              <div className="rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>동작 체크</p>
                <p className="mt-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{latestStudentRecord.skills.length}개</p>
              </div>
              <div className="rounded-[13px] p-3" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>관찰</p>
                <p className="mt-1 text-[14px] font-black" style={{ color: latestStudentRecord.focused ? 'var(--spm-amb)' : 'var(--spm-t)' }}>{latestStudentRecord.focused ? '집중 관찰' : '일반'}</p>
              </div>
            </div>
          ) : null}
          {latestStudentRecord?.skills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {latestStudentRecord.skills.map((skill) => <span key={skill} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>{skill}</span>)}
            </div>
          ) : null}
          {latestStudentRecord?.memo ? <p className="mt-4 rounded-[13px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--spm-t2)' }}>강사 메모: {latestStudentRecord.memo}</p> : null}
        </section>

        <section className="mb-5 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>동작 성장</h2>
          {student.skills.length ? (
            <div className="space-y-4">{student.skills.map((skill) => <SkillBar key={skill.label} label={skill.label} value={skill.value} delta={skill.delta} />)}</div>
          ) : (
            <p className="rounded-[13px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>수업 기록이 쌓이면 동작 성장 항목이 표시됩니다.</p>
          )}
        </section>

        <section className="mb-5 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}><Award size={18} color="var(--spm-amb)" />배지</h2>
          {student.badges.length ? (
            <div className="flex flex-wrap gap-2">{student.badges.map((badge) => <span key={badge} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.13)', color: 'var(--spm-amb)' }}>{badge}</span>)}</div>
          ) : (
            <p className="rounded-[13px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>아직 표시할 배지가 없습니다.</p>
          )}
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}><CalendarDays size={18} color="var(--spm-acc)" />최근 기록</h2>
          {student.history.length ? (
            <div className="space-y-2">{student.history.map((item) => <p key={item} className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{item}</p>)}</div>
          ) : (
            <p className="rounded-[13px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>최근 수업 기록이 아직 없습니다.</p>
          )}
        </section>

        <footer className="py-6 text-center">
          <p className="mx-auto flex max-w-[520px] items-center justify-center gap-2 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            <LockKeyhole size={13} />
            이 링크는 7일 동안 유효하며, 해당 학생 기록만 열람됩니다.
          </p>
          <Link href="/spokedu-master/landing" className="mt-4 inline-flex rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>SPOKEDU MASTER</Link>
        </footer>
      </main>
    </div>
  );
}

export default function ParentStudentViewPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t3)' }}><span className="text-[13px] font-semibold">불러오는 중</span></div>}>
      <ParentStudentViewContent />
    </Suspense>
  );
}
