'use client';

import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileText,
  MapPin,
  MonitorPlay,
  Play,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { cleanList, cleanText, DRILL_FALLBACK, hasBrokenText } from '../../lib/clean';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  resolveProgramHero,
} from '../../lib/program-media';
import { useMasterStore } from '../../store';
import type { Drill, Program } from '../../types';

const PLACEHOLDER_PATTERN = /확인 필요|정보 없음|미정|undefined|null|도구 정보 아직 없음/i;

function usableText(value: string | undefined | null, fallback = '') {
  const text = cleanText(value ?? undefined, fallback).trim();
  if (!text || PLACEHOLDER_PATTERN.test(text)) return '';
  return text;
}

function usableList(items: string[] | undefined, fallback: string[] = []) {
  return cleanList(items, fallback)
    .map((item) => usableText(item))
    .filter((item): item is string => Boolean(item));
}

function cleanDrillName(drill: Drill | undefined, fallback = 'SPOMOVE 세팅') {
  if (!drill) return fallback;
  if (hasBrokenText(drill.name)) return DRILL_FALLBACK[drill.id] ?? fallback;
  return drill.name;
}

function getPrimaryDrill(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id));
}

function getSpomoveUseLabel(program: Program) {
  const text = `${program.title} ${program.category} ${program.description} ${program.tags.join(' ')} ${program.lessonDetail?.developmentFocus ?? ''}`;
  if (/도입|집중|신호|주의/.test(text)) return '이 수업 전 도입 세팅';
  if (/민첩|순발|반응|스피드|거리|방향/.test(text)) return 'TV·빔으로 반응 준비';
  if (/마무리|정리|리듬|협동|기억/.test(text)) return '마무리 참여 게임';
  return 'TV·빔 도입 활동';
}

function getParentCopy(program: Program, title: string, focus: string) {
  return cleanText(
    program.lessonDetail?.parentNote,
    `오늘은 ${title} 활동으로 ${focus}을 자연스럽게 경험했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`,
  );
}

function DetailSection({ title, icon: Icon, children, id }: { title: string; icon: typeof FileText; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
        <Icon className="h-4 w-4 text-indigo-600" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FactGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-[13px] border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <p className="text-[10px] font-black tracking-[0.12em] text-indigo-500">{label}</p>
          <p className="mt-1 line-clamp-2 text-[13px] font-black leading-4 text-slate-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-indigo-200 bg-white text-[10px] font-black text-indigo-600">✓</span>
          <span className="min-w-0 leading-5">{item}</span>
        </div>
      ))}
    </div>
  );
}

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500">
      <FileText className="h-7 w-7" />
    </div>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const classRecords = useMasterStore((state) => state.classRecords);
  const [copied, setCopied] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f7fb] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-slate-950">수업 자료를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 수업을 선택해 주세요.</p>
        <Link href="/spokedu-master/library" className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  const detail = program.lessonDetail;
  const title = usableText(program.title, 'SPOKEDU 수업');
  const category = usableText(program.category, '체육 수업');
  const grade = usableText(program.grade);
  const space = usableText(program.space);
  const description = usableText(program.description, `${title} 수업 운영안입니다.`);
  const equipment = usableList(program.equipment);
  const recommendedAge = usableText(detail?.recommendedAge, grade);
  const objective = usableText(detail?.objective, description);
  const focus = usableText(detail?.developmentFocus, category);
  const ruleItems = usableList(detail?.rules?.length ? detail.rules : program.steps);
  const setupNotes = usableList(detail?.setupNotes);
  const briefingNotes = usableList(detail?.briefingNotes);
  const fieldTips = usableList(detail?.fieldTips);
  const safetyNotes = usableList(detail?.safetyNotes);
  const variations = usableList(detail?.variations);
  const parentCopy = getParentCopy(program, title, focus);
  const favorite = favorites.includes(program.id);
  const usageCount = usageRecords.length;
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl, { autoplay: true });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const heroImage = resolveProgramHero(program);
  const setupImage = detail?.setupImageUrl;
  const galleryImages = (detail?.galleryImageUrls ?? []).filter((url) => url.trim());
  const primaryDrill = getPrimaryDrill(program, drills);
  const relatedSpomoveIds = detail?.relatedSpomoveIds?.length ? detail.relatedSpomoveIds : [];
  const primarySpomoveId = primaryDrill?.id ?? relatedSpomoveIds[0];
  const parentSectionId = 'detail-parent-note';

  const overviewRows = [
    ['대상', recommendedAge],
    ['공간', space],
    ['시간', program.duration ? `${program.duration}분` : ''],
    ['준비물', equipment.length > 1 ? `${equipment[0]} 외 ${equipment.length - 1}` : equipment[0] ?? ''],
  ].filter(([, value]) => value && !PLACEHOLDER_PATTERN.test(value)) as Array<[string, string]>;

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
            onClick={() => toggleFavorite(program.id)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
            aria-label={favorite ? '저장한 수업 해제' : '수업 저장'}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1360px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 rounded-[14px] border border-slate-200 bg-white/80 p-2.5">
            {[
              ['개요', 'detail-overview'],
              ['준비물', 'detail-equipment'],
              ['세팅 방법', 'detail-setup'],
              ['진행 순서', 'detail-steps'],
              ['안전 포인트', 'detail-safety'],
              ['난이도 조절', 'detail-variations'],
              ['운영 팁', 'detail-tips'],
              ['학부모 설명', parentSectionId],
            ].map(([label, href]) => (
              <a key={href} href={`#${href}`} className="block rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          <section id="detail-overview" className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
            <div className="relative aspect-video bg-slate-950">
              {videoEmbedUrl ? (
                <iframe
                  key={`${program.id}-${videoEmbedUrl}`}
                  src={videoEmbedUrl}
                  title={`${title} 참고 영상`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : directVideoUrl ? (
                <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay muted />
              ) : externalVideoUrl ? (
                <div className="grid h-full place-items-center p-6 text-center text-white">
                  <div>
                    <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
                    <p className="mt-4 text-base font-black">참고 영상 링크</p>
                    <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950">
                      유튜브에서 열기
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ) : heroImage ? (
                <Image src={heroImage} alt={title} fill sizes="(min-width: 1024px) 1180px, 100vw" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center text-white">
                  <FileText className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{category}</span>
                {usageCount > 0 ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{usageCount}회 사용</span> : null}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-700">{objective}</p>
              {overviewRows.length > 0 ? (
                <div className="mt-5">
                  <FactGrid rows={overviewRows} />
                </div>
              ) : null}
            </div>
          </section>

          {equipment.length > 0 ? (
            <DetailSection id="detail-equipment" title="준비물" icon={CheckCircle2}>
              <Checklist items={equipment} />
            </DetailSection>
          ) : null}

          {(setupImage || setupNotes.length > 0) ? (
            <DetailSection id="detail-setup" title="세팅 방법" icon={MapPin}>
              {setupImage ? (
                <div className="mb-4 overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
                  <div className="relative aspect-[16/7] min-h-[180px]">
                    <Image src={setupImage} alt={`${title} 세팅 방법`} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" unoptimized />
                  </div>
                </div>
              ) : null}
              {setupNotes.length > 0 ? <BulletList items={setupNotes} /> : null}
            </DetailSection>
          ) : null}

          {galleryImages.length > 0 ? (
            <DetailSection id="detail-gallery" title="수업 장면" icon={FileText}>
              <div className="grid gap-3 sm:grid-cols-2">
                {galleryImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
                    <div className="relative aspect-video">
                      <Image src={imageUrl} alt={`${title} 수업 장면 ${index + 1}`} fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" unoptimized />
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {ruleItems.length > 0 ? (
            <DetailSection id="detail-steps" title="진행 순서" icon={FileText}>
              <ol className="space-y-3">
                {ruleItems.map((step, index) => (
                  <li key={`${step}-${index}`} className="grid grid-cols-[32px_1fr] gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-800">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black text-indigo-600 ring-1 ring-slate-200">{index + 1}</span>
                    <span className="font-semibold">{step}</span>
                  </li>
                ))}
              </ol>
            </DetailSection>
          ) : null}

          {safetyNotes.length > 0 ? (
            <DetailSection id="detail-safety" title="안전 포인트" icon={CheckCircle2}>
              <BulletList items={safetyNotes} />
            </DetailSection>
          ) : null}

          {variations.length > 0 ? (
            <DetailSection id="detail-variations" title="난이도 조절" icon={FileText}>
              <BulletList items={variations} />
            </DetailSection>
          ) : null}

          {(fieldTips.length > 0 || briefingNotes.length > 0) ? (
            <DetailSection id="detail-tips" title="운영 팁" icon={FileText}>
              <BulletList items={[...fieldTips, ...briefingNotes]} />
            </DetailSection>
          ) : null}

          {relatedSpomoveIds.length > 0 ? (
            <DetailSection id="detail-spomove" title="관련 SPOMOVE 세팅" icon={MonitorPlay}>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-500">이 수업 전 도입이나 반응 준비 활동으로 연결해 사용할 수 있습니다.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {relatedSpomoveIds.map((spomoveId) => {
                  const drill = drills.find((item) => item.id === spomoveId);
                  return (
                    <Link key={spomoveId} href={`/spokedu-master/spomove/session?drill=${spomoveId}&mode=projector&program=${program.id}`} className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                        <Zap className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black text-slate-950">{cleanDrillName(drill, spomoveId)}</strong>
                        <span className="mt-1 block text-xs font-semibold text-indigo-700">{getSpomoveUseLabel(program)} · TV·빔 실행</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </DetailSection>
          ) : null}

          <DetailSection id={parentSectionId} title="학부모 설명 문구" icon={Clipboard}>
            <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold leading-7 text-emerald-900">{parentCopy}</p>
            <button type="button" onClick={copyParentNote} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '학부모 문구 복사'}
            </button>
          </DetailSection>

          <div className="sticky bottom-0 z-20 flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex-row">
            {primarySpomoveId ? (
              <Link href={`/spokedu-master/spomove/session?drill=${primarySpomoveId}&mode=projector&program=${program.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">
                <MonitorPlay className="h-4 w-4" />
                SPOMOVE 실행
              </Link>
            ) : null}
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '문구 복사'}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(program.id)}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              {favorite ? '저장됨' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
