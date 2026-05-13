'use client';

import Link from 'next/link';
import { AlertTriangle, BarChart3, CreditCard, FileText, MessageCircle, UsersRound, type LucideIcon } from 'lucide-react';
import { OperationsPanel } from '../components/operations/OperationsPanel';
import { useMasterStore, useProfile } from '../store';
import { isTrialExpired } from '../lib/subscription';

function Kpi({ label, value, desc, icon: Icon, tone }: { label: string; value: string; desc: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
        <Icon size={18} color={tone} />
      </div>
      <p className="mt-4 text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</p>
    </div>
  );
}

export default function DirectorPage() {
  const profile = useProfile();
  const students = useMasterStore((state) => state.students);
  const records = useMasterStore((state) => state.classRecords);
  const lessons = useMasterStore((state) => state.lessons);
  const riskStudents = students.filter((student) => student.risk);
  const recordRate = records.length > 0 ? 82 : 68;
  const attendance = Math.round(students.reduce((sum, student) => sum + student.attendance, 0) / Math.max(students.length, 1));
  const centerName = profile?.centerName ?? profile?.school ?? '센터';

  if (profile?.role !== 'director' && !isTrialExpired(profile)) {
    return (
      <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
        <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>director dashboard</p>
          <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 대시보드</h1>
        </header>
        <section className="mx-[22px] rounded-[18px] p-6 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>Center 플랜 전용 화면입니다</h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>센터 코드로 합류하거나 Center 플랜을 선택하면 강사 기록률, 학생 케어 신호, 센터 운영 현황을 이 화면에서 확인할 수 있습니다.</p>
          <Link href="/spokedu-master/profile" className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>플랜과 도입 방식 보기</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>director dashboard</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 대시보드</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          {centerName}의 강사 사용 흐름과 학생 케어 신호를 미리 보는 운영 프리뷰입니다. 센터 확장 기능은 실제 기록 데이터가 쌓인 뒤 안정화합니다.
        </p>
      </header>

      <section className="grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
        <Kpi label="teachers" value="3명" desc="센터 플랜 기본 좌석" icon={UsersRound} tone="#818cf8" />
        <Kpi label="students" value={`${students.length}명`} desc="관리 중인 학생" icon={BarChart3} tone="#10b981" />
        <Kpi label="attendance" value={`${attendance}%`} desc="이번 주 평균 출석률" icon={CreditCard} tone="#f59e0b" />
        <Kpi label="record rate" value={`${recordRate}%`} desc={recordRate < 70 ? '기록률 경고 기준 미만' : '안정적인 기록률'} icon={AlertTriangle} tone={recordRate < 70 ? 'var(--spm-red)' : 'var(--spm-grn)'} />
      </section>

      <div className="mt-7 grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[1fr_380px] lg:px-10">
        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>강사 기록률</h2>
          <div className="mt-5 space-y-3">
            {[
              ['김선생', recordRate],
              ['이코치', 91],
              ['박강사', 74],
            ].map(([name, rate]) => (
              <div key={name} className="rounded-[14px] p-4" style={{ background: 'var(--spm-s3)' }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{name}</span>
                  <span className="text-[12px] font-black" style={{ color: Number(rate) < 70 ? 'var(--spm-red)' : 'var(--spm-grn)' }}>{rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--spm-s4)' }}>
                  <div className="h-full rounded-full" style={{ width: `${rate}%`, background: Number(rate) < 70 ? 'var(--spm-red)' : 'linear-gradient(90deg,#6366f1,#10b981)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>케어 필요 학생</h2>
          <div className="mt-5 space-y-2">
            {riskStudents.length > 0 ? riskStudents.map((student) => (
              <div key={student.id} className="rounded-[13px] p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{student.name}</p>
                <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-red)' }}>{student.risk}</p>
              </div>
            )) : <p className="rounded-[13px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>현재 위험 신호가 없습니다.</p>}
          </div>
          <Link href="/spokedu-master/students" className="mt-4 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 이력 확인</Link>
        </section>
      </div>

      <section className="mx-[22px] mt-5 grid gap-3 sm:mx-8 md:grid-cols-3 lg:mx-10">
        <Link href="/spokedu-master/report" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><FileText size={19} color="var(--spm-acc)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>센터 설명 자료</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>수업 가치 문구 정리</span></span>
        </Link>
        <Link href="/spokedu-master/class-record" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(16,185,129,0.14)' }}><MessageCircle size={19} color="var(--spm-grn)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>수업 기록</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>출석과 관찰 기록 프리뷰</span></span>
        </Link>
        <Link href="/spokedu-master/profile" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(245,158,11,0.14)' }}><CreditCard size={19} color="var(--spm-amb)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>센터 플랜</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>도입 방식과 좌석 검토</span></span>
        </Link>
      </section>

      <section className="mx-[22px] mt-5 sm:mx-8 lg:mx-10">
        <OperationsPanel compact />
      </section>

      <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.28)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>center plan</p>
        <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 플랜 사용 중</h2>
        <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          Center 플랜은 강사 3명 기본 좌석을 기준으로 검토합니다. 자동 발송과 상세 리포트는 운영 리스크를 검증한 뒤 단계적으로 확장합니다. 현재 수업 계획 {lessons.length}개가 운영 중입니다.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['좌석', '3/3'],
            ['공유', '준비 중'],
            ['기록', `${records.length || students.length}건`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s3)' }}>
              <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
              <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
