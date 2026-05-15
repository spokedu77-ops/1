'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, ClipboardList, CreditCard, HelpCircle, Mail, MonitorPlay, Pencil, ShieldCheck, ShoppingBag, Smartphone, Sparkles, UsersRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
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
    badge: '시작 검증',
    description: '라이브러리와 SPOMOVE의 핵심 경험을 확인합니다.',
    includes: ['일부 프로그램 열람', 'SPOMOVE 제한 체험', '수업 설명 도구 체험'],
    target: '처음 확인하는 개인 강사·교사',
    action: '체험 유지',
  },
  {
    id: 'lite',
    title: 'Lite',
    price: '19,900원/월',
    badge: '개인 강사',
    description: '수업 준비와 SPOMOVE 체험을 가볍게 시작합니다.',
    includes: ['라이브러리 기본 이용', 'SPOMOVE 월 제한 실행', '즐겨찾기와 최근 사용'],
    target: '가벼운 개인 사용',
    action: '관심 등록',
  },
  {
    id: 'pro',
    title: 'Pro',
    price: '39,900원/월',
    badge: '추천',
    description: '전문 강사가 매주 쓰는 수업 준비 환경입니다.',
    includes: ['전체 프로그램', 'SPOMOVE 무제한', '수업 설명 도구 전체'],
    target: '매주 수업을 준비하는 전문 강사',
    action: 'Pro 적용',
    recommended: true,
  },
  {
    id: 'team',
    title: 'Center',
    price: '79,000원/월',
    badge: '3명 포함',
    description: '센터와 도장이 강사 수업 품질을 맞추는 플랜입니다.',
    includes: ['강사 3명 포함', '센터용 설명 도구', '추가 강사 확장'],
    target: '센터·도장·체육관',
    action: 'Center 적용',
  },
  {
    id: 'school',
    title: 'School',
    price: '문의',
    badge: '학교/기관',
    description: '학교 체육수업과 기관 라이선스에 맞춘 도입형 플랜입니다.',
    includes: ['학교용 언어와 자료', '교사 계정', '기관 견적'],
    target: '학교·기관·공공 프로젝트',
    action: '상담 문의',
    contact: true,
  },
];

function PlanCard({ plan, current, onSelect }: { plan: PlanInfo; current: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="w-full rounded-[16px] p-4 text-left transition active:scale-[0.99]" style={{ background: plan.recommended ? 'linear-gradient(135deg, rgba(99,102,241,0.22), var(--spm-s2))' : 'var(--spm-s2)', border: current ? '1px solid rgba(16,185,129,0.55)' : plan.recommended ? '1px solid rgba(99,102,241,0.44)' : '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: plan.recommended ? '#a5b4fc' : 'var(--spm-t3)' }}>{plan.badge}</span>
          <h3 className="mt-1 text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{plan.title}</h3>
        </div>
        <span className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{plan.price}</span>
      </div>
      <p className="mt-3 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>{plan.description}</p>
      <p className="mt-2 rounded-[10px] px-3 py-2 text-[11px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{plan.target}</p>
      <ul className="mt-4 space-y-2">{plan.includes.map((item) => <li key={item} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}><CheckCircle2 size={14} color="var(--spm-grn)" />{item}</li>)}</ul>
      {current ? <p className="mt-4 rounded-[10px] px-3 py-2 text-center text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>현재 플랜</p> : null}
      {!current ? <p className="mt-4 rounded-[10px] px-3 py-2 text-center text-[11px] font-black" style={{ background: plan.recommended ? 'rgba(99,102,241,0.18)' : 'var(--spm-s3)', color: plan.recommended ? '#c4b5fd' : 'var(--spm-t2)' }}>{plan.action}</p> : null}
    </button>
  );
}

function MenuRow({ icon: Icon, label, caption, href, onClick }: { icon: LucideIcon; label: string; caption: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s3)' }}><Icon size={18} color="var(--spm-t2)" /></span>
      <span className="min-w-0 flex-1 text-left"><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{label}</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{caption}</span></span>
    </>
  );
  if (href) return <Link href={href} className="flex items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>{content}</Link>;
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>{content}</button>;
}

function ExpansionLink({ icon: Icon, label, caption, href }: { icon: LucideIcon; label: string; caption: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[12px] px-1 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]" style={{ background: 'var(--spm-s3)' }}>
        <Icon size={17} color="var(--spm-t2)" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
        <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
      </span>
    </Link>
  );
}

function PlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const currentPlan = profile?.plan ?? 'free';

  const selectPlan = (plan: PlanInfo) => {
    if (plan.id === 'school' || plan.contact) {
      setNotice('학교와 기관 플랜은 견적과 도입 범위가 달라 상담으로 진행합니다. 문의: hello@spokedu.kr');
      return;
    }
    if (plan.id === 'lite') {
      setNotice('Lite는 관심 등록 단계입니다. Pro/Center 전환 흐름을 먼저 검증 중이며, 준비되는 대로 안내드립니다.');
      return;
    }
    if (plan.id === 'pro' || plan.id === 'team') {
      onClose();
      router.push(`/spokedu-master/payment?plan=${plan.id}`);
      return;
    }
  };

  return (
    <BottomSheet open={open} title="플랜 선택" onClose={onClose}>
      <div className="space-y-3">
        {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan} onSelect={() => selectPlan(plan)} />)}
        {notice ? <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>{notice}</p> : null}
      </div>
    </BottomSheet>
  );
}

export default function SpokeduMasterProfilePage() {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const currentPlan = profile?.plan ?? 'free';
  const daysLeft = getTrialDaysLeft(profile);
  const planName = currentPlan === 'team' ? 'Center' : currentPlan === 'pro' ? 'Pro' : 'Trial';
  const valueCards = [
    ['라이브러리', '오늘 쓸 수업안을 빠르게 찾기'],
    ['SPOMOVE', '웹에서 큰 화면 활동 바로 실행'],
    ['설명 도구', '대상별 수업 설명 문구 복사'],
  ];

  const saveProfile = () => {
    setProfile({ name: name.trim() || '선생님', school: school.trim() });
    setProfileOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-6 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full text-[26px] font-black text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>{(profile?.name ?? '선생님').slice(0, 1)}</div>
          <div className="min-w-0 flex-1"><h1 className="truncate text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{profile?.name ?? '선생님'}</h1><p className="mt-1 truncate text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>{profile?.school || '소속을 설정해 주세요'}</p><p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>SPOKEDU PRO · {planName}</p></div>
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><Pencil size={15} />프로필 편집</button>
      </header>

      <main className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-[18px] p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(16,185,129,0.12), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.34)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#a5b4fc' }}>current plan</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-2"><h2 className="text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{planName}</h2><span className="text-[13px] font-black" style={{ color: 'var(--spm-t2)' }}>{currentPlan === 'free' ? `${daysLeft}일 남음` : '활성화됨'}</span></div>
            <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>첫 상용 버전은 라이브러리, SPOMOVE, 수업 설명 도구를 중심으로 제공합니다. 기록과 리포트 자동화는 안정화 후 확장합니다.</p>
            <button type="button" onClick={() => setPlanOpen(true)} className="mt-5 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>플랜과 도입 방식 보기</button>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {valueCards.map(([title, caption]) => <div key={title} className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><p className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{title}</p><p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{caption}</p></div>)}
          </section>

          <PwaInstallCard />
        </div>

        <div className="space-y-3">
          <MenuRow icon={MonitorPlay} label="SPOMOVE 큰 화면 실행" caption="수업 공간에서 바로 실행" href="/spokedu-master/spomove/session?mode=projector" />
          <MenuRow icon={Smartphone} label="홈 화면에 추가" caption="PWA로 빠르게 열기" href="/spokedu-master/profile" />
          <MenuRow icon={CreditCard} label="플랜과 도입 방식" caption="Trial, Lite, Pro, Center, School" onClick={() => setPlanOpen(true)} />
          <MenuRow icon={HelpCircle} label="도입 상담" caption="센터와 학교용 도입 문의" href="mailto:support@spokedu.com" />
          <MenuRow icon={Mail} label="문의하기" caption="기능 제안과 오류 제보" href="mailto:support@spokedu.com" />
          <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>expansion</p>
              <h2 className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>운영 확장 프리뷰</h2>
              <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>기록과 조직 기능은 보존하되, 첫 화면의 핵심 흐름을 흐리지 않도록 이곳에 모았습니다.</p>
            </div>
            <div className="grid gap-2">
              <ExpansionLink icon={ClipboardList} label="수업 기록" caption="출석과 관찰 기록 프리뷰" href="/spokedu-master/class-record" />
              <ExpansionLink icon={UsersRound} label="학생 이력" caption="누적 성장 기록 프리뷰" href="/spokedu-master/students" />
              <ExpansionLink icon={Building2} label="센터 운영" caption="센터·강사 운영 프리뷰" href="/spokedu-master/director" />
              <ExpansionLink icon={ShoppingBag} label="교구 스토어" caption="수업 준비물 견적 요청" href="/spokedu-master/shop" />
            </div>
          </section>
          <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex items-center gap-2"><ShieldCheck size={17} color="var(--spm-grn)" /><h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>안심 운영 원칙</h2></div>
            <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>외부 자동 발송, 학생 상세 기록, 센터 대시보드는 검증 전까지 과하게 약속하지 않습니다. 먼저 수업 준비와 몰입 경험을 완성합니다.</p>
          </section>
        </div>
      </main>

      <BottomSheet open={profileOpen} title="프로필 편집" onClose={() => setProfileOpen(false)}>
        <div className="space-y-4">
          <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
          <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>소속</span><input value={school} onChange={(event) => setSchool(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
          <button type="button" onClick={saveProfile} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>저장</button>
        </div>
      </BottomSheet>
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />
      <div className="px-[22px] pt-6 sm:px-8 lg:px-10">
        <p className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--spm-t3)' }}><Sparkles size={13} />상용화 첫 버전은 라이브러리와 SPOMOVE의 즉시 가치를 선명하게 보여주는 데 집중합니다.</p>
        <p className="mt-4 text-[10px]" style={{ color: 'var(--spm-t3)' }}>
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
