'use client';

import Link from 'next/link';
import { BarChart3, BookOpen, CreditCard, FileText, MessageCircle, MonitorPlay, UserCheck, UserX, UsersRound, type LucideIcon } from 'lucide-react';
import { OperationsPanel } from '../components/operations/OperationsPanel';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { getClassRecordFacts } from '../lib/studentRecordFacts';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore, useProfile } from '../store';

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
  const { classRecords: serverClassRecords } = useOperationalData();
  const records = serverClassRecords.map(toClassRecord);
  const lessons = useMasterStore((state) => state.lessons);
  const recordFacts = getClassRecordFacts(records);
  const myName = profile?.name ?? '나';
  const centerName = profile?.centerName ?? profile?.school ?? '센터';

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>director dashboard</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 수업 운영</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          {centerName}의 수업안 사용, 기록률, 학생 케어 신호를 한눈에 확인합니다.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:max-w-[760px]">
          {[
            { label: '수업안 배포', href: '/spokedu-master/library', icon: BookOpen },
            { label: 'SPOMOVE 운영', href: '/spokedu-master/spomove', icon: MonitorPlay },
            { label: '설명 문구', href: '/spokedu-master/report', icon: FileText },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex h-12 items-center justify-center gap-2 rounded-[14px] text-[12px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </header>

      <section className="grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
        <Kpi label="records" value={`${recordFacts.recordCount}건`} desc="전체 수업 기록 수" icon={BarChart3} tone="#818cf8" />
        <Kpi label="present" value={`${recordFacts.presentCount}건`} desc="출석으로 체크된 기록" icon={UserCheck} tone="#10b981" />
        <Kpi label="absent" value={`${recordFacts.absentCount}건`} desc="결석으로 체크된 기록" icon={UserX} tone="#f59e0b" />
        <Kpi label="students" value={`${recordFacts.recordedStudentCount}명`} desc="기록이 연결된 학생" icon={UsersRound} tone="#6366f1" />
      </section>

      <div className="mt-7 grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[1fr_380px] lg:px-10">
        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>수업 기록 현황</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-[14px] p-4" style={{ background: 'var(--spm-s3)' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{myName}</span>
                <span className="text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>{recordFacts.recordCount}건</span>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>출석 {recordFacts.presentCount}건 · 결석 {recordFacts.absentCount}건</p>
            </div>
            <div className="rounded-[14px] p-4" style={{ background: 'var(--spm-s3)' }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>추가 강사 계정은 기관 도입 상담으로 안내합니다.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>기록 연결 학생</h2>
          <div className="mt-5 space-y-2">
            <p className="rounded-[13px] p-3 text-[12px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--spm-grn)' }}>
              실제 수업 기록에 연결된 학생 {recordFacts.recordedStudentCount}명
            </p>
          </div>
          <Link href="/spokedu-master/students" className="mt-4 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>학생 이력 확인</Link>
        </section>
      </div>

      <section className="mx-[22px] mt-5 grid gap-3 sm:mx-8 md:grid-cols-3 lg:mx-10">
        <Link href="/spokedu-master/report" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><FileText size={19} color="var(--spm-acc)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>센터 설명 문구</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>수업 가치 문구 정리</span></span>
        </Link>
        <Link href="/spokedu-master/class-record" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(16,185,129,0.14)' }}><MessageCircle size={19} color="var(--spm-grn)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>수업 기록</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>출석과 관찰 기록</span></span>
        </Link>
        <Link href="/spokedu-master/profile" className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: 'rgba(245,158,11,0.14)' }}><CreditCard size={19} color="var(--spm-amb)" /></span>
          <span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>센터 플랜</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>이용 범위와 기관 도입 문의</span></span>
        </Link>
      </section>

      <section className="mx-[22px] mt-5 sm:mx-8 lg:mx-10">
        <OperationsPanel compact />
      </section>

      {profile?.plan === 'team' ? (
        <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.28)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>center plan</p>
          <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 플랜 사용 중</h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
            센터 수업 자료와 기관용 설명 문구를 활용할 수 있습니다. 현재 수업 계획 {lessons.length}개가 운영 중입니다.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ['이용권', '30일'],
              ['계정', '현재 사용자'],
              ['기록', `${records.length}건`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
                <p className="mt-1 text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-[22px] mt-5 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid rgba(99,102,241,0.28)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>center plan</p>
          <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>Center 플랜으로 전환하기</h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
            센터 수업 자료와 기관용 설명 문구를 활용하려면 Center 플랜을 선택하세요. 추가 강사 계정이나 기관 도입은 별도 문의로 안내합니다.
          </p>
          <Link
            href="/spokedu-master/payment?plan=team"
            className="mt-5 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            Center 30일 이용권 · 79,000원
          </Link>
        </section>
      )}
    </div>
  );
}
