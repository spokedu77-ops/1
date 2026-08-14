'use client';

import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  Copy,
  FileText,
  MonitorPlay,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DetailLessonGuide } from './components/DetailLessonGuide';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import { formatLessonPlanText } from '../../lib/lessonPlanExport';
import { canOptimizeRemoteImage } from '../../lib/mediaPreferences';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  isRemoteImage,
} from '../../lib/program-media';
import { toClassRecord } from '../../lib/operationalDataAdapter';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import {
  getSupportedOfficialSpomovePresets,
} from '../../lib/program-meta';
import { publicOfficialPresetSessionHref } from '../../spomove/officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../../spomove/spomovePresetDisplayModel';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore } from '../../store';
import type { Program } from '../../types';
import { getLibraryReturnHref } from '../libraryNavigation';

const THUMBNAIL_FRAME = 'relative aspect-square w-full max-w-[1250px] overflow-hidden';


function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] text-[color:var(--spm-t2)]">
      <FileText className="h-7 w-7" />
    </div>
  );
}

function RelatedSpomoveSection({
  program,
}: {
  program: Program;
}) {
  const presets = getSupportedOfficialSpomovePresets(program);
  if (presets.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--spm-acc)]">
            <MonitorPlay className="h-3.5 w-3.5" />
            SPOMOVE 연계
          </p>
          <h2 className="mt-1 text-[16px] font-black text-[color:var(--spm-t)]">
            이 수업에 바로 붙여 쓰는 화면 활동
          </h2>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]">
            도입, 집중 전환, 마무리에 짧게 연결할 수 있는 활동입니다.
          </p>
        </div>
        <Link
          href="/spokedu-master/spomove"
          className="inline-flex min-h-9 items-center text-[12px] font-black text-[color:var(--spm-t2)]"
        >
          SPOMOVE 목록
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {presets.slice(0, 3).map((preset) => {
          const display = getSpomovePresetDisplayModel(preset);
          return (
            <Link
              key={preset.id}
              href={`${publicOfficialPresetSessionHref(preset)}&program=${encodeURIComponent(program.id)}`}
              className="group rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
            >
              <p className="text-[11px] font-black text-[var(--spm-acc)]">{display.programLabel}</p>
              <p className="mt-1 line-clamp-2 text-[14px] font-black leading-5 text-[color:var(--spm-t)]">
                {display.displayTitle}
              </p>
              <p className="mt-1 truncate text-[12px] font-semibold text-[color:var(--spm-t2)]">
                {display.difficultyLabel} · {display.durationLabel}
              </p>
              <span className="mt-3 inline-flex h-8 items-center gap-1 rounded-[9px] bg-white px-2.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 group-hover:text-[var(--spm-acc)]">
                화면 활동 시작
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const isPremium = useIsPremium();
  const profile = useMasterStore((state) => state.profile);
  const ownerId = getFavoritesOwnerId(profile);
  const storedFavoriteIds = useMasterStore((state) =>
    ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined,
  );
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const setTodayLesson = useMasterStore((state) => state.setTodayLesson);
  const todayLessons = useMasterStore((state) =>
    ownerId ? state.getTodayLessons(ownerId) : [],
  );
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const operationalData = useOperationalData();
  const classRecords = operationalData.classRecords.map(toClassRecord);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const heroTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [isHeroTitleVisible, setIsHeroTitleVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [planCopied, setPlanCopied] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const isTodayLesson = Boolean(program && todayLessons.some((assignment) => assignment.programId === program.id));
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  useEffect(() => {
    const heroTitle = heroTitleRef.current;
    if (!heroTitle || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroTitleVisible(entry?.isIntersecting ?? false),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(heroTitle);
    return () => observer.disconnect();
  }, [program?.id]);
  const section = searchParams.get('section');
  const shouldAutoplayVideo = section === 'video' && searchParams.get('autoplay') === '1';
  const libraryReturnHref = getLibraryReturnHref(searchParams.get('libraryView'));

  useEffect(() => {
    if (!program || shouldAutoplayVideo || openedProgramRef.current === program.id) return;
    openedProgramRef.current = program.id;
    recordRecentProgramActivity({
      programId: program.id,
      programTitle: program.title,
      action: 'lesson_opened',
      occurredAt: new Date().toISOString(),
    });
  }, [program, recordRecentProgramActivity, shouldAutoplayVideo]);

  useEffect(() => {
    if (section !== 'video') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('lesson-video')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [section]);

  const recordVideoStarted = useCallback(() => {
    if (!program || videoReportedRef.current === program.id) return;
    videoReportedRef.current = program.id;
    recordRecentProgramActivity({
      programId: program.id,
      programTitle: program.title,
      action: 'video_started',
      occurredAt: new Date().toISOString(),
    });
  }, [program, recordRecentProgramActivity]);


  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--spm-bg)] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-[color:var(--spm-t)]">수업을 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-[color:var(--spm-t3)]">라이브러리에서 다른 수업을 선택해 주세요.</p>
        <Link href={libraryReturnHref} className="spm-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black focus-visible:outline-none">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  if (program.isPro && !isPremium) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--spm-bg)] px-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-amber-200 bg-amber-50 text-amber-600">
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-black text-[color:var(--spm-t)]">프리미엄 전용 수업입니다.</h1>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">
          이 수업의 전체 지도안, 코치 스크립트, 영상 자료는 프리미엄 이용권에서 열람할 수 있습니다.
        </p>
        <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
          <Link href="/spokedu-master/payment?plan=premium" className="spm-btn-primary inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-[13px] font-black focus-visible:outline-none">
            프리미엄 보기
          </Link>
          <Link href="/spokedu-master/library" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-4 text-[13px] font-black text-[color:var(--spm-t2)]">
            라이브러리로
          </Link>
        </div>
      </main>
    );
  }

  const model = buildLessonDisplayModel(program);
  const title = model.title;
  const parentCopy = model.parentNote;
  const favorite = Boolean(storedFavoriteIds) && isFavoriteProgram(ownerId, program.id);
  const usageCount = usageRecords.length;
  const sortedUsageRecords = [...usageRecords].sort((a, b) => b.date.localeCompare(a.date));
  const latestUsageDate = sortedUsageRecords.length > 0
    ? new Date(sortedUsageRecords[0].date)
        .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : null;
  const recentEvidenceRecords = sortedUsageRecords.slice(0, 3);
  const videoUrl = model.videoUrl ?? undefined;
  const videoEmbedUrl = getVideoEmbedUrl(videoUrl, { autoplay: shouldAutoplayVideo });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(videoUrl) ? videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(videoUrl) : undefined;
  const galleryImages = model.galleryImageUrls;
  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const copyLessonPlan = async () => {
    await navigator.clipboard.writeText(formatLessonPlanText(model));
    setPlanCopied(true);
    window.setTimeout(() => setPlanCopied(false), 1400);
  };

  return (
    <main className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[color:var(--spm-t)] lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[color:var(--spm-br2)] bg-[color-mix(in_srgb,var(--spm-s1)_95%,transparent)] px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8">
        <Link href={libraryReturnHref} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-black text-[color:var(--spm-t2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] sm:justify-start sm:px-2" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">라이브러리로</span>
        </Link>
        <p
          data-detail-sticky-title
          aria-hidden={isHeroTitleVisible}
          className={`min-w-0 truncate text-center text-[13px] font-black text-[color:var(--spm-t)] transition-opacity duration-150 motion-reduce:transition-none sm:text-[14px] ${isHeroTitleVisible ? 'invisible opacity-0' : 'visible opacity-100'}`}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={() => toggleFavoriteProgram(ownerId, program.id)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-[color:var(--spm-t2)] ${
            favorite
              ? 'border-amber-200 bg-amber-50 text-amber-600'
              : ownerId
                ? 'border-[color:var(--spm-br2)] bg-[var(--spm-s1)]'
                : 'cursor-not-allowed border-[color:var(--spm-br2)] bg-[var(--spm-s3)] text-[color:var(--spm-t3)]'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2`}
          aria-pressed={favorite}
          aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          disabled={!ownerId}
        >
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:space-y-8 lg:px-8">
        <DetailLessonGuide
          model={model}
          heroTitleRef={heroTitleRef}
          headerStatus={usageCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              <Check className="h-3 w-3" />
              {usageCount}회 사용{latestUsageDate ? ` · 최근 ${latestUsageDate}` : ''}
            </span>
          ) : undefined}
          actions={(
            <div data-detail-actions className="mx-auto grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
                <Link data-detail-action="primary" href={`/spokedu-master/class-record?program=${program.id}`} className="spm-btn-primary inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[13px] font-black focus-visible:outline-none">
                  <Clipboard className="h-4 w-4" /> 수업 기록 시작
                </Link>
                <button data-detail-action="today" type="button" disabled={!ownerId || isTodayLesson} onClick={() => { if (ownerId && !isTodayLesson) setTodayLesson(ownerId, { id: program.id, title: program.title }); }} className="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-[9px] border border-slate-300 bg-white px-3 text-[13px] font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-70" aria-pressed={isTodayLesson}>
                  {isTodayLesson ? '✓ 오늘 수업 지정됨' : '오늘 수업으로 지정'}
                </button>
                <button data-detail-action="copy" type="button" onClick={() => void copyLessonPlan()} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-black text-[color:var(--spm-t2)]"><Copy className="h-3.5 w-3.5 shrink-0" /> {planCopied ? '복사 완료' : '지도안 복사'}</button>
            </div>
          )}
          video={{ embedUrl: videoEmbedUrl, directUrl: directVideoUrl, externalUrl: externalVideoUrl, sourceUrl: videoUrl, autoplay: shouldAutoplayVideo, onPlaybackStarted: recordVideoStarted }}
        />

        {parentCopy ? (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black text-emerald-800">안내문</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-emerald-900">{parentCopy}</p>
            <button type="button" onClick={copyParentNote} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-[var(--spm-s1)] px-4 text-sm font-bold text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '학부모 문구 복사'}
            </button>
          </div>
        ) : null}

        {galleryImages.length > 0 ? (
          <details className="rounded-[14px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-5">
            <summary className="cursor-pointer text-sm font-black text-[color:var(--spm-t2)]">수업 장면</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {galleryImages.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[12px] border border-[color:var(--spm-br2)] bg-[var(--spm-s2)]">
                  <div className={THUMBNAIL_FRAME}>
                    <Image
                      src={imageUrl}
                      alt={`${title} 수업 장면 ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 600px, 100vw"
                      className="object-cover"
                      unoptimized={isRemoteImage(imageUrl) && !canOptimizeRemoteImage(imageUrl)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {recentEvidenceRecords.length > 0 ? (
          <section className="rounded-[14px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--spm-grn)]">쌓인 기록</p>
                <h2 className="mt-1 text-[16px] font-black text-[color:var(--spm-t)]">이 수업에 쌓인 운영 증거</h2>
                <p className="mt-1 text-[12px] font-semibold text-[color:var(--spm-t2)]">
                  빠른 기록과 보강 기록이 그대로 남습니다. 다시 열어 출석·관찰을 더할 수 있습니다.
                </p>
              </div>
              <Link href="/spokedu-master/class-record" className="inline-flex min-h-10 items-center text-[12px] font-black text-[color:var(--spm-t2)]">
                기존 기록 보기
              </Link>
            </div>
            <div className="mt-4 grid gap-2">
              {recentEvidenceRecords.map((record) => {
                const isQuick = record.recordType === 'quick';
                const evidenceBits = [
                  record.memo?.trim() ? `관찰: ${record.memo.trim()}` : '',
                  record.focusCount > 0 ? `집중 ${record.focusCount}명` : '',
                  !isQuick && record.present > 0 ? `출석 ${record.present}명` : '',
                  record.parentNoteSnapshot?.trim() ? '안내문 초안 있음' : '',
                ].filter(Boolean);
                return (
                  <article key={record.id} className="rounded-[12px] border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[11px] font-bold text-[color:var(--spm-t3)]">
                        {new Date(record.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                        {record.classId ? ` · ${record.classId}` : ''}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isQuick ? 'bg-emerald-100 text-emerald-700' : 'bg-[color-mix(in_srgb,var(--spm-acc)_14%,transparent)] text-[var(--spm-acc)]'}`}>
                        {isQuick ? '빠른 기록' : '상세 기록'}
                      </span>
                    </div>
                    {evidenceBits.length > 0 ? (
                      <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]">
                        {evidenceBits.join(' · ')}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12px] font-semibold text-[color:var(--spm-t3)]">
                        날짜만 남겨진 기록입니다. 보강하면 증거가 늘어납니다.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/spokedu-master/class-record?record=${record.id}&program=${program.id}`}
                        className="spm-btn-primary inline-flex min-h-10 items-center rounded-[10px] px-3 text-[11px] font-black focus-visible:outline-none"
                      >
                        {isQuick ? '이 기록 보강' : '기록 보기'}
                      </Link>
                      <Link
                        href={`/spokedu-master/report?record=${record.id}&program=${program.id}`}
                        className="inline-flex min-h-10 items-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-3 text-[11px] font-black text-[color:var(--spm-t2)]"
                      >
                        안내문
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <RelatedSpomoveSection program={program} />

      </div>

    </main>
  );
}
