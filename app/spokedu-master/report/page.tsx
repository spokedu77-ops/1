'use client';

import Link from 'next/link';
import { BookOpen, Check, Clipboard, FileText, GraduationCap, Megaphone, MessageCircle, MonitorPlay, UsersRound, type LucideIcon } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isTrialExpired } from '../lib/subscription';
import { useMasterStore, useIsPro, useProfile } from '../store';

type Audience = 'parent' | 'center' | 'school' | 'promo';
type CopyBlock = {
  title: string;
  caption: string;
  text: string;
};

const AUDIENCES: Array<{ id: Audience; label: string; description: string; Icon: LucideIcon }> = [
  { id: 'parent', label: '학부모용', description: '수업 직후 안내 메시지', Icon: UsersRound },
  { id: 'center', label: '기관용', description: '상담·운영 설명 문구', Icon: FileText },
  { id: 'school', label: '학교 기록용', description: '차시 활동 기록 문구', Icon: GraduationCap },
  { id: 'promo', label: '홍보용', description: '블로그·SNS 소개 문구', Icon: Megaphone },
];

import type { Program } from '../types';

function buildCopyBlocks(audience: Audience, program: Program): CopyBlock[] {
  const detail = program.lessonDetail;
  const focus = detail?.developmentFocus ?? program.tags.join(', ');
  const objective = detail?.objective ?? program.description;
  const equipment = program.equipment.join(', ');
  const baseMeta = `${program.grade} / ${program.duration}분 / ${program.space}`;

  if (audience === 'parent') {
    return [
      {
        title: '수업 직후 안내',
        caption: '학부모에게 바로 보낼 수 있는 기본 문구',
        text: `오늘 수업은 "${program.title}" 활동으로 진행했습니다. 아이들은 ${objective}을(를) 놀이 형태로 경험했고, ${focus}을(를) 자연스럽게 연습했습니다. 단순히 뛰는 시간이 아니라 신호를 보고 판단하고, 몸을 조절하며, 친구들과 함께 움직이는 과정에 초점을 두었습니다.`,
      },
      {
        title: '짧은 알림',
        caption: '문자나 메신저에 붙여넣기 좋은 짧은 버전',
        text: `오늘은 "${program.title}"로 ${focus}을(를) 연습했습니다. 아이들이 신호를 보고 판단하며 몸을 조절하는 경험을 했습니다.`,
      },
      {
        title: '상담용 한 줄',
        caption: '상담 기록이나 수업 노트용',
        text: `${program.title}: ${objective} 중심 활동. 관찰 포인트는 ${focus}.`,
      },
    ];
  }

  if (audience === 'center') {
    return [
      {
        title: '센터 수업 설명',
        caption: '원장/상담자가 수업 가치를 설명할 때',
        text: `"${program.title}"은 ${baseMeta} 체육 프로그램입니다. 핵심 목표는 ${objective}이며, 강사는 준비 시간을 줄이면서도 수업 의도와 성장 포인트를 보호자에게 쉽게 설명할 수 있습니다.`,
      },
      {
        title: '운영 메모',
        caption: '강사 공유나 수업 배정에 사용',
        text: `권장 대상: ${program.grade}. 운영 시간: ${program.duration}분. 공간: ${program.space}. 준비물: ${equipment}. 발달 포인트: ${focus}.`,
      },
      {
        title: '플랜 가치 문구',
        caption: '센터 도입 제안에 쓰기 좋은 문구',
        text: `SPOKEDU PRO는 프로그램 라이브러리와 SPOMOVE 실행, 수업 설명 문구를 연결해 강사별 수업 품질 편차를 줄이는 구독형 체육교육 도구입니다.`,
      },
    ];
  }

  if (audience === 'school') {
    return [
      {
        title: '차시 기록',
        caption: '학교 수업 기록에 맞춘 기본 문구',
        text: `차시 활동명: ${program.title}. 활동 목표는 ${objective}이며, 주요 관찰 요소는 ${focus}입니다. 준비물은 ${equipment}이며, ${program.space}에서 운영할 수 있습니다. 학생 참여형 신체활동으로 수업 전개와 마무리 활동에 활용 가능합니다.`,
      },
      {
        title: '수업 준비 기록',
        caption: '준비물·안전 확인용',
        text: `활동 준비: ${equipment}. 공간 조건: ${program.space}. 안전 확인: ${detail?.safetyNotes.join(' ') ?? '이동 동선과 충돌 가능성을 사전에 확인합니다.'}`,
      },
      {
        title: '교사용 요약',
        caption: '동료 교사 공유용',
        text: `${program.title}은 ${program.grade} 학생에게 적합한 ${program.duration}분 신체활동입니다. ${focus}을(를) 중심으로 참여형 수업을 구성할 수 있습니다.`,
      },
    ];
  }

  return [
    {
      title: '홍보 소개',
      caption: '블로그·SNS용 기본 소개',
      text: `${program.title} 수업은 아이들이 즐겁게 움직이면서 ${focus}을(를) 기르는 체육교육 프로그램입니다. SPOKEDU PRO의 프로그램 라이브러리와 SPOMOVE를 함께 활용해 수업 준비는 줄이고 몰입감은 높였습니다.`,
    },
    {
      title: '짧은 홍보 문구',
      caption: '이미지 카드나 공지 하단에 적합',
      text: `수업 준비는 쉽게, 수업은 더 몰입감 있게. ${program.title}로 아이들의 움직임과 집중을 함께 끌어냅니다.`,
    },
    {
      title: 'SPOMOVE 강조',
      caption: '차별화 기능을 보여줄 때',
      text: `SPOMOVE와 연결하면 화면 신호를 보고 움직이는 참여형 활동으로 전환됩니다. 아이들은 놀이처럼 몰입하고, 강사는 수업 흐름을 더 쉽게 만들 수 있습니다.`,
    },
  ];
}

function AudienceButton({ active, label, description, Icon, onClick }: { active: boolean; label: string; description: string; Icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[68px] items-center gap-3 rounded-[14px] p-3 text-left" style={{ background: active ? 'rgba(99,102,241,0.18)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid rgba(99,102,241,0.55)' : '1px solid var(--spm-br2)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s3)' }}>
        <Icon size={17} color={active ? '#fff' : 'var(--spm-t2)'} />
      </span>
      <span className="min-w-0">
        <strong className="block text-[13px]" style={{ color: active ? '#fff' : 'var(--spm-t)' }}>{label}</strong>
        <span className="mt-1 block text-[11px] font-semibold leading-4" style={{ color: active ? 'rgba(255,255,255,0.62)' : 'var(--spm-t3)' }}>{description}</span>
      </span>
    </button>
  );
}

function CopyCard({ block, copied, onCopy }: { block: CopyBlock; copied: boolean; onCopy: () => void }) {
  return (
    <article className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{block.title}</h3>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{block.caption}</p>
        </div>
        <button type="button" onClick={onCopy} className="flex h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-[12px] font-black" style={{ background: copied ? 'rgba(16,185,129,0.14)' : 'var(--spm-acc)', color: copied ? 'var(--spm-grn)' : '#fff' }}>
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? '복사 완료' : '복사'}
        </button>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-[14px] p-4 text-[14px] font-semibold leading-7" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>{block.text}</p>
    </article>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const programs = useMasterStore((state) => state.programs);
  const classRecords = useMasterStore((state) => state.classRecords);
  const recentProgramId = classRecords[0]?.programId ?? programs[0]?.id ?? '';
  const urlProgramId = searchParams.get('program');
  const profile = useProfile();
  const isPro = useIsPro();
  const trialExpired = isTrialExpired(profile);
  const [audience, setAudience] = useState<Audience>('parent');
  const [programId, setProgramId] = useState(urlProgramId ?? recentProgramId);
  const [copiedKey, setCopiedKey] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const program = programs.find((item) => item.id === programId) ?? programs[0];
  const filteredPrograms = programSearch.trim()
    ? programs.filter((p) => p.title.includes(programSearch) || p.tags.some((t) => t.includes(programSearch)))
    : programs;
  const copyBlocks = useMemo(() => (program ? buildCopyBlocks(audience, program) : []), [audience, program]);
  const activeAudience = AUDIENCES.find((item) => item.id === audience) ?? AUDIENCES[0]!;

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
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>teaching explanation</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>설명 문구</h1>
        <p className="mt-2 max-w-[780px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>프로그램을 선택하고 대상을 고르면 바로 복사할 수 있는 수업 설명 문구가 만들어집니다. 학부모 안내, 센터 운영, 학교 기록, 홍보까지 목적에 맞게 사용하세요.</p>
      </header>

      <section className="mb-6 grid gap-2 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
        {AUDIENCES.map(({ id, label, description, Icon }) => {
          const locked = (trialExpired || !isPro) && id !== 'parent';
          return (
            <div key={id} className="relative">
              <AudienceButton active={audience === id && !locked} label={label} description={description} Icon={Icon} onClick={() => { if (!locked) setAudience(id); }} />
              {locked ? (
                <div className="absolute inset-0 flex items-center justify-end rounded-[14px] bg-black/50 pr-3 backdrop-blur-[2px]">
                  <Link href="/spokedu-master/payment?plan=pro" className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }}>PRO</Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {!program ? <div className="px-[22px] py-10 text-center text-[13px]" style={{ color: 'var(--spm-t3)' }}>프로그램을 불러오는 중입니다&hellip;</div> : null}
      {program ? <main className="grid gap-6 px-[22px] sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
        <aside className="space-y-4">
          <section className="rounded-[18px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={17} color="var(--spm-acc)" />
              <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>활동 선택</h2>
            </div>
            <input type="text" value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="활동 검색…" className="mb-3 h-9 w-full rounded-[11px] border px-3 text-[12px] font-bold outline-none" style={{ background: 'var(--spm-s3)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
            <div className="scrollbar-hide max-h-[340px] space-y-2 overflow-y-auto">
              {filteredPrograms.length > 0 ? filteredPrograms.map((item) => (
                <button key={item.id} type="button" onClick={() => setProgramId(item.id)} className="w-full rounded-[13px] p-3 text-left" style={{ background: programId === item.id ? 'rgba(99,102,241,0.16)' : 'var(--spm-s3)', border: programId === item.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid transparent' }}>
                  <strong className="block text-[13px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
                  <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{item.grade} · {item.duration}분 · {item.space}</span>
                </button>
              )) : <p className="py-4 text-center text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>검색 결과가 없습니다</p>}
            </div>
          </section>

          <section className="rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.1))', border: '1px solid var(--spm-br2)' }}>
            <MessageCircle size={18} color="#a5b4fc" />
            <h2 className="mt-3 text-[16px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{activeAudience.label} 템플릿</h2>
            <p className="mt-2 text-[12px] font-semibold leading-6" style={{ color: 'var(--spm-t3)' }}>복사 버튼을 누르면 카카오, 문자, 블로그, 보고서에 바로 붙여넣을 수 있습니다.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/spokedu-master/library/${program.id}`} className="flex h-10 items-center justify-center rounded-[11px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>수업안 보기</Link>
              <Link href={`/spokedu-master/spomove/session?drill=${program.lessonDetail?.relatedSpomoveIds[0] ?? 'speed-track'}&mode=projector&program=${program.id}`} className="flex h-10 items-center justify-center gap-1 rounded-[11px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}><MonitorPlay size={14} />실행</Link>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="rounded-[18px] p-5" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>{activeAudience.label}</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{program.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[program.grade, `${program.duration}분`, program.space, ...program.tags.slice(0, 2)].map((item) => <span key={item} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{item}</span>)}
            </div>
          </div>

          {copyBlocks.map((block) => {
            const key = `${audience}-${program.id}-${block.title}`;
            return <CopyCard key={key} block={block} copied={copiedKey === key} onCopy={() => copyText(key, block.text)} />;
          })}
        </section>
      </main> : null}
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
