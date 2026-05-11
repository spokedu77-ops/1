'use client';

import Link from 'next/link';
import { Bell, ChevronRight, CreditCard, HelpCircle, LogOut, Mail, MonitorPlay, Moon, Pencil, ShieldAlert, Trash2, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { formatReactionTime } from '../lib/utils';
import { useMasterStore, useProfile, useStats } from '../store';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[20px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
        {label}
      </p>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  href,
  danger = false,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }}>
        <Icon size={17} color={danger ? 'var(--spm-red)' : 'var(--spm-t2)'} />
      </span>
      <span className="min-w-0 flex-1 text-left text-[14px] font-bold" style={{ color: danger ? 'var(--spm-red)' : 'var(--spm-t)' }}>
        {label}
      </span>
      <ChevronRight size={16} color="var(--spm-t3)" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
      {content}
    </button>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-[22px]">
      <h2 className="mb-3 text-[13px] font-black" style={{ color: 'var(--spm-t3)' }}>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PaymentFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setProfile = useMasterStore((state) => state.setProfile);
  const [step, setStep] = useState(0);
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [method, setMethod] = useState<'card' | 'kakao' | 'naver'>('card');
  const [cardNumber, setCardNumber] = useState('');

  const complete = () => {
    setProfile({ plan: 'pro' });
    setStep(2);
  };

  const close = () => {
    setStep(0);
    onClose();
  };

  return (
    <BottomSheet open={open} title="PRO 시작하기" onClose={close}>
      {step === 0 ? (
        <div className="space-y-3">
          {[
            ['annual', '연간', '월 ₩8,250', '2개월 할인 포함'],
            ['monthly', '월간', '월 ₩9,900', '언제든 해지 가능'],
          ].map(([id, title, price, desc]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBilling(id as 'annual' | 'monthly')}
              className="w-full rounded-[14px] p-4 text-left"
              style={{
                background: billing === id ? 'rgba(99,102,241,0.14)' : 'var(--spm-s2)',
                border: billing === id ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--spm-br2)',
              }}
            >
              <span className="block text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>
                {title}
              </span>
              <span className="mt-1 block text-[20px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                {price}
              </span>
              <span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>
                {desc}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setStep(1)} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            다음
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['card', '카드'],
              ['kakao', '카카오'],
              ['naver', '네이버'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id as 'card' | 'kakao' | 'naver')}
                className="h-10 rounded-[12px] text-[12px] font-black"
                style={{ background: method === id ? 'var(--spm-acc)' : 'var(--spm-s2)', color: method === id ? '#fff' : 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={cardNumber}
            onChange={(event) =>
              setCardNumber(
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 16)
                  .replace(/(\d{4})(?=\d)/g, '$1 ')
              )
            }
            placeholder="1234 5678 9012 3456"
            className="h-12 w-full rounded-[12px] border px-3 text-[15px] font-bold outline-none"
            style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
          />
          <button type="button" onClick={complete} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            결제 완료
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="py-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
            <CreditCard size={28} color="var(--spm-grn)" />
          </div>
          <h3 className="mt-5 text-[22px] font-black tracking-[-0.04em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            PRO가 활성화됐어요
          </h3>
          <button type="button" onClick={close} className="mt-6 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            확인
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}

export default function SpokeduMasterProfilePage() {
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const stats = useStats();
  const [profileOpen, setProfileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const isPro = profile?.plan !== 'free';

  const saveProfile = () => {
    setProfile({ name: name.trim() || '선생님', school: school.trim() });
    setProfileOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-6 pt-[22px]">
        <div className="flex items-center gap-4">
          <div className="grid h-[72px] w-[72px] place-items-center rounded-full text-[26px] font-black text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>
            {(profile?.name ?? '선생님').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[26px] font-black tracking-[-0.05em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
              {profile?.name ?? '선생님'}
            </h1>
            <p className="mt-1 truncate text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>
              {profile?.school || '학교/센터를 설정하세요'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
        >
          <Pencil size={15} />
          프로필 편집
        </button>
      </header>

      <section className="mx-[22px] mb-7 overflow-hidden rounded-[18px] p-5" style={{ background: isPro ? 'linear-gradient(135deg, rgba(99,102,241,0.24), var(--spm-s2))' : 'linear-gradient(135deg, rgba(245,158,11,0.14), var(--spm-s2))', border: isPro ? '1px solid rgba(99,102,241,0.34)' : '1px solid rgba(245,158,11,0.24)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: isPro ? '#a5b4fc' : 'var(--spm-amb)' }}>
          {isPro ? 'pro plan' : 'free plan'}
        </p>
        <h2 className="mt-3 text-[26px] font-black tracking-[-0.05em]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
          {isPro ? 'SPOKEDU PRO' : 'FREE 체험'}
        </h2>
        {isPro ? (
          <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--spm-t2)' }}>
            세션 {stats.totalSessions}개 / 평균 {formatReactionTime(stats.avgRT)}
          </p>
        ) : (
          <>
            <div className="mt-5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: '7%', background: 'var(--spm-amb)' }} />
            </div>
            <p className="mt-2 text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
              사용량 10 / 153
            </p>
            <button type="button" onClick={() => setPaymentOpen(true)} className="mt-5 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              PRO 시작하기
            </button>
          </>
        )}
      </section>

      <section className="mb-7 grid grid-cols-3 gap-2 px-[22px]">
        <Stat label="세션" value={String(stats.totalSessions)} />
        <Stat label="사용주차" value={String(Math.max(stats.thisWeekSessions, 1))} />
        <Stat label="최고 RT" value={formatReactionTime(stats.bestRT)} />
      </section>

      <div className="space-y-7">
        <MenuGroup title="수업 설정">
          <MenuRow icon={MonitorPlay} label="빔프로젝터" href="/spokedu-master/spomove/session" />
          <MenuRow icon={CreditCard} label="수업 계획" href="/spokedu-master/plan" />
        </MenuGroup>
        <MenuGroup title="앱 설정">
          <MenuRow icon={Bell} label="알림 토글" />
          <MenuRow icon={Moon} label="화면꺼짐방지" />
          <MenuRow icon={Volume2} label="음성큐 토글" />
        </MenuGroup>
        <MenuGroup title="지원">
          <MenuRow icon={HelpCircle} label="도움말" />
          <MenuRow icon={Mail} label="문의하기" href="mailto:support@spokedu.com" />
        </MenuGroup>
        <MenuGroup title="계정">
          <MenuRow icon={LogOut} label="로그아웃" />
          <MenuRow icon={Trash2} label="계정 삭제" danger />
        </MenuGroup>
      </div>

      <BottomSheet open={profileOpen} title="프로필 편집" onClose={() => setProfileOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>
              이름
            </span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>
              학교/센터
            </span>
            <input value={school} onChange={(event) => setSchool(event.target.value)} className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <button type="button" onClick={saveProfile} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            저장
          </button>
        </div>
      </BottomSheet>

      <PaymentFlow open={paymentOpen} onClose={() => setPaymentOpen(false)} />
      <div className="px-[22px] pt-6">
        <p className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--spm-t3)' }}>
          <ShieldAlert size={13} />
          결제 UI는 MASTER 프로토타입용 플로우입니다.
        </p>
      </div>
    </div>
  );
}
