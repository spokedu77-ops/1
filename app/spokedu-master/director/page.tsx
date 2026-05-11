'use client';

import { AlertTriangle, BarChart3, CreditCard, UsersRound } from 'lucide-react';
import { OperationsPanel } from '../components/operations/OperationsPanel';
import { useMasterStore, useProfile } from '../store';

function Kpi({ label, value, desc, icon: Icon, tone }: { label: string; value: string; desc: string; icon: typeof BarChart3; tone: string }) {
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

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>director dashboard</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 대시보드</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          {profile?.centerName ?? profile?.school ?? '센터'}의 강사 기록율, 학생 이탈 신호, 센터 플랜 사용량을 봅니다.
        </p>
      </header>

      <section className="grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
        <Kpi label="teachers" value="3명" desc="센터 플랜 기본 슬롯" icon={UsersRound} tone="#818cf8" />
        <Kpi label="students" value={`${students.length}명`} desc="관리 중인 학생" icon={BarChart3} tone="#10b981" />
        <Kpi label="attendance" value={`${attendance}%`} desc="이번 주 평균 출석률" icon={CreditCard} tone="#f59e0b" />
        <Kpi label="record rate" value={`${recordRate}%`} desc={recordRate < 70 ? '기록율 경고 기준 미만' : '안정적인 기록율'} icon={AlertTriangle} tone={recordRate < 70 ? 'var(--spm-red)' : 'var(--spm-grn)'} />
      </section>

      <div className="mt-7 grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[1fr_380px] lg:px-10">
        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>강사 기록율</h2>
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
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>이탈 위험 학생</h2>
          <div className="mt-5 space-y-2">
            {riskStudents.map((student) => (
              <div key={student.id} className="rounded-[13px] p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{student.name}</p>
                <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-red)' }}>{student.risk}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-[22px] mt-5 sm:mx-8 lg:mx-10">
        <OperationsPanel compact />
      </section>

      <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.28)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>center plan</p>
        <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 플랜 사용 중</h2>
        <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          강사 3명 기본, 카카오 발송 무제한, 원장 대시보드와 이탈 학생 자동 감지를 포함합니다. 현재 수업계획 {lessons.length}개가 운영 중입니다.
        </p>
      </section>
    </div>
  );
}
