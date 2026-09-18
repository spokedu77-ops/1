'use client';

import { ArrowRight, BookOpen, Check, Sparkles, UserRound, UsersRound, Wrench, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOptionalMasterAccessContext } from '../access/MasterAccessProvider';
import { useMasterStore, useProfile } from '../store';
import type { UserRole } from '../types';
import { getSafeMasterLoginReturnPath } from '../lib/masterLoginReturn';

const AGE_GROUPS = ['유치부', '초등 저학년', '초등 고학년', '중등'];
const PROGRAM_TYPES = ['놀이체육', '뉴스포츠', '협동·팀빌딩', '기초체력', 'SPOMOVE', '특수체육'];
const STEP_LABELS = ['환경', '수업 환경', '시작'];
const START_ITEMS = [
  { icon: BookOpen, title: '무료 수업 1개 전체 체험', desc: '지정된 놀이체육을 상세 자료와 영상까지 바로 열어볼 수 있습니다.' },
  { icon: UsersRound, title: 'Library 전체 둘러보기', desc: '검색·필터·추천으로 전체 놀이체육 목록을 탐색할 수 있습니다.' },
  { icon: Wrench, title: '수업 도구 바로 사용', desc: '타이머, 팀 나누기, 랜덤 뽑기를 로그인 직후부터 사용할 수 있습니다.' },
] as const;

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: active ? 'var(--spm-acc)' : done ? 'var(--spm-grn)' : 'var(--spm-s4)' }} />;
}

function ChoiceCard({ title, desc, active, icon: Icon, onClick }: { title: string; desc: string; active: boolean; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-[16px] p-4 text-left" style={{ background: active ? 'var(--spm-acc-a15)' : 'var(--spm-s2)', border: active ? '1px solid var(--spm-acc-a55)' : '1px solid var(--spm-br2)' }}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s3)' }}>
        <Icon size={20} color={active ? '#fff' : 'var(--spm-t2)'} />
      </span>
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
  const searchParams = useSearchParams();
  const returnPath = getSafeMasterLoginReturnPath(searchParams.get('next'));
  const accessContext = useOptionalMasterAccessContext();
  const serverOnboardingDone = accessContext?.snapshot.onboardingDone ?? false;
  const profile = useProfile();
  const setProfile = useMasterStore((state) => state.setProfile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole>(profile?.role ?? 'teacher');
  const [name, setName] = useState(profile?.name ?? '선생님');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [ageGroups, setAgeGroups] = useState<string[]>(profile?.ageGroups ?? []);
  const [programTypes, setProgramTypes] = useState<string[]>(profile?.programTypes ?? []);

  useEffect(() => {
    if (serverOnboardingDone) {
      router.replace(returnPath);
    }
  }, [returnPath, router, serverOnboardingDone]);

  const profileValid = name.trim().length > 0 && name.trim().length <= 20;
  const canNext = useMemo(() => {
    if (step === 0) return !!role;
    if (step === 1) return profileValid;
    return true;
  }, [profileValid, role, step]);

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const finish = () => {
    if (saving) return;
    const payload = {
      name: name.trim() || '선생님',
      school: school.trim(),
      role,
      ageGroups,
      programTypes,
      onboardingDone: true,
    };
    setSaving(true);
    setSaveError(null);
    void fetch('/api/spokedu-master/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const json = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(json.error ?? 'profile save failed');
        }
        setProfile({
          name: payload.name,
          school: payload.school,
          role,
          centerId: null,
          centerName: null,
          ageGroups,
          programTypes,
          onboardingDone: true,
        });
        router.replace(searchParams.has('next') ? returnPath : '/spokedu-master/dashboard');
      })
      .catch(() => {
        setSaveError('시작 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: 'var(--spm-bg)' }}>
      <main className="mx-auto grid min-h-full w-full max-w-[1080px] gap-6 px-[22px] py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div>
          <div className="mb-8">
            <p className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-acc)' }}>SPOKEDU MASTER</p>
            <h1 className="mt-3 text-[34px] font-black leading-[1.12] md:text-[48px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>Free로 수업을 먼저 경험하세요</h1>
            <p className="mt-3 max-w-[620px] text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>놀이체육과 수업 도구를 먼저 써 보고, 수업 운영이 필요하면 Lite로 확장할 수 있습니다.</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
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
                <ChoiceCard title="개인 강사·교사" desc="내 계정으로 수업을 준비합니다. 이용권은 Free로 시작합니다." active={role === 'teacher'} icon={UserRound} onClick={() => setRole('teacher')} />
                <ChoiceCard title="센터·기관 운영" desc="여러 수업을 운영하는 환경입니다. 센터를 선택해도 별도 이용권으로 전환되지 않습니다." active={role === 'director'} icon={UsersRound} onClick={() => setRole('director')} />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 환경</h2>
                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름</span>
                  <input value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>소속</span>
                  <input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="예: 서울초등학교, 무브키즈 센터" className="h-12 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
                </label>
                <div>
                  <p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>주 지도 연령</p>
                  <div className="flex flex-wrap gap-2">{AGE_GROUPS.map((item) => <ToggleChip key={item} label={item} active={ageGroups.includes(item)} onClick={() => toggle(item, ageGroups, setAgeGroups)} />)}</div>
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>관심 프로그램</p>
                  <div className="flex flex-wrap gap-2">{PROGRAM_TYPES.map((item) => <ToggleChip key={item} label={item} active={programTypes.includes(item)} onClick={() => toggle(item, programTypes, setProgramTypes)} />)}</div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-[16px]" style={{ background: 'var(--spm-grn-a14)' }}><Sparkles size={24} color="var(--spm-grn)" /></span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-grn)' }}>준비 완료</p>
                    <h2 className="mt-1 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>MASTER 시작하기</h2>
                  </div>
                </div>
                <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>무료 수업 1개를 체험하고 라이브러리와 수업 도구를 바로 사용할 수 있습니다.</p>
                <div className="grid gap-2">
                  {START_ITEMS.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 rounded-[13px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                      <Icon size={18} color="var(--spm-acc)" />
                      <span>
                        <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
                        <span className="mt-1 block text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {saveError ? (
                  <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
                    {saveError}
                  </p>
                ) : null}
                <button type="button" onClick={finish} disabled={saving} className="spm-btn-primary flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-black focus-visible:outline-none disabled:opacity-50">
                  {saving ? '저장 중...' : 'MASTER 시작하기'}
                </button>
              </div>
            ) : null}

            {step < 2 ? (
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
                <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="h-12 rounded-[12px] px-5 text-[13px] font-black disabled:opacity-40" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)' }}>이전</button>
                <button type="button" onClick={() => setStep((value) => Math.min(2, value + 1))} disabled={!canNext} className="spm-btn-primary flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-black focus-visible:outline-none disabled:opacity-50">
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

        <aside className="rounded-[22px] p-5" style={{ background: 'linear-gradient(180deg, var(--spm-acc-a16), var(--spm-grn-a08))', border: '1px solid var(--spm-br2)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>시작하기</p>
          <h2 className="mt-2 text-[24px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all' }}>Free에서 바로 시작할 수 있습니다</h2>
          <div className="mt-5 space-y-3">
            {START_ITEMS.map(({ icon: Icon, title, desc }) => (
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
          <p className="mt-4 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
            홈의 이번 주 추천에서 지정된 무료 수업부터 이어집니다.
          </p>
        </aside>
      </main>
    </div>
  );
}
