'use client';

import Link from 'next/link';
import { Building2, CheckCircle2, ClipboardList, CreditCard, HelpCircle, Mail, MonitorPlay, Pencil, ShieldCheck, ShoppingBag, Smartphone, Sparkles, UsersRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { getTrialDaysLeft, isTrialExpired } from '../lib/subscription';
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

type NoticeType = 'applied' | 'school' | 'lite' | null;

function PlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const [noticeType, setNoticeType] = useState<NoticeType>(null);
  const [noticeText, setNoticeText] = useState('');
  const currentPlan = profile?.plan ?? 'free';

  const selectPlan = (plan: PlanInfo) => {
    if (plan.id === 'school' || plan.contact) {
      setNoticeType('school');
      setNoticeText('학교와 기관 플랜은 견적과 도입 범위가 달라 개별 상담으로 진행합니다.');
      return;
    }
    if (plan.id === 'lite') {
      setNoticeType('lite');
      setNoticeText('Lite 플랜은 현재 준비 중입니다. 관심 등록 후 출시되면 먼저 안내드립니다.');
      return;
    }
    setProfile({ plan: plan.id, role: plan.id === 'team' ? 'director' : 'teacher' });
    setNoticeType('applied');
    setNoticeText(`${plan.title} 플랜이 적용되었습니다.`);
  };

  return (
    <BottomSheet open={open} title="플랜 선택" onClose={onClose}>
      <div className="space-y-3">
        {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} current={plan.id === currentPlan} onSelect={() => selectPlan(plan)} />)}
        {noticeType ? (
          <div className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>{noticeText}</p>
            {noticeType === 'school' ? (
              <a href="mailto:contact@spokedu.kr?subject=%ED%95%99%EA%B5%90%2F%EA%B8%B0%EA%B4%80%20%ED%94%8C%EB%9E%9C%20%EC%83%81%EB%8B%B4%20%EB%AC%B8%EC%9D%98" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[10px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                <Mail size={14} />
                상담 이메일 보내기
              </a>
            ) : noticeType === 'lite' ? (
              <a href="mailto:contact@spokedu.kr?subject=Lite+%ED%94%8C%EB%9E%9C+%EA%B4%80%EC%8B%AC+%EB%93%B1%EB%A1%9D" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[10px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                <Mail size={14} />
                관심 등록 이메일 보내기
              </a>
            ) : null}
          </div>
        ) : null}
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
  const expired = isTrialExpired(profile);
  const planName = currentPlan === 'team' ? 'Center' : currentPlan === 'pro' ? 'Pro' : expired ? '체험 만료' : 'Trial';
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
            <div className="mt-3 flex flex-wrap items-end justify-between gap-2"><h2 className="text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: expired ? 'var(--spm-amb)' : 'var(--spm-t)', letterSpacing: 0 }}>{planName}</h2><span className="text-[13px] font-black" style={{ color: expired ? 'var(--spm-amb)' : 'var(--spm-t2)' }}>{currentPlan === 'free' ? (expired ? '내 정보에서 플랜을 확인하세요' : `${daysLeft}일 남음`) : '활성화됨'}</span></div>
            <p className="mt-3 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>라이브러리, SPOMOVE, 수업 설명 도구가 포함됩니다. 수업 기록, 학생 이력, 센터 대시보드도 함께 사용할 수 있습니다.</p>
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
              <h2 className="mt-1 text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>추가 기능</h2>
              <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>수업 기록, 학생 이력, 센터 운영, 교구 스토어를 이곳에서 바로 이동할 수 있습니다.</p>
            </div>
            <div className="grid gap-2">
              <ExpansionLink icon={ClipboardList} label="수업 기록" caption="출석, 동작 체크, 보호자 안내" href="/spokedu-master/class-record" />
              <ExpansionLink icon={UsersRound} label="학생 이력" caption="누적 성장 기록과 공유 링크" href="/spokedu-master/students" />
              <ExpansionLink icon={Building2} label="센터 운영" caption="강사 기록률과 케어 신호 확인" href="/spokedu-master/director" />
              <ExpansionLink icon={ShoppingBag} label="교구 스토어" caption="수업 준비물 견적 요청" href="/spokedu-master/shop" />
            </div>
          </section>
          <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex items-center gap-2"><ShieldCheck size={17} color="var(--spm-grn)" /><h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>데이터 보호 원칙</h2></div>
            <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>학생 기록은 기기에 저장되며 외부로 자동 전송되지 않습니다. 보호자 공유 링크는 7일 유효한 토큰 방식으로 동작합니다.</p>
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
      <div className="px-[22px] pt-6 sm:px-8 lg:px-10"><p className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--spm-t3)' }}><Sparkles size={13} />SPOKEDU PRO · 수업 준비는 쉽게, 수업은 더 몰입감 있게.</p></div>
    </div>
  );
}
