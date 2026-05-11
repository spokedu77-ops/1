'use client';

import Link from 'next/link';
import { Award, CalendarDays, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { validateParentPreviewToken } from '../../lib/subscription';
import { useMasterStore } from '../../store';

function SkillBar({ label, value, delta }: { label: string; value: number; delta: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{label}</span>
        <span className="text-[11px] font-black" style={{ color: delta.startsWith('-') || delta === '정체' ? 'var(--spm-red)' : 'var(--spm-grn)' }}>{delta}</span>
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
        <ShieldCheck className="mx-auto mb-4 h-10 w-10" color="var(--spm-red)" />
        <h1 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h1>
        <p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--spm-t2)' }}>{body}</p>
      </div>
    </div>
  );
}

export default function ParentStudentViewPage() {
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const students = useMasterStore((state) => state.students);
  const records = useMasterStore((state) => state.classRecords);
  const student = students.find((item) => item.id === params.studentId);
  const tokenStatus = validateParentPreviewToken(token, params.studentId);
  const studentRecords = records.filter((record) => record.students.some((item) => item.studentId === params.studentId));
  const latestRecord = studentRecords[0];

  if (!tokenStatus.allowed) {
    return <InvalidLink title="링크가 유효하지 않습니다" body={tokenStatus.reason ?? '강사에게 성장 기록 링크 재발송을 요청해주세요.'} />;
  }

  if (!student) {
    return <InvalidLink title="학생 정보를 찾을 수 없습니다" body="링크가 만료되었거나 잘못된 주소일 수 있습니다." />;
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t)', fontFamily: 'var(--spm-font-body)' }}>
      <main className="mx-auto w-full max-w-[760px] px-[22px] py-7 sm:px-8">
        <header className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU GROWTH</p>
          <h1 className="mt-3 text-[34px] font-black leading-[1.12]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{student.name} 성장 기록</h1>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>앱 설치 없이 열리는 학부모 전용 읽기 화면입니다. 공유 링크는 7일 동안만 유효합니다.</p>
        </header>

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
            {latestRecord ? `${latestRecord.programTitle} 수업에서 ${student.name}의 참여 기록이 저장되었습니다. 오늘의 기록은 다음 성장 리포트에 자동 반영됩니다.` : `${student.name}의 최근 성장 기록을 확인할 수 있습니다. 수업 기록이 쌓일수록 더 구체적인 변화가 표시됩니다.`}
          </p>
        </section>

        <section className="mb-5 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>동작 성장</h2>
          <div className="space-y-4">{student.skills.map((skill) => <SkillBar key={skill.label} label={skill.label} value={skill.value} delta={skill.delta} />)}</div>
        </section>

        <section className="mb-5 rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            <Award size={18} color="var(--spm-amb)" />
            배지
          </h2>
          <div className="flex flex-wrap gap-2">{student.badges.map((badge) => <span key={badge} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.13)', color: 'var(--spm-amb)' }}>{badge}</span>)}</div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="mb-4 flex items-center gap-2 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>
            <CalendarDays size={18} color="var(--spm-acc)" />
            최근 기록
          </h2>
          <div className="space-y-2">{student.history.map((item) => <p key={item} className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{item}</p>)}</div>
        </section>

        <footer className="py-6 text-center">
          <p className="text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>이 링크는 데모 토큰 기반 미리보기입니다. 실제 서비스에서는 Cloud Function에서 7일 유효 토큰을 검증합니다.</p>
          <Link href="/spokedu-master/dashboard" className="mt-4 inline-flex rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>SPOKEDU MASTER</Link>
        </footer>
      </main>
    </div>
  );
}
