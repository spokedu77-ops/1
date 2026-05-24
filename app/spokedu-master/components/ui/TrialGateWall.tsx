'use client';

import Link from 'next/link';
import { BookOpen, FileText, Lock, MonitorPlay, Sparkles, Timer, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { getTrialDaysLeft, isTrialExpired } from '../../lib/subscription';
import { useProfile } from '../../store';

const PLAN_FEATURES: Record<string, { icon: typeof BookOpen; label: string }[]> = {
  library: [
    { icon: BookOpen, label: '전체 수업안과 준비물' },
    { icon: MonitorPlay, label: 'SPOMOVE 연동 활동' },
    { icon: FileText, label: '학부모·기관 설명 문구' },
  ],
  spomove: [
    { icon: MonitorPlay, label: 'SPOMOVE 큰 화면 실행' },
    { icon: Sparkles, label: 'TV·빔용 Class Mode' },
    { icon: BookOpen, label: '라이브러리 수업안 연결' },
  ],
  report: [
    { icon: FileText, label: '대상별 수업 설명 문구' },
    { icon: BookOpen, label: '수업안 기반 자동 초안' },
    { icon: Sparkles, label: '보호자·기관·학교용 복사' },
  ],
  'class-tools': [
    { icon: Timer, label: '스톱워치 · 점수판' },
    { icon: Users, label: '학생 뽑기 · 팀 나누기' },
    { icon: Sparkles, label: '수업 중 진행 콘솔' },
  ],
};

type TrialGateWallProps = {
  children: ReactNode;
  feature: 'library' | 'spomove' | 'report' | 'class-tools';
};

export function TrialGateWall({ children, feature }: TrialGateWallProps) {
  const profile = useProfile();
  const expired = isTrialExpired(profile);

  if (!expired) return <>{children}</>;

  const features = PLAN_FEATURES[feature] ?? PLAN_FEATURES.library!;

  return (
    <div className="relative h-full overflow-hidden" style={{ background: '#f5f7fb' }}>
      <div className="pointer-events-none absolute inset-0 z-0 select-none opacity-20 blur-[3px]">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6" style={{ background: 'linear-gradient(to top, rgba(245,247,251,0.98) 60%, rgba(245,247,251,0.78))' }}>
        <div className="w-full max-w-[440px]">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-[18px]" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Lock size={24} color="var(--spm-red)" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-red)' }}>체험 기간 종료</p>
          <h2 className="mt-2 text-[28px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: '#0f172a', letterSpacing: 0, wordBreak: 'keep-all' }}>
            계속 쓰려면 플랜을 선택해 주세요.
          </h2>
          <p className="mt-3 text-[14px] font-medium leading-6" style={{ color: '#64748b' }}>
            수업안, SPOMOVE 큰 화면, 설명 문구, 수업 진행 콘솔을 하나의 수업 루프로 계속 사용할 수 있습니다.
          </p>
          <ul className="mt-5 space-y-2">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[13px] font-semibold" style={{ color: '#475569' }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]" style={{ background: 'rgba(99,102,241,0.14)' }}>
                  <Icon size={14} color="var(--spm-acc)" />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-7 space-y-2">
            <Link href="/spokedu-master/payment?plan=pro" className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.32)' }}>
              Pro로 수업 루프 계속 쓰기 · 월 39,900원
            </Link>
            <Link href="/spokedu-master/payment?plan=team" className="flex h-12 w-full items-center justify-center rounded-[12px] text-[13px] font-black" style={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--spm-grn)' }}>
              Center 플랜 · 강사 3명 포함 월 79,000원
            </Link>
            <Link href="/spokedu-master/subscription" className="flex h-10 w-full items-center justify-center rounded-[12px] text-[12px] font-semibold" style={{ color: '#64748b' }}>
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

  const tone =
    daysLeft <= 2
      ? { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)', text: 'var(--spm-red)', chip: 'rgba(239,68,68,0.14)' }
      : daysLeft <= 5
        ? { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)', text: 'var(--spm-amb)', chip: 'rgba(245,158,11,0.14)' }
        : { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)', text: 'var(--spm-acc)', chip: 'rgba(99,102,241,0.12)' };

  return (
    <div className="mx-[22px] mt-3 flex items-center justify-between gap-3 rounded-[12px] px-3 py-2 sm:mx-8 lg:mx-10" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <p className="text-[12px] font-bold" style={{ color: tone.text }}>
        체험 기간 <strong>{daysLeft}일</strong> 남았습니다.
      </p>
      <Link href="/spokedu-master/payment?plan=pro" className="shrink-0 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: tone.chip, color: tone.text }}>
        Pro 전환
      </Link>
    </div>
  );
}
