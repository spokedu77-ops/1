'use client';

import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, ChevronRight, CreditCard, HelpCircle, LogOut, Mail, MonitorPlay, Moon, PauseCircle, Pencil, ShieldCheck, ShoppingBag, Trash2, Volume2, WifiOff, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { OperationsPanel } from '../components/operations/OperationsPanel';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { getTrialDaysLeft } from '../lib/subscription';
import { formatReactionTime } from '../lib/utils';
import { useMasterStore, useProfile, useStats } from '../store';
import type { PlanType } from '../types';

const PLAN_DETAILS: Record<PlanType, { title: string; price: string; badge: string; kakao: string; ai: string; pdf: string; includes: string[] }> = {
  free: {
    title: '무료 체험',
    price: '14일 무료',
    badge: '시작 검증',
    kakao: '월 50건',
    ai: '월 5회',
    pdf: '개별 3명',
    includes: ['프로그램 일부 이용', '기본 수업 기록', '기존 데이터 열람'],
  },
  pro: {
    title: '개인 플랜',
    price: '29,000원/월',
    badge: '강사 1명',
    kakao: '월 200건',
    ai: '월 20회',
    pdf: '전체 학생',
    includes: ['153개 프로그램 전체', 'SPOMOVE 웹 실행', '카카오 요약 발송', '성장 리포트 PDF'],
  },
  team: {
    title: '센터 플랜',
    price: '79,000원/월',
    badge: '강사 3명 기본',
    kakao: '무제한',
    ai: '무제한',
    pdf: '일괄 생성',
    includes: ['원장 대시보드', '강사 기록률 관리', '이탈 위험 학생 알림', '센터 단위 리포트'],
  },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

function MenuRow({ icon: Icon, label, href, danger = false, onClick }: { icon: LucideIcon; label: string; href?: string; danger?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }}><Icon size={17} color={danger ? 'var(--spm-red)' : 'var(--spm-t2)'} /></span>
      <span className="min-w-0 flex-1 text-left text-[14px] font-bold" style={{ color: danger ? 'var(--spm-red)' : 'var(--spm-t)' }}>{label}</span>
      <ChevronRight size={16} color="var(--spm-t3)" />
    </>
  );
  if (href) return <Link href={href} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>{content}</Link>;
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>{content}</button>;
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-3 text-[13px] font-black" style={{ color: 'var(--spm-t3)' }}>{title}</h2><div className="space-y-2">{children}</div></section>;
}

function SettingRow({ icon: Icon, label, enabled, onToggle }: { icon: LucideIcon; label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }}><Icon size={17} color={enabled ? 'var(--spm-acc)' : 'var(--spm-t3)'} /></span>
      <span className="min-w-0 flex-1 text-left text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{label}</span>
      <span className="relative h-6 w-11 rounded-full p-0.5 transition" style={{ background: enabled ? 'var(--spm-acc)' : 'var(--spm-s4)' }} aria-hidden>
        <span className="block h-5 w-5 rounded-full bg-white transition" style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }} />
      </span>
    </button>
  );
}

function PlanCard({ id, selected, onSelect }: { id: PlanType; selected: boolean; onSelect: () => void }) {
  const plan = PLAN_DETAILS[id];
  return (
    <button type="button" onClick={onSelect} className="w-full rounded-[16px] p-4 text-left transition" style={{ background: selected ? 'rgba(99,102,241,0.16)' : 'var(--spm-s2)', border: selected ? '1px solid rgba(99,102,241,0.55)' : '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: selected ? '#a5b4fc' : 'var(--spm-t3)' }}>{plan.badge}</span><h3 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{plan.title}</h3></div>
        <span className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{plan.price}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <span className="rounded-[10px] p-2 text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>카카오 {plan.kakao}</span>
        <span className="rounded-[10px] p-2 text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>AI {plan.ai}</span>
        <span className="rounded-[10px] p-2 text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>PDF {plan.pdf}</span>
      </div>
      <ul className="mt-4 space-y-2">{plan.includes.map((item) => <li key={item} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--spm-t2)' }}><CheckCircle2 size={14} color="var(--spm-grn)" />{item}</li>)}</ul>
    </button>
  );
}

function PaymentFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(profile?.plan === 'team' ? 'team' : 'pro');
  const [method, setMethod] = useState<'card' | 'kakao' | 'naver'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const cardDigits = cardNumber.replace(/\D/g, '');
  const paymentReady = method !== 'card' || cardDigits.length === 16;
  const close = () => { setStep(0); onClose(); };

  return (
    <BottomSheet open={open} title="구독 플랜 선택" onClose={close}>
      {step === 0 ? (
        <div className="space-y-3">
          {(['free', 'pro', 'team'] as PlanType[]).map((id) => <PlanCard key={id} id={id} selected={selectedPlan === id} onSelect={() => setSelectedPlan(id)} />)}
          <button type="button" onClick={() => (selectedPlan === 'free' ? (setProfile({ plan: 'free' }), close()) : setStep(1))} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            {selectedPlan === 'free' ? '무료 플랜으로 변경' : '결제 정보 입력'}
          </button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">{[['card', '카드'], ['kakao', '카카오페이'], ['naver', '네이버페이']].map(([id, label]) => <button key={id} type="button" onClick={() => setMethod(id as 'card' | 'kakao' | 'naver')} className="h-10 rounded-[12px] text-[12px] font-black" style={{ background: method === id ? 'var(--spm-acc)' : 'var(--spm-s2)', color: method === id ? '#fff' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{label}</button>)}</div>
          {method === 'card' ? <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))} placeholder="카드번호 입력" inputMode="numeric" className="h-12 w-full rounded-[12px] border px-3 text-[15px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: cardDigits.length > 0 && cardDigits.length < 16 ? 'var(--spm-amb)' : 'var(--spm-br2)', color: 'var(--spm-t)' }} /> : null}
          {method === 'card' && cardDigits.length > 0 && cardDigits.length < 16 ? <p className="text-[11px] font-bold" style={{ color: 'var(--spm-amb)' }}>카드번호 16자리를 입력해 주세요.</p> : null}
          <p className="rounded-[12px] p-3 text-[11px] font-semibold leading-5" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)', border: '1px solid var(--spm-br2)' }}>{PLAN_DETAILS[selectedPlan].price} 플랜으로 시작하며, 언제든 프로필에서 변경할 수 있습니다.</p>
          <button type="button" disabled={!paymentReady} onClick={() => { setProfile({ plan: selectedPlan, role: selectedPlan === 'team' ? 'director' : profile?.role ?? 'teacher' }); setStep(2); }} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-45" style={{ background: 'var(--spm-acc)' }}>{PLAN_DETAILS[selectedPlan].title} 시작</button>
        </div>
      ) : null}
      {step === 2 ? <div className="py-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}><CreditCard size={28} color="var(--spm-grn)" /></div><h3 className="mt-5 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>구독이 활성화되었습니다</h3><p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--spm-t3)' }}>수업 기록, 카카오 발송, 리포트 생성 한도가 새 플랜 기준으로 적용됩니다.</p><button type="button" onClick={close} className="mt-6 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>확인</button></div> : null}
    </BottomSheet>
  );
}

function TrialJourney({ daysLeft }: { daysLeft: number }) {
  const steps = [
    ['Day 1', '라이브러리에서 실제 수업안 2개 저장'],
    ['Day 4', 'SPOMOVE 웹 실행 1회 이상'],
    ['Day 10', '수업 기록과 학생 이력 확인'],
    ['Day 14', '개인 또는 센터 플랜 전환 판단'],
  ];
  return (
    <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>trial journey</p>
      <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>무료 체험 {daysLeft}일 남음</h2>
      <div className="mt-4 space-y-2">{steps.map(([day, label], index) => <div key={day} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}><CheckCircle2 size={17} color={index === 0 ? 'var(--spm-grn)' : 'var(--spm-t3)'} /><span className="w-12 shrink-0 text-[11px] font-black" style={{ color: index === 0 ? 'var(--spm-grn)' : 'var(--spm-t3)' }}>{day}</span><span className="text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{label}</span></div>)}</div>
    </section>
  );
}

function CancelDefense({ open, onClose, recordCount, studentCount }: { open: boolean; onClose: () => void; recordCount: number; studentCount: number }) {
  const setProfile = useMasterStore((state) => state.setProfile);
  const [confirmText, setConfirmText] = useState('');
  const [pauseRequested, setPauseRequested] = useState(false);
  const canCancel = confirmText.trim() === '해지할게요';
  return (
    <BottomSheet open={open} title="구독 해지 확인" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }}>
          <div className="flex items-center gap-2 text-[14px] font-black" style={{ color: 'var(--spm-red)' }}><AlertTriangle size={18} />해지하면 새 기록 생성이 제한됩니다</div>
          <p className="mt-3 text-[13px] leading-6" style={{ color: 'var(--spm-t2)' }}>기존 데이터는 90일 보관되지만 학생 {studentCount}명의 성장 이력과 수업 기록 {recordCount}건을 활용한 카카오 발송과 PDF 자동 생성은 무료 한도 안에서만 사용할 수 있습니다.</p>
        </div>
        {pauseRequested ? <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--spm-amb)' }}>1개월 일시정지 요청을 준비했습니다. 데이터는 보존 상태로 전환합니다.</p> : null}
        <div className="grid gap-2">
          <button type="button" onClick={() => setPauseRequested(true)} className="flex items-center gap-3 rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><PauseCircle size={18} color="var(--spm-amb)" /><span><span className="block text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>1개월 일시정지</span><span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>비수기에 데이터를 보존만 합니다.</span></span></button>
          <button type="button" onClick={() => { setProfile({ plan: 'pro', role: 'teacher' }); onClose(); }} className="flex items-center gap-3 rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><CreditCard size={18} color="var(--spm-acc)" /><span><span className="block text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>개인 플랜으로 다운그레이드</span><span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>센터 기능만 줄이고 강사 기록 루프는 유지합니다.</span></span></button>
        </div>
        <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>해지 확정 문구 입력: 해지할게요</span><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
        <button type="button" disabled={!canCancel} onClick={() => { setProfile({ plan: 'free' }); onClose(); }} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-40" style={{ background: 'var(--spm-red)' }}>무료 플랜으로 전환</button>
      </div>
    </BottomSheet>
  );
}

export default function SpokeduMasterProfilePage() {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const students = useMasterStore((state) => state.students);
  const classRecords = useMasterStore((state) => state.classRecords);
  const stats = useStats();
  const [profileOpen, setProfileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [notificationOn, setNotificationOn] = useState(true);
  const [dndOn, setDndOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [accountNotice, setAccountNotice] = useState('');
  const currentPlan = profile?.plan ?? 'free';
  const planInfo = PLAN_DETAILS[currentPlan];
  const daysLeft = getTrialDaysLeft(profile);
  const progress = currentPlan === 'free' ? Math.min(100, Math.max(8, ((14 - daysLeft) / 14) * 100)) : 100;
  const saveProfile = () => { setProfile({ name: name.trim() || '선생님', school: school.trim() }); setProfileOpen(false); };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-6 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full text-[26px] font-black text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>{(profile?.name ?? '선생님').slice(0, 1)}</div>
          <div className="min-w-0 flex-1"><h1 className="truncate text-[26px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{profile?.name ?? '선생님'}</h1><p className="mt-1 truncate text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>{profile?.school || profile?.centerName || '학교/센터를 설정하세요'}</p><p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{profile?.role === 'director' ? '원장/센터 관리자' : '강사'} / {planInfo.title}</p></div>
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><Pencil size={15} />프로필 편집</button>
      </header>

      <main className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-[18px] p-5" style={{ background: currentPlan === 'free' ? 'linear-gradient(135deg, rgba(245,158,11,0.14), var(--spm-s2))' : 'linear-gradient(135deg, rgba(99,102,241,0.24), var(--spm-s2))', border: currentPlan === 'free' ? '1px solid rgba(245,158,11,0.24)' : '1px solid rgba(99,102,241,0.34)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: currentPlan === 'free' ? 'var(--spm-amb)' : '#a5b4fc' }}>{planInfo.badge}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-2"><h2 className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{planInfo.title}</h2><span className="text-[18px] font-black" style={{ color: 'var(--spm-t)' }}>{planInfo.price}</span></div>
            <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>프로그램 라이브러리, SPOMOVE 웹 실행, 수업 기록, 카카오 공유, 리포트 생성을 하나의 구독 루프로 묶습니다.</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}><div className="h-full rounded-full" style={{ width: `${progress}%`, background: currentPlan === 'free' ? 'var(--spm-amb)' : 'var(--spm-acc)' }} /></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3"><span className="rounded-[10px] p-2 text-center text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>카카오 {planInfo.kakao}</span><span className="rounded-[10px] p-2 text-center text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>AI 코멘트 {planInfo.ai}</span><span className="rounded-[10px] p-2 text-center text-[11px] font-bold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>PDF {planInfo.pdf}</span></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPaymentOpen(true)} className="h-12 rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>구독 관리</button>{currentPlan !== 'free' ? <button type="button" onClick={() => setCancelOpen(true)} className="h-12 rounded-[12px] text-[14px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>해지/일시정지</button> : null}</div>
          </section>
          {currentPlan === 'free' ? <TrialJourney daysLeft={daysLeft} /> : null}
          <section className="grid grid-cols-3 gap-2"><Stat label="SPOMOVE 세션" value={String(stats.totalSessions)} /><Stat label="이번 주 수업" value={String(Math.max(stats.thisWeekSessions, 1))} /><Stat label="최고 반응" value={formatReactionTime(stats.bestRT)} /></section>
          <PwaInstallCard />
          <OperationsPanel />
          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><div className="flex items-center gap-2"><WifiOff size={18} color="var(--spm-amb)" /><h2 className="text-[17px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>오프라인/한도 정책</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['수업 기록', '오프라인 저장 후 연결 시 동기화'], ['카카오 발송', '한도 초과 시 발송 차단 및 재시도 목록 보관'], ['AI 코멘트', '한도 초과 시 직접 입력으로 대체'], ['PDF 생성', '실패 시 같은 데이터로 재생성']].map(([title, body]) => <div key={title} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}><p className="text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{title}</p><p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--spm-t3)' }}>{body}</p></div>)}</div></section>
        </div>

        <div className="space-y-7">
          <MenuGroup title="수업 실행"><MenuRow icon={MonitorPlay} label="SPOMOVE 전체화면 실행" href="/spokedu-master/spomove/session?mode=projector" /><MenuRow icon={ShoppingBag} label="교구 스토어 / 장바구니" href="/spokedu-master/shop" /><MenuRow icon={CreditCard} label="구독/결제 관리" onClick={() => setPaymentOpen(true)} /></MenuGroup>
          <MenuGroup title="알림과 환경"><SettingRow icon={Bell} label="카카오 요약 알림" enabled={notificationOn} onToggle={() => setNotificationOn((value) => !value)} /><SettingRow icon={Moon} label="수업 중 방해금지" enabled={dndOn} onToggle={() => setDndOn((value) => !value)} /><SettingRow icon={Volume2} label="SPOMOVE 효과음" enabled={soundOn} onToggle={() => setSoundOn((value) => !value)} /></MenuGroup>
          <MenuGroup title="지원"><MenuRow icon={HelpCircle} label="고객지원" onClick={() => setAccountNotice('고객지원 요청을 준비했습니다. 문의하기로 상세 내용을 보낼 수 있습니다.')} /><MenuRow icon={Mail} label="문의하기" href="mailto:support@spokedu.com" /></MenuGroup>
          <MenuGroup title="계정"><MenuRow icon={LogOut} label="로그아웃" onClick={() => setAccountNotice('현재 기기에서 MASTER 세션 종료 요청을 준비했습니다.')} /><MenuRow icon={Trash2} label="계정 삭제" danger onClick={() => setAccountNotice('계정 삭제는 학생 데이터 보존 정책 확인 후 진행해야 합니다.')} /></MenuGroup>
          {accountNotice ? <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}>{accountNotice}</p> : null}
        </div>
      </main>

      <BottomSheet open={profileOpen} title="프로필 편집" onClose={() => setProfileOpen(false)}><div className="space-y-4"><label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span><input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label><label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>학교/센터</span><input value={school} onChange={(event) => setSchool(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label><button type="button" onClick={saveProfile} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>저장</button></div></BottomSheet>
      <PaymentFlow open={paymentOpen} onClose={() => setPaymentOpen(false)} />
      <CancelDefense open={cancelOpen} onClose={() => setCancelOpen(false)} recordCount={classRecords.length} studentCount={students.length} />
      <div className="px-[22px] pt-6 sm:px-8 lg:px-10"><p className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--spm-t3)' }}><ShieldCheck size={13} />결제 정보와 학생 성장 데이터는 플랜 권한에 맞춰 안전하게 관리됩니다.</p></div>
    </div>
  );
}
