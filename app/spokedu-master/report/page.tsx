'use client';

import Link from 'next/link';
import { BookOpen, Check, Clipboard, FileText, GraduationCap, MessageCircle, Save, Search, UsersRound } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { displayMasterDuration, normalizeMasterSpace, normalizeMasterTarget } from '../lib/programDisplayTags';
import { useMasterStore } from '../store';
import type { Program } from '../types';

type Audience = 'parent' | 'center' | 'school';
type SavedExplanation = {
  id: string;
  programId: string;
  programTitle: string;
  audience: Audience;
  text: string;
  createdAt: string;
};

const STORAGE_KEY = 'spokedu-master-explanations-v1';

const AUDIENCES: Array<{ id: Audience; label: string; description: string; Icon: typeof MessageCircle }> = [
  { id: 'parent', label: '학부모용', description: '아이들이 경험한 움직임을 쉽게 안내합니다.', Icon: UsersRound },
  { id: 'center', label: '기관용', description: '운영 목적과 활동 구성, 기대 효과를 정리합니다.', Icon: FileText },
  { id: 'school', label: '학교용', description: '수업 활동 기록과 참여 내용을 정리합니다.', Icon: GraduationCap },
];

const MOODS = ['활기찬 분위기', '차분한 분위기', '집중도가 높았음', '도전하는 분위기', '협동하는 분위기'];
const REACTIONS = [
  '적극적으로 참여함',
  '처음에는 조심스러웠지만 점차 참여함',
  '규칙을 이해하며 움직임',
  '친구와 상호작용이 좋았음',
  '반복하며 자신감이 생김',
];
const FOCUS_SKILLS = ['참여', '반응', '협동', '방향 전환', '공간 인식', '자기조절'];

function compactList(values: Array<string | undefined | null>) {
  return values.map((value) => value?.trim()).filter(Boolean).join(' / ');
}

function clean(value: string | undefined | null, fallback = '') {
  const text = (value ?? '').trim();
  if (!text || /확인 필요|정보 없음|미정|undefined|null/i.test(text)) return fallback;
  return text;
}

function toggle(items: string[], item: string) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function loadSaved(): SavedExplanation[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedExplanation[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function getActivityFlow(program: Program) {
  const detail = program.lessonDetail;
  const source = detail?.rules?.length ? detail.rules : program.steps;
  return source.map((item) => clean(item)).filter(Boolean);
}

function getAudienceOutputTitle(audience: Audience) {
  if (audience === 'center') return '기관 제출용 설명';
  if (audience === 'school') return '학교 수업 활동 기록';
  return '학부모 안내 문구';
}

function buildExplanation(input: {
  audience: Audience;
  program: Program;
  mood: string;
  reaction: string;
  focusSkills: string[];
  note: string;
}) {
  const { audience, program, mood, reaction, focusSkills, note } = input;
  const detail = program.lessonDetail;
  const title = clean(program.title, '오늘 수업');
  const description = clean(program.description, '몸을 움직이며 활동 흐름을 경험하는 수업입니다.');
  const focus = focusSkills.length ? focusSkills.join(', ') : clean(detail?.developmentFocus, program.tags.slice(0, 3).join(', '));
  const target = clean(normalizeMasterTarget(program.grade), '수업 대상');
  const space = clean(normalizeMasterSpace(program.space), '수업 공간');
  const duration = displayMasterDuration(program.duration);
  const equipment = program.equipment.length ? program.equipment.join(', ') : '현장 기본 도구';
  const activity = getActivityFlow(program).slice(0, 2).join(' ');
  const variation = detail?.variations?.[0] ? `상황에 따라 ${detail.variations[0]} 방식으로 응용할 수 있습니다.` : '';
  const noteLine = note.trim() ? ` 특이사항: ${note.trim()}` : '';

  if (audience === 'parent') {
    return `오늘은 "${title}" 활동으로 아이들이 ${focus}을(를) 몸으로 경험했습니다. ${mood} 속에서 ${reaction} 모습이 보였고, ${description} 오늘의 움직임 경험이 참여와 자신감으로 이어질 수 있도록 정리했습니다.${noteLine}`;
  }

  if (audience === 'center') {
    return `"${title}"은 ${compactList([target, space, duration]) || '현장 수업'} 조건에서 운영할 수 있는 체육수업 설명입니다. 준비물은 ${equipment}이며, 활동 흐름은 ${activity || '도입 안내, 주요 움직임 경험, 마무리 정리'} 중심으로 구성됩니다. 오늘 수업은 ${mood} 속에서 진행되었고 아이들은 ${reaction} 흐름을 보였습니다. 기대 효과는 ${focus}을(를) 수업 장면 안에서 경험하고 설명할 수 있다는 점입니다.${noteLine}`;
  }

  return `수업 활동 기록: ${title}. 본 차시는 ${compactList([target, space, duration]) || '현장 수업'} 조건에서 ${equipment}을(를) 활용해 진행한 신체활동입니다. 학생들은 ${focus}을(를) 중심으로 활동 흐름에 참여했으며, ${mood} 속에서 ${reaction} 모습을 보였습니다. ${variation} 오늘의 움직임 경험을 수업 참여 내용으로 정리합니다.${noteLine}`;
}

function ChipGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggle(selected, option))}
            className="min-h-9 rounded-full border px-3 text-[12px] font-black"
            style={{
              background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
              borderColor: active ? 'transparent' : 'var(--spm-br2)',
              color: active ? '#fff' : 'var(--spm-t2)',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function SingleChoice({ options, value, onChange }: { options: string[]; value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="min-h-9 rounded-full border px-3 text-[12px] font-black"
            style={{
              background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
              borderColor: active ? 'transparent' : 'var(--spm-br2)',
              color: active ? '#fff' : 'var(--spm-t2)',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const programs = useMasterStore((state) => state.programs);
  const programsError = useMasterStore((state) => state.programsError);
  const programPool = useMemo(() => programs, [programs]);
  const initialProgramId = searchParams.get('programId') ?? searchParams.get('program') ?? programPool[0]?.id ?? '';
  const hasProgramQuery = Boolean(searchParams.get('programId') ?? searchParams.get('program'));
  const [programId, setProgramId] = useState(initialProgramId);
  const [audience, setAudience] = useState<Audience>('parent');
  const [mood, setMood] = useState(MOODS[0]);
  const [reaction, setReaction] = useState(REACTIONS[0]);
  const [focusSkills, setFocusSkills] = useState<string[]>(['참여', '반응']);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<SavedExplanation[]>([]);

  useEffect(() => setSaved(loadSaved()), []);

  useEffect(() => {
    if (!programId && programPool[0]?.id) setProgramId(programPool[0].id);
  }, [programId, programPool]);

  const program = programPool.find((item) => item.id === programId) ?? programPool[0];
  const filteredPrograms = search.trim()
    ? programPool.filter((item) => `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
    : programPool;
  const audienceMeta = AUDIENCES.find((item) => item.id === audience) ?? AUDIENCES[0];
  const draft = program ? buildExplanation({ audience, program, mood, reaction, focusSkills, note }) : '';
  const output = generated || draft;
  const activityPreview = program ? getActivityFlow(program).slice(0, 2) : [];

  const copyOutput = async () => {
    if (!output.trim()) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const saveOutput = () => {
    if (!program || !output.trim()) return;
    const next: SavedExplanation = {
      id: `${Date.now()}`,
      programId: program.id,
      programTitle: program.title,
      audience,
      text: output,
      createdAt: new Date().toISOString(),
    };
    const list = [next, ...saved].slice(0, 10);
    setSaved(list);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>lesson explanation</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 설명 도구</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업이 끝나면 오늘의 활동이 설명 가능한 문장으로 정리됩니다. 체육수업의 의미를 학부모, 기관, 학교에 맞는 언어로 남깁니다.
        </p>
      </header>

      {hasProgramQuery && program ? (
        <section className="mx-[22px] mb-5 rounded-[18px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.24)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>selected lesson</p>
          <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{program.title} 설명 만들기</h2>
          <p className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
            {compactList([normalizeMasterTarget(program.grade), normalizeMasterSpace(program.space), displayMasterDuration(program.duration)])}
          </p>
          {activityPreview.length ? (
            <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
              활동 흐름: {activityPreview.join(' ')}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className={`grid gap-5 px-[22px] sm:px-8 lg:px-10 ${hasProgramQuery ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
        <aside className={`space-y-4 ${hasProgramQuery ? 'order-2' : 'order-1'}`}>
          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={16} color="var(--spm-acc)" />
              <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{hasProgramQuery ? '다른 수업 선택' : '수업 선택'}</h2>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color="var(--spm-t3)" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="수업명이나 주제로 검색"
                className="h-10 w-full rounded-[11px] border pl-9 pr-3 text-[13px] font-bold outline-none"
                style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
              />
            </div>
            <div className={`scrollbar-hide space-y-1 overflow-y-auto ${hasProgramQuery ? 'max-h-[220px] lg:max-h-[420px]' : 'max-h-[330px]'}`}>
              {filteredPrograms.length ? (
                filteredPrograms.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProgramId(item.id);
                      setGenerated('');
                    }}
                    className="w-full rounded-[12px] px-3 py-2.5 text-left"
                    style={{ background: item.id === program?.id ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: item.id === program?.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent' }}
                  >
                    <strong className="block line-clamp-1 text-[13px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
                    <span className="mt-1 block line-clamp-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{compactList([normalizeMasterTarget(item.grade), normalizeMasterSpace(item.space), displayMasterDuration(item.duration)]) || item.category}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  {programsError === 'forbidden'
                    ? '이용권 만료로 수업 자료를 불러올 수 없습니다. 30일 이용권을 다시 결제해 주세요.'
                    : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>최근 만든 설명</h2>
            <div className="mt-3 space-y-2">
              {saved.length ? saved.slice(0, 5).map((item) => (
                <button key={item.id} type="button" onClick={() => setGenerated(item.text)} className="block w-full rounded-[12px] p-3 text-left" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
                  <strong className="block line-clamp-1 text-[12px]" style={{ color: 'var(--spm-t)' }}>{item.programTitle}</strong>
                  <span className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{AUDIENCES.find((aud) => aud.id === item.audience)?.label} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                </button>
              )) : (
                <p className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  아직 만든 설명이 없습니다. 수업을 선택하고 오늘의 활동을 정리해보세요.
                </p>
              )}
            </div>
          </section>
        </aside>

        <section className={`space-y-3 sm:space-y-4 ${hasProgramQuery ? 'order-1' : 'order-2'}`}>
          <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>오늘 수업 정리</p>
                <h2 className="mt-1 text-[24px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>{program?.title ? `${program.title} 설명 만들기` : '수업을 선택하세요'}</h2>
              </div>
              {program ? (
                <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <BookOpen size={14} />
                  수업 자료 보기
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5">
              <div>
                <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>설명 대상</p>
                <div className="grid grid-cols-3 gap-2">
                  {AUDIENCES.map(({ id, label, description, Icon }) => {
                    const active = audience === id;
                    return (
                      <button key={id} type="button" onClick={() => { setAudience(id); setGenerated(''); }} className="rounded-[14px] p-2.5 text-left sm:p-3" style={{ background: active ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: active ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br2)' }}>
                        <Icon size={16} color={active ? 'var(--spm-acc)' : 'var(--spm-t3)'} />
                        <strong className="mt-2 block text-[13px]" style={{ color: 'var(--spm-t)' }}>{label}</strong>
                        <span className="mt-1 hidden text-[11px] font-semibold leading-4 sm:block" style={{ color: 'var(--spm-t3)' }}>{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div>
                  <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>오늘 수업 분위기</p>
                  <SingleChoice options={MOODS} value={mood} onChange={(next) => { setMood(next); setGenerated(''); }} />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>아이들 반응</p>
                  <SingleChoice options={REACTIONS} value={reaction} onChange={(next) => { setReaction(next); setGenerated(''); }} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>강조한 움직임</p>
                <ChipGroup options={FOCUS_SKILLS} selected={focusSkills} onChange={(next) => { setFocusSkills(next); setGenerated(''); }} />
              </div>

              <label className="block">
                <span className="mb-2 block text-[12px] font-black" style={{ color: 'var(--spm-t2)' }}>특이사항</span>
                <textarea
                  value={note}
                  onChange={(event) => { setNote(event.target.value); setGenerated(''); }}
                  rows={3}
                  placeholder="예: 처음에는 조심스러웠지만 두 번째 라운드부터 규칙을 이해하고 적극적으로 참여했습니다."
                  className="w-full resize-y rounded-[13px] border px-3 py-3 text-[13px] font-semibold leading-6 outline-none"
                  style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.14), var(--spm-s1))', border: '1px solid rgba(99,102,241,0.22)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.12em]" style={{ color: '#818cf8' }}>{audienceMeta.label}</p>
                <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{getAudienceOutputTitle(audience)}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setGenerated(draft)} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <FileText size={14} />
                  설명 문구 만들기
                </button>
                <button type="button" onClick={copyOutput} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black" style={{ background: copied ? 'rgba(16,185,129,0.16)' : 'var(--spm-s2)', color: copied ? 'var(--spm-grn)' : 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
                  {copied ? <Check size={14} /> : <Clipboard size={14} />}
                  {copied ? '복사 완료' : '복사하기'}
                </button>
                <button type="button" onClick={saveOutput} className="inline-flex h-10 items-center gap-2 rounded-[12px] px-3 text-[12px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
                  <Save size={14} />
                  저장
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line rounded-[14px] p-3.5 text-[14px] font-semibold leading-7 sm:mt-4 sm:p-4 sm:text-[15px] sm:leading-8" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t)', border: '1px solid var(--spm-br2)' }}>
              {program ? output : '수업을 선택하면 설명 문구를 만들 수 있습니다.'}
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: 'var(--spm-bg)' }} />}>
      <ReportContent />
    </Suspense>
  );
}
