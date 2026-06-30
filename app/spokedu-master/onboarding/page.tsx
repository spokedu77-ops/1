'use client';

import { ArrowRight, BookOpen, Check, Clipboard, MonitorPlay, School, Sparkles, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMasterStore, useProfile } from '../store';
import { MASTER_CUSTOMER_SERVICE_HREF } from '../lib/businessInfo';
import type { UserRole } from '../types';

const AGE_GROUPS = ['유치부', '초등 저학년', '초등 고학년', '중등'];
const PROGRAM_TYPES = ['놀이체육', 'SPOMOVE', '민첩성', '협동 활동', '체력'];
const STEP_LABELS = ['환경', '연결', '프로필', '시작'];
const STARTER_PACK = [
  { icon: BookOpen, title: '추천 수업 자료', desc: '오늘 바로 열 수 있는 대표 수업 흐름' },
  { icon: MonitorPlay, title: 'TV·빔 실행', desc: '현장에서 바로 시작하는 SPOMOVE 활동' },
  { icon: Clipboard, title: '수업 기록', desc: '진행한 수업을 다음 준비로 연결' },
] as const;

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: active ? 'var(--spm-acc)' : done ? 'var(--spm-grn)' : 'var(--spm-s4)' }} />;
}

function ChoiceCard({ title, desc, active, icon: Icon, onClick }: { title: string; desc: string; active: boolean; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-[16px] p-4 text-left" style={{ background: active ? 'rgba(99,102,241,0.15)' : 'var(--spm-s2)', border: active ? '1px solid rgba(99,102,241,0.55)' : '1px solid var(--spm-br2)' }}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s3)' }}><Icon size={20} color={active ? '#fff' : 'var(--spm-t2)'} /></span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[15px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
        <span className="mt-1 block text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
      </span>
      {active ? <Check size={18} color="var(--spm-grn)" /> : null}
    </button>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-9 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (profile?.onboardingDone) {
      router.replace('/spokedu-master/dashboard');
    }
  }, [profile?.onboardingDone, router]);

  const [role, setRole] = useState<UserRole>(profile?.role ?? 'teacher');
  const [centerMode, setCenterMode] = useState<'personal' | 'center'>(profile?.centerId ? 'center' : 'personal');
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [ageGroups, setAgeGroups] = useState<string[]>(profile?.ageGroups ?? []);
  const [programTypes, setProgramTypes] = useState<string[]>(profile?.programTypes ?? []);

  const profileValid = name.trim().length > 0 && name.trim().length <= 20;
  const canNext = useMemo(() => {
    if (step === 0) return !!role;
    if (step === 1) return true;
    if (step === 2) return profileValid;
    return true;
  }, [profileValid, role, step]);

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const next = () => {
    setStep((value) => Math.min(3, value + 1));
  };

  const applyProfile = () => {
    const hasActivePlan = profile?.plan === 'pro' || profile?.plan === 'team' || Boolean(profile?.isAdmin);
    setProfile({
      name: name.trim() || '선생님',
      school: school.trim(),
      role,
      centerId: null,
      centerName: null,
      ageGroups,
      programTypes,
      plan: hasActivePlan ? profile?.plan : 'free',
      onboardingDone: true,
      trialEndsAt: profile?.trialEndsAt ?? null,
    });
  };

  const finish = () => {
    applyProfile();
    router.replace('/spokedu-master/dashboard');
  };

  const finishAndOpenPlans = () => {
    applyProfile();
    router.replace('/spokedu-master/profile?plans=1');
  };

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: 'var(--spm-bg)' }}>
      <main className="mx-auto grid min-h-full w-full max-w-[1080px] gap-6 px-[22px] py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div>
          <div className="mb-8">
            <p className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU MASTER</p>
            <h1 className="mt-3 text-[34px] font-black leading-[1.12] md:text-[48px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>수업 환경에 맞게 체험을 시작하세요</h1>
            <p className="mt-3 max-w-[620px] text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>기본 정보를 저장하면 추천 수업 자료, 참고 영상, SPOMOVE 실행, 수업 기록을 바로 체험할 수 있습니다.</p>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <StepDot active={step === item} done={step > item} />
                <span className="text-[11px] font-black" style={{ color: step === item ? 'var(--spm-t)' : 'var(--spm-t3)' }}>{STEP_LABELS[item]}</span>
              </div>
            ))}
          </div>

          <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
            {step === 0 ? (
              <div className="space-y-3">
                <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>사용 환경</h2>
                <ChoiceCard title="개인 강사·교사" desc="라이브러리, SPOMOVE, 수업 기록을 먼저 체험합니다." active={role === 'teacher'} icon={UserRound} onClick={() => setRole('teacher')} />
                <ChoiceCard title="센터·현장 운영" desc="여러 수업을 운영하는 센터·기관 환경에 맞게 설정합니다." active={role === 'director'} icon={UsersRound} onClick={() => setRole('director')} />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>연결 방식</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ChoiceCard title="개인 계정으로 시작" desc="센터 운영 역할을 선택해도 현재는 개인 계정으로 시작합니다." active={centerMode === 'personal'} icon={UserRound} onClick={() => setCenterMode('personal')} />
                  <ChoiceCard title="센터 운영 역할" desc="센터 계정 연결은 준비 중이며, 개인 계정으로 먼저 시작할 수 있습니다." active={centerMode === 'center'} icon={School} onClick={() => setCenterMode('center')} />
                </div>
                {centerMode === 'center' ? (
                  <div className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                    <p className="text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>센터 계정 연결은 준비 중입니다.</p>
                    <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>
                      현재는 개인 계정으로 시작한 뒤 Center 이용권 또는 기관 도입 상담을 이용해 주세요.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={finishAndOpenPlans} className="rounded-[10px] px-3 py-2 text-[12px] font-black" style={{ background: 'var(--spm-acc)', color: '#fff' }}>Center 이용권 보기</button>
                      <a href={MASTER_CUSTOMER_SERVICE_HREF} className="rounded-[10px] px-3 py-2 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>기관 도입 문의</a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>프로필 설정</h2>
                <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span><input value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
                <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>학교/센터</span><input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="예: 서울초등학교, 무브키즈 센터" className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
                <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>대상 연령대</p><div className="flex flex-wrap gap-2">{AGE_GROUPS.map((item) => <ToggleChip key={item} label={item} active={ageGroups.includes(item)} onClick={() => toggle(item, ageGroups, setAgeGroups)} />)}</div></div>
                <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>주요 프로그램</p><div className="flex flex-wrap gap-2">{PROGRAM_TYPES.map((item) => <ToggleChip key={item} label={item} active={programTypes.includes(item)} onClick={() => toggle(item, programTypes, setProgramTypes)} />)}</div></div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-[16px]" style={{ background: 'rgba(16,185,129,0.14)' }}><Sparkles size={24} color="var(--spm-grn)" /></span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-grn)' }}>준비 완료</p>
                    <h2 className="mt-1 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>오늘 첫 수업을 골라보세요</h2>
                  </div>
                </div>
                <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
                  무료 체험으로 추천 수업 자료, 참고 영상, SPOMOVE 실행, 수업 기록 흐름을 먼저 확인할 수 있습니다.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {STARTER_PACK.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="rounded-[13px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                      <Icon size={18} color="var(--spm-acc)" />
                      <strong className="mt-3 block text-[13px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
                      <span className="mt-1 block text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[14px] p-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)' }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: '#6366f1' }}>플랜은 체험 후 선택</p>
                  <p className="mt-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>수업 운영에 맞는 Pro·Center 플랜을 확인하세요.</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>온보딩을 완료한 뒤 기존 Profile의 플랜 선택 화면에서 결제 여부를 결정합니다.</p>
                  <button
                    type="button"
                    onClick={finishAndOpenPlans}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-[12px] text-[13px] font-black text-white"
                    style={{ background: 'var(--spm-acc)', boxShadow: '0 6px 18px rgba(99,102,241,0.32)' }}
                  >
                    플랜 확인하기
                  </button>
                  <button
                    type="button"
                    onClick={finish}
                    className="mt-2 w-full text-center text-[11px] font-semibold"
                    style={{ color: 'var(--spm-t3)' }}
                  >
                    무료 체험으로 dashboard 시작
                  </button>
                </div>
              </div>
            ) : null}

            {step < 3 ? (
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
                <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="h-12 rounded-[12px] px-5 text-[13px] font-black disabled:opacity-40" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>이전</button>
                <button type="button" onClick={next} disabled={!canNext} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
                  다음
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="w-full text-center text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>이전 단계로</button>
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-[22px] p-5" style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.16), rgba(16,185,129,0.08))', border: '1px solid var(--spm-br2)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>Start Kit</p>
          <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>가입 직후 바로 열리는 체험 도구</h2>
          <div className="mt-5 space-y-3">
            {STARTER_PACK.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 rounded-[15px] p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)' }}>
                  <Icon size={18} color="var(--spm-acc)" />
                </span>
                <span>
                  <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
                  <span className="mt-0.5 block text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[15px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>체험 기간</p>
            <p className="mt-1 text-[28px] font-black leading-none" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>14일</p>
            <p className="mt-2 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>카드 없이 먼저 수업 준비 흐름을 확인합니다.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
