'use client';

import Link from 'next/link';
import { BookOpen, FileText, Lock, MonitorPlay, Sparkles, Timer, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { getTrialDaysLeft, isPaidAccessExpired, isTrialExpired } from '../../lib/subscription';
import { useProfile } from '../../store';

const PLAN_FEATURES: Record<string, { icon: typeof BookOpen; label: string }[]> = {
  library: [
    { icon: BookOpen, label: '전체 수업 자료와 준비 자료' },
    { icon: MonitorPlay, label: 'SPOMOVE 공식 화면 활동' },
    { icon: FileText, label: '학부모·기관 안내문 문구' },
  ],
  spomove: [
    { icon: MonitorPlay, label: 'SPOMOVE 큰 화면 실행' },
    { icon: Sparkles, label: 'TV·빔용 Class Mode' },
    { icon: BookOpen, label: '라이브러리 수업 자료 연결' },
  ],
  report: [
    { icon: FileText, label: '대상별 수업 안내문' },
    { icon: BookOpen, label: '수업 자료 기반 안내문 작성' },
    { icon: Sparkles, label: '보호자·기관·학교용 복사' },
  ],
  'class-tools': [
    { icon: Timer, label: '스톱워치와 점수판' },
    { icon: Users, label: '학생 뽑기와 팀 나누기' },
    { icon: Sparkles, label: '수업 중 진행 도구' },
  ],
};

type TrialGateWallProps = {
  children: ReactNode;
  feature: 'library' | 'spomove' | 'report' | 'class-tools';
};

export function TrialGateWall({ children, feature }: TrialGateWallProps) {
  const profile = useProfile();
  const expired = isTrialExpired(profile);
  const paidExpired = isPaidAccessExpired(profile);

  if (!expired) return <>{children}</>;

  const features = PLAN_FEATURES[feature] ?? PLAN_FEATURES.library!;

  return (
    <div className="relative h-full overflow-hidden bg-[#f5f7fb]">
      <div className="pointer-events-none absolute inset-0 z-0 select-none opacity-20 blur-[3px]">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-[#f5f7fb] from-60% to-[#f5f7fb]/80 p-6">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-[18px] border border-red-200 bg-red-50">
            <Lock size={24} className="text-red-600" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600">{paidExpired ? '이용권 만료' : '체험 기간 종료'}</p>
          <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.03em] text-slate-950">
            30일 이용권을 다시 결제하고 계속 사용하세요.
          </h2>
          <p className="mt-3 text-[14px] font-medium leading-6 text-slate-500">
            수업 자료, SPOMOVE 화면 활동, 안내문과 수업 운영 도구를 계속 이용할 수 있습니다.
          </p>
          <ul className="mt-5 space-y-2">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[13px] font-semibold text-slate-600">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-indigo-50">
                  <Icon size={14} className="text-indigo-600" />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-7 space-y-2">
            <Link href="/spokedu-master/payment?plan=pro" className="flex h-12 w-full items-center justify-center rounded-[12px] bg-indigo-600 text-[14px] font-black text-white shadow-lg shadow-indigo-200">
              Pro 30일 이용권 · 39,900원
            </Link>
            <Link href="mailto:support@spokedu.com?subject=SPOKEDU%20MASTER%20Center%20%EB%8F%84%EC%9E%85%20%EC%83%81%EB%8B%B4" className="flex h-12 w-full items-center justify-center rounded-[12px] border border-emerald-200 bg-white text-[13px] font-black text-emerald-700">
              Center 도입 상담
            </Link>
            <Link href="/spokedu-master/subscription" className="flex h-10 w-full items-center justify-center rounded-[12px] text-[12px] font-semibold text-slate-500">
              플랜 비교 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrialCountdownBanner() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);
  if (profile?.isAdmin) return null;
  if ((profile?.plan ?? 'free') !== 'free') return null;
  if (daysLeft <= 0 || daysLeft > 7) return null;

  return (
    <div className="mx-[22px] mt-3 flex items-center justify-end gap-2 sm:mx-8 lg:mx-10" role="status">
      <span className="inline-flex min-h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-[11px] font-black text-amber-800">
        무료 체험 D-{daysLeft}
      </span>
      <Link href="/spokedu-master/profile?plans=1" className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-3 text-[11px] font-black text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
        이용권 보기
      </Link>
    </div>
  );
}
