'use client';

import Link from 'next/link';
import {
  BookOpen,
  Check,
  Clipboard,
  FileText,
  GraduationCap,
  Megaphone,
  MessageCircle,
  MonitorPlay,
  Search,
  Send,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { isTrialExpired } from '../lib/subscription';
import { useIsPro, useMasterStore, useProfile } from '../store';
import type { ClassRecord, Program } from '../types';

type Audience = 'parent' | 'center' | 'school' | 'promo';
type CopyBlock = { title: string; caption: string; text: string };

const AUDIENCES: Array<{ id: Audience; label: string; description: string; Icon: LucideIcon }> = [
  { id: 'parent', label: '보호자용', description: '수업 직후 안내 메시지', Icon: UsersRound },
  { id: 'center', label: '기관용', description: '상담·운영 설명 문구', Icon: FileText },
  { id: 'school', label: '학교 기록용', description: '차시 활동 기록 문구', Icon: GraduationCap },
  { id: 'promo', label: '홍보용', description: '블로그·SNS 소개 문구', Icon: Megaphone },
];

function joinList(values: string[]) {
  return values.filter(Boolean).join(', ') || '기본 움직임';
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

function uniquePrograms(programs: Program[]) {
  const seen = new Set<string>();
  return programs.filter((program) => {
    const key = normalizeTitle(program.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramPool(programs: Program[]) {
  return uniquePrograms(programs.length > 0 ? programs : STATIC_PROGRAMS);
}

function buildCopyBlocks(audience: Audience, program: Program, record?: ClassRecord): CopyBlock[] {
  const detail = program.lessonDetail;
  const focus = detail?.developmentFocus || joinList(program.tags);
  const objective = detail?.objective || program.description;
  const equipment = joinList(program.equipment);
  const baseMeta = `${program.grade} / ${program.duration}분 / ${program.space}`;
  const parentNote = detail?.parentNote || `오늘은 "${program.title}" 활동으로 ${focus}을 자연스럽게 경험했습니다.`;
  const coachPoint = detail?.coachScript || `${program.title}은 ${focus}을 중심으로 수업 흐름을 구성합니다.`;
  const safetySummary = detail?.safetyNotes?.length ? detail.safetyNotes.slice(0, 2).join(' ') : '이동 동선, 충돌 가능성, 도구 간격을 사전에 확인합니다.';
  const setupSummary = detail?.setupNotes?.length ? detail.setupNotes.slice(0, 2).join(' ') : `${program.space}에서 준비물 ${equipment}을 활용합니다.`;
  const spomoveSummary = detail?.relatedSpomoveIds?.length
    ? 'SPOMOVE 화면 신호를 연결하면 학생들이 신호를 보고 판단하고 즉시 움직이는 참여형 활동으로 확장됩니다.'
    : '수업 흐름에 따라 타이머, 점수판, 설명 문구를 함께 활용할 수 있습니다.';
  const recordMeta = record ? ` 오늘 기록은 출석 ${record.present}명, 집중 관찰 ${record.focusCount}명, 동작 체크 ${record.skillCount}개로 정리되었습니다.` : '';

  if (audience === 'parent') {
    return [
      {
        title: '수업 직후 안내',
        caption: '보호자에게 바로 보낼 수 있는 완성형 문구',
        text: `${parentNote} 단순히 뛰어노는 시간이 아니라 규칙을 이해하고, 신호를 보고 판단하며, 몸의 속도와 방향을 조절하는 과정에 초점을 두었습니다. ${spomoveSummary}${recordMeta}`,
      },
      {
        title: '짧은 알림',
        caption: '카카오톡이나 문자에 붙이기 좋은 버전',
        text: `오늘은 "${program.title}"로 ${focus}을 연습했습니다. 아이들이 규칙 안에서 판단하고 몸을 조절하는 경험을 했습니다.${record ? ` 출석 ${record.present}명 기록을 저장했습니다.` : ''}`,
      },
      {
        title: '상담 메모',
        caption: '상담 기록이나 수업 노트에 남기는 문구',
        text: `${program.title}: ${objective} 관찰 포인트는 ${focus}. 수업 중 코칭 포인트는 “${coachPoint}”입니다.`,
      },
    ];
  }

  if (audience === 'center') {
    return [
      {
        title: '센터 수업 설명',
        caption: '원장·상담자가 수업 가치를 설명할 때',
        text: `"${program.title}"은 ${baseMeta} 조건에 맞춘 체육교육 프로그램입니다. 핵심 목표는 ${objective}입니다. 준비물, 공간 세팅, 안전 체크, 코치 멘트, 보호자 설명 문구까지 함께 정리되어 있어 강사별 수업 품질 편차를 줄이는 데 도움이 됩니다.`,
      },
      {
        title: '운영 메모',
        caption: '강사 공유나 수업 배정에 쓰는 요약',
        text: `권장 대상: ${program.grade}. 운영 시간: ${program.duration}분. 공간: ${program.space}. 준비물: ${equipment}. 발달 포인트: ${focus}. 공간 세팅: ${setupSummary}`,
      },
      {
        title: '도입 제안 문구',
        caption: '센터 도입 제안서에 넣기 좋은 문구',
        text: `SPOKEDU MASTER는 프로그램 라이브러리, SPOMOVE 실행, 수업 설명 문구를 연결해 강사별 수업 준비 시간을 줄이고 보호자에게 체육수업의 가치를 설명할 수 있게 돕는 구독형 체육교육 플랫폼입니다. 센터는 같은 콘텐츠 기준으로 강사 수업 품질을 맞추고, 수업 직후 보호자 커뮤니케이션까지 일관되게 운영할 수 있습니다.`,
      },
    ];
  }

  if (audience === 'school') {
    return [
      {
        title: '차시 기록',
        caption: '학교 수업 기록에 맞춘 기본 문구',
        text: `차시 활동명: ${program.title}. 활동 목표는 ${objective}이며, 주요 관찰 요소는 ${focus}입니다. 준비물은 ${equipment}이고, ${program.space} 환경에서 운영할 수 있습니다. 학생 참여형 신체활동으로 수업 전개 또는 마무리 활동에 활용 가능합니다. ${spomoveSummary}`,
      },
      {
        title: '수업 준비 기록',
        caption: '준비물·안전 확인용',
        text: `활동 준비물: ${equipment}. 공간 조건: ${program.space}. 공간 세팅: ${setupSummary} 안전 확인: ${safetySummary}`,
      },
      {
        title: '교사용 요약',
        caption: '동료 교사 공유용',
        text: `${program.title}은 ${program.grade} 학생에게 적합한 ${program.duration}분 신체활동입니다. ${focus}을 중심으로 참여형 체육수업을 구성할 수 있으며, 코칭 핵심은 “${coachPoint}”입니다.`,
      },
    ];
  }

  return [
    {
      title: '홍보 소개',
      caption: '블로그·SNS 기본 소개',
      text: `${program.title} 수업은 아이들이 즐겁게 움직이면서 ${focus}을 기르는 체육교육 프로그램입니다. 준비물과 공간 세팅, 안전 기준, 설명 문구까지 함께 제공되어 수업 준비는 줄이고 수업의 완성도는 높일 수 있습니다. ${spomoveSummary}`,
    },
    {
      title: '짧은 홍보 문구',
      caption: '이미지 카드나 공지 하단에 적합',
      text: `수업 준비는 쉽게, 수업은 더 몰입감 있게. ${program.title}로 아이들의 움직임과 집중을 함께 끌어올립니다.`,
    },
    {
      title: 'SPOMOVE 강조',
      caption: '차별화 기능을 보여줄 때',
      text: `SPOMOVE를 연결하면 화면 신호를 보고 움직이는 참여형 활동으로 전환됩니다. 아이들은 게임처럼 몰입하고, 강사는 수업 흐름을 더 쉽게 만들 수 있습니다.`,
    },
  ];
}

function CopyCard({ block, copied, onCopy }: { block: CopyBlock; copied: boolean; onCopy: () => void }) {
  return (
    <article className="overflow-hidden rounded-[16px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--spm-br)' }}>
        <div className="min-w-0">
          <h3 className="text-[13px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{block.title}</h3>
          <p className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{block.caption}</p>
        </div>
        <button type="button" onClick={onCopy} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-black" style={{ background: copied ? 'rgba(16,185,129,0.14)' : 'var(--spm-acc)', color: copied ? 'var(--spm-grn)' : '#fff' }}>
          {copied ? <Check size={13} /> : <Clipboard size={13} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <p className="whitespace-pre-line px-4 py-4 text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t)' }}>
        {block.text}
      </p>
    </article>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const programs = useMasterStore((state) => state.programs);
  const classRecords = useMasterStore((state) => state.classRecords);
  const programPool = useMemo(() => buildProgramPool(programs), [programs]);
  const recentProgramId = classRecords[0]?.programId ?? programPool[0]?.id ?? '';
  const urlProgramId = searchParams.get('program');
  const profile = useProfile();
  const isPro = useIsPro();
  const trialExpired = isTrialExpired(profile);
  const [audience, setAudience] = useState<Audience>('parent');
  const [programId, setProgramId] = useState(urlProgramId ?? recentProgramId);
  const [copiedKey, setCopiedKey] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  const program = programPool.find((item) => item.id === programId) ?? programPool[0];
  const selectedRecord = classRecords.find((record) => record.programId === program?.id);
  const filteredPrograms = programSearch.trim()
    ? programPool.filter((item) => item.title.includes(programSearch) || item.tags.some((tag) => tag.includes(programSearch)))
    : programPool;
  const copyBlocks = useMemo(() => (program ? buildCopyBlocks(audience, program, selectedRecord) : []), [audience, program, selectedRecord]);
  const combinedCopy = useMemo(() => copyBlocks.map((block) => `[${block.title}]\n${block.text}`).join('\n\n'), [copyBlocks]);
  const activeAudience = AUDIENCES.find((item) => item.id === audience) ?? AUDIENCES[0]!;
  const detail = program?.lessonDetail;
  const primaryDrillId = detail?.relatedSpomoveIds[0] ?? 'reactTrain';

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1600);
    } catch {
      setCopiedKey('');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>Explanation</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 설명 문구</h1>
        <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업 후 30초 안에 대상별 문구를 골라 복사하세요.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {[
            { label: '복사 속도', value: '30초 안에 발송' },
            { label: '대상별 문장', value: '보호자·기관·학교' },
            { label: '수업 연결', value: '수업안과 SPOMOVE' },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] px-3 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>{item.label}</p>
              <p className="mt-1 text-[12px] font-bold" style={{ color: 'var(--spm-t)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="scrollbar-hide mb-6 flex gap-1.5 overflow-x-auto px-[22px] sm:px-8 lg:px-10">
        {AUDIENCES.map(({ id, label, Icon }) => {
          const locked = !profile?.isAdmin && (trialExpired || !isPro) && id !== 'parent';
          const active = audience === id && !locked;
          const cls = 'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold';
          const sty = {
            background: active ? 'var(--spm-acc)' : 'var(--spm-s2)',
            color: active ? '#fff' : locked ? 'var(--spm-t3)' : 'var(--spm-t2)',
            border: active ? '1px solid transparent' : '1px solid var(--spm-br2)',
          };
          if (locked) {
            return (
              <Link key={id} href="/spokedu-master/payment?plan=pro" className={cls} style={sty}>
                <Icon size={13} />{label}
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.18)', color: 'var(--spm-amb)' }}>PRO</span>
              </Link>
            );
          }
          return (
            <button key={id} type="button" onClick={() => setAudience(id)} className={cls} style={sty}>
              <Icon size={13} />{label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-10">
        <aside className="space-y-4">
          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={15} color="var(--spm-acc)" />
              <h2 className="text-[14px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>활동 선택</h2>
            </div>
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" color="var(--spm-t3)" />
              <input type="text" value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="활동 검색" className="h-9 w-full rounded-[10px] border pl-8 pr-3 text-[12px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
            </div>
            <div className="scrollbar-hide max-h-[300px] space-y-1 overflow-y-auto">
              {filteredPrograms.length > 0 ? filteredPrograms.map((item) => (
                <button key={item.id} type="button" onClick={() => setProgramId(item.id)} className="w-full rounded-[11px] px-3 py-2.5 text-left active:scale-[0.99]" style={{ background: programId === item.id ? 'rgba(99,102,241,0.15)' : 'var(--spm-s3)', border: programId === item.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent' }}>
                  <strong className="block text-[12px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
                  <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{item.grade} · {item.duration}분</span>
                </button>
              )) : (
                <p className="py-4 text-center text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>검색 결과가 없습니다.</p>
              )}
            </div>
          </section>

          <section className="rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <MessageCircle size={16} color="#a5b4fc" />
            <h2 className="mt-2.5 text-[14px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{activeAudience.label} 템플릿</h2>
            <p className="mt-1.5 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
              {activeAudience.description}
            </p>
            {program ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={`/spokedu-master/library/${program.id}`} className="flex h-10 items-center justify-center rounded-[11px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  수업안
                </Link>
                <Link href={`/spokedu-master/spomove/session?drill=${primaryDrillId}&mode=projector&program=${program.id}`} className="flex h-10 items-center justify-center gap-1 rounded-[11px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <MonitorPlay size={13} />실행
                </Link>
              </div>
            ) : null}
          </section>
        </aside>

        <section className="space-y-4">
          {program ? (
            <>
              <div className="rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.14), var(--spm-s1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: '#818cf8' }}>
                      {activeAudience.label} · {selectedRecord ? '수업 기록 반영' : '수업안 기반'}
                    </p>
                    <h2 className="mt-1 text-[22px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', wordBreak: 'keep-all', letterSpacing: 0 }}>
                      {program.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[program.grade, `${program.duration}분`, program.space].map((tag) => (
                        <span key={tag} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>
                          {tag}
                        </span>
                      ))}
                      {selectedRecord ? (
                        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>
                          출석 {selectedRecord.present}명
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(`all-${audience}-${program.id}`, combinedCopy)}
                    className="hidden h-10 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12px] font-black text-white sm:flex"
                    style={{ background: copiedKey === `all-${audience}-${program.id}` ? 'var(--spm-grn)' : 'var(--spm-acc)' }}
                  >
                    {copiedKey === `all-${audience}-${program.id}` ? <Check size={14} /> : <Send size={14} />}
                    {copiedKey === `all-${audience}-${program.id}` ? '전체 복사됨' : '전체 복사'}
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    { label: '수업 의도', value: detail?.objective || program.description || program.tags.slice(0, 2).join(' · ') },
                    { label: '발달 포인트', value: detail?.developmentFocus || program.tags.join(' · ') || program.category },
                    { label: '수업 기록', value: selectedRecord ? `출석 ${selectedRecord.present}명 · 관찰 ${selectedRecord.focusCount}명` : `${program.duration}분 · ${program.space}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                      <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                      <p className="mt-1 line-clamp-3 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t)' }}>{value || '-'}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => copyText(`all-${audience}-${program.id}`, combinedCopy)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white sm:hidden"
                    style={{ background: copiedKey === `all-${audience}-${program.id}` ? 'var(--spm-grn)' : 'var(--spm-acc)' }}
                  >
                    {copiedKey === `all-${audience}-${program.id}` ? <Check size={14} /> : <Send size={14} />}
                    {copiedKey === `all-${audience}-${program.id}` ? '전체 복사됨' : '전체 복사'}
                  </button>
                  <Link href={`/spokedu-master/library/${program.id}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                    <BookOpen size={14} />
                    수업안 열기
                  </Link>
                  <Link href={`/spokedu-master/spomove/session?drill=${primaryDrillId}&mode=projector&program=${program.id}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                    <MonitorPlay size={14} />
                    큰 화면 실행
                  </Link>
                </div>
              </div>

              {copyBlocks.map((block) => {
                const key = `${audience}-${program.id}-${block.title}`;
                return <CopyCard key={key} block={block} copied={copiedKey === key} onCopy={() => copyText(key, block.text)} />;
              })}
            </>
          ) : (
            <div className="rounded-[18px] p-8 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>수업안을 불러오는 중입니다.</p>
            </div>
          )}
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
