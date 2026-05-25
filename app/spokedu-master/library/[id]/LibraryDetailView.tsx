'use client';

import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  MonitorPlay,
  Play,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { CategoryIcon } from '../../components/ui/ProgramThumb';
import { cleanList, cleanText, DRILL_FALLBACK, hasBrokenText, PROGRAM_FALLBACK } from '../../lib/clean';
import { useIsPro, useMasterStore } from '../../store';
import type { Drill, Program } from '../../types';

function fallbackProgramValue<K extends keyof Program>(program: Program, key: K, fallback: Program[K]) {
  const override = PROGRAM_FALLBACK[program.id]?.[key] as Program[K] | undefined;
  const value = program[key];
  if (typeof value === 'string') {
    if (!value.trim() || hasBrokenText(value)) return (override ?? fallback) as Program[K];
  }
  if (Array.isArray(value)) {
    const cleaned = value.filter((item) => typeof item !== 'string' || !hasBrokenText(item));
    if (!cleaned.length) return (override ?? fallback) as Program[K];
    return cleaned as Program[K];
  }
  return value ?? override ?? fallback;
}

function cleanDrillName(drill: Drill | undefined, fallback = 'SPOMOVE 드릴') {
  if (!drill) return fallback;
  if (hasBrokenText(drill.name)) return DRILL_FALLBACK[drill.id] ?? fallback;
  return drill.name;
}

function getYouTubeId(url?: string) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
}

function getVideoEmbedUrl(url?: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  return undefined;
}

function isDirectVideoUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url));
}

function getExternalVideoUrl(url?: string) {
  const text = (url ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return undefined;
  if (getVideoEmbedUrl(text) || isDirectVideoUrl(text)) return undefined;
  return text;
}

function getPrimaryDrill(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id));
}

function getSpomoveUseLabel(program: Program) {
  const text = `${program.title} ${program.category} ${program.description} ${program.tags.join(' ')} ${program.lessonDetail?.developmentFocus ?? ''}`;
  if (/도입|집중|신호|주의/.test(text)) return '도입 3분 집중 전환';
  if (/펜싱|민첩|순발|반응|스피드|거리|방향/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|리듬|협동|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function getParentCopy(program: Program, title: string, focus: string) {
  return cleanText(
    program.lessonDetail?.parentNote,
    `오늘은 ${title} 활동으로 ${focus}을 자연스럽게 경험했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`,
  );
}

function DetailSection({ title, icon: Icon, children, id }: { title: string; icon: typeof FileText; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[10px] border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
        <Icon className="h-4 w-4 text-indigo-600" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OverviewTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="max-w-xl overflow-hidden rounded-lg border border-slate-200">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr] border-b border-slate-200 last:border-b-0">
          <div className="bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{label}</div>
          <div className="px-3 py-2 text-xs font-semibold text-slate-800">{value}</div>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items, tone = 'bg-indigo-300' }: { items: string[]; tone?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const classRecords = useMasterStore((state) => state.classRecords);
  const isPro = useIsPro();
  const [copied, setCopied] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f7fb] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-slate-950">수업안을 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 프로그램을 선택해 주세요.</p>
        <Link href="/spokedu-master/library" className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  const detail = program.lessonDetail;
  const title = fallbackProgramValue(program, 'title', 'SPOKEDU 수업 패키지') as string;
  const category = fallbackProgramValue(program, 'category', '체육 수업') as string;
  const grade = fallbackProgramValue(program, 'grade', '전 학년') as string;
  const space = fallbackProgramValue(program, 'space', '실내 또는 체육 공간') as string;
  const description = fallbackProgramValue(program, 'description', `${title} 수업 패키지입니다.`) as string;
  const equipment = fallbackProgramValue(program, 'equipment', ['현장 기본 교구']) as string[];
  const favorite = favorites.includes(program.id);
  const locked = program.isPro && !isPro;
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl);
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const setupImage = detail?.setupImageUrl;
  const primaryDrill = getPrimaryDrill(program, drills);
  const relatedSpomoveIds = detail?.relatedSpomoveIds?.length ? detail.relatedSpomoveIds : [];
  const primarySpomoveId = primaryDrill?.id ?? relatedSpomoveIds[0];
  const recommendedAge = cleanText(detail?.recommendedAge, grade);
  const recommendedPlayers = cleanText(detail?.recommendedPlayers, '현장 규모에 맞게 조정');
  const objective = cleanText(detail?.objective, description);
  const focus = cleanText(detail?.developmentFocus, category);
  const ruleItems = cleanList(detail?.rules?.length ? detail.rules : program.steps, [
    '공간과 준비물을 확인하고 학생들이 안전하게 움직일 범위를 먼저 정합니다.',
    '시범을 짧게 보여준 뒤 기본 규칙으로 1라운드를 진행합니다.',
    '학생 반응을 보며 난이도와 이동 거리를 조절합니다.',
  ]);
  const setupNotes = cleanList(detail?.setupNotes, [`공간: ${space}`, `준비물: ${equipment.join(', ')}`]);
  const briefingNotes = cleanList(detail?.briefingNotes, []);
  const fieldTips = cleanList(detail?.fieldTips, []);
  const safetyNotes = cleanList(detail?.safetyNotes, []);
  const variations = cleanList(detail?.variations, []);
  const parentCopy = getParentCopy(program, title, focus);
  const usageCount = usageRecords.length;
  const safetyItems = safetyNotes.length
    ? safetyNotes
    : ['활동 전 이동 동선의 장애물을 정리합니다.', '교구를 던지거나 밀치지 않도록 약속합니다.', '속도보다 안전한 이동과 정확한 규칙 수행을 우선합니다.'];
  const overviewRows = [
    ['테마', category],
    ['대상', recommendedAge],
    ['인원', recommendedPlayers],
    ['기능', focus],
    ['공간', space],
    ['시간', `${program.duration}분`],
  ].filter(([, value]) => value && !/확인 필요|미정|undefined|null/i.test(value)) as Array<[string, string]>;

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-dvh bg-[#f6f7f9] pb-24 text-slate-950 lg:pb-14">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href="/spokedu-master/library" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyParentNote}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? '복사 완료' : '문구 복사'}
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(program.id)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 rounded-[10px] border border-slate-200 bg-white p-3">
            {['개요', '사전 체크', '교구 세팅', '안전', '참고 영상', '활동 방법', '응용', '설명 문구'].map((item) => (
              <a key={item} href={`#detail-${item}`} className="block rounded-lg px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="rounded-[10px] border border-slate-200 bg-white p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
                <CategoryIcon category={category} size={28} />
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{category}</span>
              {program.isPro ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">PRO</span> : null}
              {usageCount > 0 ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{usageCount}회 사용</span> : null}
            </div>
            <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-4 border-l-2 border-slate-900 pl-4 text-sm font-semibold leading-7 text-slate-700">{objective}</p>
            {locked ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
                <Lock className="mr-2 inline h-4 w-4" />
                Pro 전용 수업안입니다.
              </div>
            ) : null}
          </section>

          <DetailSection id="detail-개요" title="프로그램 개요" icon={FileText}>
            <OverviewTable rows={overviewRows} />
          </DetailSection>

          <DetailSection id="detail-사전 체크" title="사전 체크 Pre-Activity Checklist" icon={CheckCircle2}>
            <div className="rounded-lg border border-slate-200 p-4 lg:p-3">
              <p className="text-xs font-black text-slate-700">필요 교구</p>
              <ul className="mt-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-x-6 lg:gap-y-2">
                {equipment.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-3.5 w-3.5 border border-slate-500 bg-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </DetailSection>

          <DetailSection id="detail-교구 세팅" title="초기 교구 세팅" icon={MapPin}>
            <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
              <div className="relative aspect-[16/7] min-h-[220px]">
                {setupImage ? (
                  <Image src={setupImage} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center bg-white px-6 text-center">
                    <div>
                      <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-base font-black text-slate-700">교구 세팅 사진 아직 없음</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">아래 세팅 메모만 확인하세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <BulletList items={setupNotes} />
            </div>
          </DetailSection>

          <DetailSection id="detail-안전" title="활동 전 선행되어야 할 사전 교육" icon={FileText}>
            <ul className="space-y-2">
              {safetyItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1 h-4 w-4 shrink-0 border border-slate-500" />
                  {item}
                </li>
              ))}
            </ul>
          </DetailSection>

          {(videoEmbedUrl || directVideoUrl || externalVideoUrl) ? (
            <DetailSection id="detail-참고 영상" title="참고 영상" icon={Play}>
              <div className="overflow-hidden rounded-[10px] bg-slate-950">
                <div className="relative aspect-video">
                  {videoEmbedUrl ? (
                    <iframe src={videoEmbedUrl} title={`${title} 영상`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                  ) : directVideoUrl ? (
                    <video src={directVideoUrl} className="h-full w-full object-cover" controls muted playsInline />
                  ) : externalVideoUrl ? (
                    <div className="grid h-full place-items-center bg-slate-950 p-6 text-center text-white">
                      <div>
                        <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
                        <p className="mt-4 text-base font-black">외부 참고 영상</p>
                        <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950">
                          영상 열기
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </DetailSection>
          ) : null}

          <DetailSection id="detail-활동 방법" title="활동 방법 How to Play" icon={FileText}>
            <ol className="space-y-3 border-t border-slate-200 pt-4">
              {ruleItems.map((step, index) => (
                <li key={`${step}-${index}`} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-6 text-slate-800">
                  <span className="font-black text-slate-500">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </DetailSection>

          {(variations.length > 0 || fieldTips.length > 0 || briefingNotes.length > 0) ? (
            <DetailSection id="detail-응용" title="응용 방법 Variations" icon={FileText}>
              <ul className="space-y-3 border-t border-slate-200 pt-4">
                {[...variations, ...fieldTips, ...briefingNotes].map((item, index) => (
                  <li key={`${item}-${index}`} className="grid grid-cols-[18px_1fr] gap-3 text-sm leading-6 text-slate-800">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          {relatedSpomoveIds.length > 0 ? (
            <DetailSection title="SPOMOVE 활동" icon={MonitorPlay}>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-500">이 수업안에 명시 연결된 큰 화면 활동입니다.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {relatedSpomoveIds.map((spomoveId) => {
                  const drill = drills.find((item) => item.id === spomoveId);
                  return (
                    <Link key={spomoveId} href={`/spokedu-master/spomove/session?drill=${spomoveId}&mode=projector&program=${program.id}`} className="flex items-center gap-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600">
                        <Zap className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black text-slate-950">{cleanDrillName(drill, spomoveId)}</strong>
                        <span className="mt-1 block text-xs font-semibold text-indigo-700">{getSpomoveUseLabel(program)} · 큰 화면 실행</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </DetailSection>
          ) : null}

          <DetailSection id="detail-설명 문구" title="학부모·기관 설명 문구" icon={Clipboard}>
            <p className="rounded-lg bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">{parentCopy}</p>
          </DetailSection>

          <div className="sticky bottom-0 z-20 grid gap-2 rounded-[10px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid-cols-4">
            <a href="#detail-활동 방법" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white">
              <FileText className="h-4 w-4" />
              활동 방법
            </a>
            {primarySpomoveId ? (
              <Link href={`/spokedu-master/spomove/session?drill=${primarySpomoveId}&mode=projector&program=${program.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-700">
                <MonitorPlay className="h-4 w-4" />
                큰 화면
              </Link>
            ) : null}
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '문구 복사'}
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
              <FileText className="h-4 w-4" />
              인쇄
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500">
      <FileText className="h-7 w-7" />
    </div>
  );
}
