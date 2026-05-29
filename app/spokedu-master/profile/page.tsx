'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  MonitorPlay,
  Pencil,
  ShoppingBag,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile } from '../store';
import type { PlanType } from '../types';

type PlanInfo = {
  id: PlanType | 'lite' | 'school';
  title: string;
  price: string;
  badge: string;
  description: string;
  includes: string[];
  target: string;
  action: string;
  recommended?: boolean;
  contact?: boolean;
};

const PLANS: PlanInfo[] = [
  {
    id: 'free',
    title: 'Trial',
    price: '14일 무료',
    badge: '체험',
    description: '라이브러리와 SPOMOVE의 핵심 흐름을 먼저 확인하는 체험 플랜입니다.',
    includes: ['일부 프로그램 열람', 'SPOMOVE 제한 체험', '수업 설명 문구 체험'],
    target: '처음 확인하는 개인 강사·교사',
    action: '체험 유지',
  },
  {
    id: 'lite',
    title: 'Lite',
    price: '19,900원/월',
    badge: '준비 중',
    description: '가벼운 개인 사용자를 위한 입문 플랜입니다. 현재는 Pro 전환을 우선 안내합니다.',
    includes: ['라이브러리 기본 이용', 'SPOMOVE 제한 실행', '최근 사용·즐겨찾기'],
    target: '가벼운 개인 사용',
    action: '준비 중',
  },
  {
    id: 'pro',
    title: 'Pro',
    price: '39,900원/월',
    badge: '추천',
    description: '수업 준비, SPOMOVE 실행, 설명 문구까지 개인 강사가 매주 쓰는 표준 플랜입니다.',
    includes: ['전체 프로그램 라이브러리', 'SPOMOVE 큰 화면 실행', '수업 설명 문구', '추천 수업·최근 사용'],
    target: '매주 수업을 준비하는 전문 강사',
    action: 'Pro 전환',
    recommended: true,
  },
  {
    id: 'team',
    title: 'Center',
    price: '79,000원/월',
    badge: '강사 3명 포함',
    description: '센터·도장·체육관에서 여러 강사가 같은 수업 품질과 설명 자료를 공유하는 플랜입니다.',
    includes: ['Pro 기능 전체', '강사 3명 포함', '센터용 수업 설명 자료', '추가 강사 확장'],
    target: '센터·도장·체육관',
    action: 'Center 시작',
  },
  {
    id: 'school',
    title: 'School',
    price: '문의',
    badge: '학교·기관',
    description: '학교 체육수업과 기관 라이선스에 맞춘 별도 도입 플랜입니다.',
    includes: ['학교용 언어와 자료', '교사 계정', '기관 견적'],
    target: '학교·기관·공공 프로젝트',
    action: '상담 문의',
    contact: true,
  },
];

const QUICK_ACTIONS = [
  {
    icon: BookOpen,
    title: '수업안 열기',
    caption: '오늘 쓸 패키지 찾기',
    href: '/spokedu-master/library',
  },
  {
    icon: MonitorPlay,
    title: '큰 화면 실행',
    caption: '체육관 TV와 빔 연결',
    href: '/spokedu-master/spomove',
  },
  {
    icon: FileText,
    title: '설명 문구',
    caption: '수업 후 안내문 만들기',
    href: '/spokedu-master/report',
  },
  {
    icon: CalendarDays,
    title: '주간 계획',
    caption: '이번 주 수업 흐름 정리',
    href: '/spokedu-master/plan',
  },
];

const EXPANSION_LINKS = [
  {
    icon: ClipboardList,
    label: '수업 기록',
    caption: '수업 후 출석과 관찰을 남깁니다.',
    href: '/spokedu-master/class-record',
  },
  {
    icon: UsersRound,
    label: '학생 이력',
    caption: '기록에서 남은 성장 근거를 봅니다.',
    href: '/spokedu-master/students',
  },
  {
    icon: Building2,
    label: '센터 운영',
    caption: '수업안과 기록 흐름을 확인합니다.',
    href: '/spokedu-master/director',
  },
  {
    icon: ShoppingBag,
    label: '수업 준비 키트',
    caption: '수업안에 맞는 준비물을 확인합니다.',
    href: '/spokedu-master/shop',
  },
];

function planName(plan: PlanType | undefined) {
  if (plan === 'team') return 'Center';
  if (plan === 'pro') return 'Pro';
  return 'Trial';
}

function planStatusText(plan: PlanType | undefined, daysLeft: number, isAdmin?: boolean) {
  if (isAdmin) return '관리자 패스';
  if (plan === 'pro' || plan === 'team') return '활성 구독';
  if (daysLeft > 0) return `체험 ${daysLeft}일 남음`;
  return '체험 종료';
}

function MenuRow({ icon: Icon, label, caption, href, onClick }: { icon: LucideIcon; label: string; caption: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s3)' }}>
        <Icon size={18} color="var(--spm-t2)" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
        <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      {content}
    </button>
  );
}

function PlanCard({ plan, current, onSelect }: { plan: PlanInfo; current: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-[16px] p-4 text-left transition-none active:scale-[0.99]"
      style={{
        background: plan.recommended ? 'linear-gradient(135deg, rgba(99,102,241,0.22), var(--spm-s2))' : 'var(--spm-s2)',
        border: current ? '1px solid rgba(16,185,129,0.55)' : plan.recommended ? '1px solid rgba(99,102,241,0.44)' : '1px solid var(--spm-br2)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: plan.recommended ? '#a5b4fc' : 'var(--spm-t3)' }}>{plan.badge}</span>
          <h3 className="mt-1 text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{plan.title}</h3>
        </div>
        <span className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{plan.price}</span>
      </div>
      <p className="mt-3 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{plan.description}</p>
      <p className="mt-3 rounded-[10px] px-3 py-2 text-[11px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{plan.target}</p>
      <ul className="mt-4 space-y-2">
        {plan.includes.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}>
            <CheckCircle2 size={14} color="var(--spm-grn)" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-[10px] px-3 py-2 text-center text-[11px] font-black" style={{ background: current ? 'rgba(16,185,129,0.12)' : plan.recommended ? 'rgba(99,102,241,0.18)' : 'var(--spm-s3)', color: current ? 'var(--spm-grn)' : plan.recommended ? '#c4b5fd' : 'var(--spm-t2)' }}>
        {current ? '현재 플랜' : plan.action}
      </p>
    </button>
  );
}

function PlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const currentPlan = profile?.plan ?? 'free';

  const selectPlan = (plan: PlanInfo) => {
    if (plan.id === currentPlan) return;
    if (plan.id === 'school' || plan.contact) {
      setNotice('학교·기관 플랜은 도입 범위와 계정 수가 달라 별도 상담으로 진행합니다. support@spokedu.com으로 문의해 주세요.');
      return;
    }
    if (plan.id === 'lite') {
      setNotice('Lite 플랜은 준비 중입니다. 현재는 Pro 또는 Center 플랜을 우선 제공합니다.');
      return;
    }
    if (plan.id === 'free') {
      setNotice('무료 체험은 신규 계정에 자동 적용됩니다. 이미 체험 중이라면 현재 상태가 유지됩니다.');
      return;
    }
    onClose();
    router.push(`/spokedu-master/payment?plan=${plan.id}`);
  };

  return (
    <BottomSheet open={open} title="플랜 선택" onClose={onClose}>
      <div className="space-y-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan} onSelect={() => selectPlan(plan)} />
        ))}
        {notice ? (
          <p className="rounded-[12px] p-3 text-[12px] font-bold leading-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>
            {notice}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function ProfileSheet({
  open,
  onClose,
  name,
  school,
  setName,
  setSchool,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  school: string;
  setName: (value: string) => void;
  setSchool: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet open={open} title="프로필 편집" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
            style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>소속</span>
          <input
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="센터명, 학교명, 팀명"
            className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
            style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          />
        </label>
        <button type="button" onClick={onSave} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
          저장
        </button>
      </div>
    </BottomSheet>
  );
}

export default function SpokeduMasterProfilePage() {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const resetProfile = useMasterStore((state) => state.resetProfile);
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [loggingOut, setLoggingOut] = useState(false);

  const currentPlan = profile?.plan ?? 'free';
  const daysLeft = getTrialDaysLeft(profile);
  const currentPlanName = planName(currentPlan);
  const statusText = planStatusText(currentPlan, daysLeft, profile?.isAdmin);
  const initial = (profile?.name ?? '선생님').slice(0, 1);

  const saveProfile = () => {
    setProfile({ name: name.trim() || '선생님', school: school.trim() });
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    resetProfile();
    router.replace('/spokedu-master/landing');
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="mx-auto max-w-[1180px] px-5 pb-6 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full text-[26px] font-black text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
            <h1 className="mt-1 truncate text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
              {profile?.name ?? '선생님'}
            </h1>
            <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
              {profile?.school || '소속을 설정해 주세요'}
            </p>
          </div>
          <button type="button" onClick={() => setProfileOpen(true)} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
            <Pencil size={15} />
            프로필 편집
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-7 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-[22px] p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(16,185,129,0.12), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.34)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--spm-t2)' }}>
                <Sparkles size={13} />
                현재 플랜
              </span>
              <span className="rounded-full px-3 py-1 text-[11px] font-black" style={{ background: currentPlan !== 'free' ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: currentPlan !== 'free' ? 'var(--spm-grn)' : 'var(--spm-yel)' }}>
                {statusText}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[34px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{currentPlanName}</h2>
              <Link href="/spokedu-master/subscription" className="rounded-[12px] px-4 py-3 text-[13px] font-black" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                구독 관리
              </Link>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Link href="/spokedu-master/dashboard" className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                홈으로 돌아가 수업 실행
              </Link>
              <button type="button" onClick={() => setPlanOpen(true)} className="h-12 rounded-[12px] px-5 text-[14px] font-black" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                플랜 보기
              </button>
            </div>
            {currentPlan === 'free' ? (
              <p className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                체험 기간 동안 홈, 라이브러리, 큰 화면 실행 흐름을 먼저 확인합니다.
              </p>
            ) : null}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Account Actions</p>
                <h2 className="mt-1 text-[20px] font-black" style={{ color: 'var(--spm-t)' }}>내 계정에서 바로 할 일</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="rounded-[16px] p-4 transition active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <Icon size={18} color="var(--spm-acc)" />
                  <p className="mt-3 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{item.title}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{item.caption}</p>
                </Link>
              );
            })}
            </div>
          </section>

          <PwaInstallCard />
        </div>

        <aside className="space-y-3">
          <MenuRow icon={MonitorPlay} label="SPOMOVE 큰 화면" caption="수업 공간에서 바로 실행" href="/spokedu-master/spomove" />
          <MenuRow icon={CalendarDays} label="수업 계획" caption="주간 수업 흐름 정리" href="/spokedu-master/plan" />
          <MenuRow icon={CreditCard} label="구독 관리" caption="플랜 변경 · 결제 수단 · 구독 취소" href="/spokedu-master/subscription" />
          <MenuRow icon={HelpCircle} label="도입 상담" caption="센터·학교 도입 문의" href="mailto:support@spokedu.com" />
          <MenuRow icon={Mail} label="문의하기" caption="기능 제안과 오류 제보" href="mailto:support@spokedu.com" />

          <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Expansion</p>
              <h2 className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>확장 기능 준비</h2>
              <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
                Phase 1에서는 라이브러리, SPOMOVE, 설명 문구를 우선 완성합니다.
              </p>
            </div>
            <div className="grid gap-2">
              {EXPANSION_LINKS.map((item) => (
                <MenuRow key={item.label} icon={item.icon} label={item.label} caption={item.caption} href={item.href} />
              ))}
            </div>
          </section>

        </aside>
      </main>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={name}
        school={school}
        setName={setName}
        setSchool={setSchool}
        onSave={saveProfile}
      />
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />

      <div className="mx-auto max-w-[1180px] px-5 pt-7 sm:px-8">
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-black disabled:opacity-50"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t3)' }}
        >
          <LogOut size={15} />
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
        <p className="text-[10px]" style={{ color: 'var(--spm-t3)' }}>
          <Link href="/spokedu-master/terms" style={{ color: 'var(--spm-t3)' }}>이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/spokedu-master/privacy" style={{ color: 'var(--spm-t3)' }}>개인정보처리방침</Link>
          <span className="mx-2">·</span>
          <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-t3)' }}>support@spokedu.com</a>
        </p>
      </div>
    </div>
  );
}
