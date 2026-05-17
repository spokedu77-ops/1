'use client';

import { ArrowRight, Check, School, Sparkles, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCenterCode, type CenterValidationResult } from '../lib/serviceContracts';
import { useMasterStore, useProfile } from '../store';
import type { UserRole } from '../types';

const AGE_GROUPS = ['유치부', '초등 저학년', '초등 고학년', '중등'];
const PROGRAM_TYPES = ['놀이체육', 'SPOMOVE', '협응성', '민첩성', '체력'];

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
  const [centerCode, setCenterCode] = useState('');
  const [centerResult, setCenterResult] = useState<CenterValidationResult | null>(null);
  const [centerError, setCenterError] = useState('');
  const [validating, setValidating] = useState(false);
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [ageGroups, setAgeGroups] = useState<string[]>(profile?.ageGroups ?? []);
  const [programTypes, setProgramTypes] = useState<string[]>(profile?.programTypes ?? []);

  const centerValid = centerMode === 'personal' || !!centerResult;
  const profileValid = name.trim().length > 0 && name.trim().length <= 20;
  const canNext = useMemo(() => {
    if (step === 0) return !!role;
    if (step === 1) return centerMode === 'personal' || centerValid;
    if (step === 2) return profileValid;
    return true;
  }, [centerMode, centerValid, profileValid, role, step]);

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const validateCenter = async () => {
    setValidating(true);
    setCenterError('');
    const result = await validateCenterCode(centerCode);
    setValidating(false);
    if (result.ok) {
      setCenterResult(result.data);
      return;
    }
    setCenterResult(null);
    setCenterError(result.message);
  };

  const next = async () => {
    if (step === 1 && centerMode === 'center' && !centerResult) {
      await validateCenter();
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  };

  const applyProfile = () => {
    setProfile({
      name: name.trim() || '선생님',
      school: school.trim(),
      role,
      centerId: centerMode === 'center' ? centerResult?.centerId ?? centerCode.trim().toUpperCase() : null,
      centerName: centerMode === 'center' ? centerResult?.centerName ?? '연결된 체육 센터' : null,
      ageGroups,
      programTypes,
      plan: centerMode === 'center' ? 'team' : 'free',
      onboardingDone: true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  const finish = () => {
    applyProfile();
    router.replace('/spokedu-master/library');
  };

  const finishWithPayment = (plan: 'pro' | 'team') => {
    applyProfile();
    router.replace(`/spokedu-master/payment?plan=${plan}`);
  };

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: 'var(--spm-bg)' }}>
      <main className="mx-auto flex min-h-full w-full max-w-[880px] flex-col justify-center px-[22px] py-8 sm:px-8">
        <div className="mb-8">
          <p className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU PRO</p>
          <h1 className="mt-3 text-[34px] font-black leading-[1.12] md:text-[48px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>수업 준비는 쉽게, 수업은 더 몰입감 있게</h1>
          <p className="mt-3 max-w-[640px] text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>프로그램 라이브러리에서 수업을 고르고, SPOMOVE를 큰 화면으로 실행하고, 수업의 의미를 설명 문구로 남깁니다.</p>
        </div>

        <div className="mb-6 flex gap-2">{[0, 1, 2, 3].map((item) => <StepDot key={item} active={step === item} done={step > item} />)}</div>

        <section className="rounded-[20px] p-5" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
          {step === 0 ? (
            <div className="space-y-3">
              <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>사용 환경</h2>
              <ChoiceCard title="개인 강사·교사" desc="라이브러리, SPOMOVE, 수업 도구를 먼저 사용합니다." active={role === 'teacher'} icon={UserRound} onClick={() => setRole('teacher')} />
              <ChoiceCard title="센터·도장 운영" desc="여러 강사가 같은 수업 품질과 교구 흐름을 공유할 준비를 합니다." active={role === 'director'} icon={UsersRound} onClick={() => setRole('director')} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>도입 방식</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard title="개인으로 시작" desc="14일 무료 체험으로 먼저 확인합니다." active={centerMode === 'personal'} icon={UserRound} onClick={() => { setCenterMode('personal'); setCenterResult(null); }} />
                <ChoiceCard title="센터 코드 입력" desc="센터에서 발급한 코드로 팀 플랜에 합류합니다." active={centerMode === 'center'} icon={School} onClick={() => setCenterMode('center')} />
              </div>
              {centerMode === 'center' ? (
                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>센터 코드</span>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input value={centerCode} onChange={(event) => { setCenterCode(event.target.value); setCenterResult(null); }} placeholder="예: SPOMOVE2026" className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold uppercase outline-none" style={{ background: 'var(--spm-s2)', borderColor: centerError ? 'var(--spm-red)' : 'var(--spm-br2)', color: 'var(--spm-t)' }} />
                    <button type="button" onClick={validateCenter} disabled={validating} className="h-12 rounded-[12px] px-4 text-[13px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>{validating ? '확인 중' : '코드 확인'}</button>
                  </div>
                  {centerResult ? <p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--spm-grn)' }}>{centerResult.centerName} / 강사 {centerResult.teacherSlots}명 플랜</p> : null}
                  {centerError ? <p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--spm-red)' }}>{centerError}</p> : null}
                </label>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>프로필 설정</h2>
              <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span><input value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
              <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>학교/센터</span><input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="예: 서울초등학교, 무브키즈 센터" className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
              <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>담당 연령대</p><div className="flex flex-wrap gap-2">{AGE_GROUPS.map((item) => <ToggleChip key={item} label={item} active={ageGroups.includes(item)} onClick={() => toggle(item, ageGroups, setAgeGroups)} />)}</div></div>
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
                라이브러리에서 수업안을 고르면 SPOMOVE 연결과 수업 설명 문구가 바로 연결됩니다.
              </p>
              <div className="grid gap-2">
                {([
                  { step: '1', label: '라이브러리에서 수업 고르기', caption: '오늘 쓸 수업안을 검색하거나 태그로 찾습니다', color: 'rgba(99,102,241,0.14)', accent: 'var(--spm-acc)' },
                  { step: '2', label: 'SPOMOVE 큰 화면 실행', caption: '프로젝터·TV에 연결해 아이들이 신호를 보고 움직입니다', color: 'rgba(16,185,129,0.12)', accent: 'var(--spm-grn)' },
                  { step: '3', label: '수업 도구 활용', caption: '타이머, 팀 나누기, 학생 뽑기를 수업 중에 바로 씁니다', color: 'rgba(245,158,11,0.12)', accent: 'var(--spm-amb)' },
                ] as const).map(({ step: num, label, caption, color, accent }) => (
                  <div key={num} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: color }}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-black text-white" style={{ background: accent }}>{num}</span>
                    <span>
                      <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
                      <span className="mt-0.5 block text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-[14px] p-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)' }}>
                <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: '#a5b4fc' }}>지금 바로 시작</p>
                <p className="mt-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>Pro — 39,900원/월</p>
                <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>전체 라이브러리 · SPOMOVE 무제한 · 수업 도구 전체</p>
                <button
                  type="button"
                  onClick={() => finishWithPayment('pro')}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-[12px] text-[13px] font-black text-white"
                  style={{ background: 'var(--spm-acc)', boxShadow: '0 6px 18px rgba(99,102,241,0.32)' }}
                >
                  Pro로 시작하기
                </button>
                <button
                  type="button"
                  onClick={finish}
                  className="mt-2 w-full text-center text-[11px] font-semibold"
                  style={{ color: 'var(--spm-t3)' }}
                >
                  14일 무료 체험 먼저 해보기
                </button>
              </div>
            </div>
          ) : null}

          {step < 3 ? (
            <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="h-12 rounded-[12px] px-5 text-[13px] font-black disabled:opacity-40" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>이전</button>
              <button type="button" onClick={next} disabled={!canNext || validating} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
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
      </main>
    </div>
  );
}
