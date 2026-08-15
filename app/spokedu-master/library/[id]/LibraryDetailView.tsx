'use client';

import { ArrowLeft, Bookmark, Clipboard, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DetailLessonGuide } from './components/DetailLessonGuide';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import { formatLessonPlanText } from '../../lib/lessonPlanExport';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
} from '../../lib/program-media';
import { getActiveTodayLessons } from '../../lib/todayLesson';
import { useIsPremium, useMasterStore } from '../../store';
import { getLibraryReturnHref } from '../libraryNavigation';

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] text-[color:var(--spm-t2)]">
      <FileText className="h-7 w-7" />
    </div>
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
  const todayLessonByOwner = useMasterStore((state) => state.todayLessonByOwner);
  const todayLessons = useMemo(
    () => getActiveTodayLessons(todayLessonByOwner, ownerId),
    [ownerId, todayLessonByOwner],
  );
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const heroTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [isHeroTitleVisible, setIsHeroTitleVisible] = useState(true);
  const [planCopied, setPlanCopied] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const isTodayLesson = Boolean(
    program && todayLessons.some((assignment) => assignment.programId === program.id),
  );
  const section = searchParams.get('section');
  const shouldAutoplayVideo = section === 'video' && searchParams.get('autoplay') === '1';
  const libraryReturnHref = getLibraryReturnHref(searchParams.get('libraryView'));

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
      document.getElementById('lesson-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          이 수업의 전체 지도안, 코칭 스크립트, 영상 자료는 프리미엄 이용권에서 열람할 수 있습니다.
        </p>
        <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
          <Link href="/spokedu-master/payment?plan=premium" className="spm-btn-primary inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-[13px] font-black focus-visible:outline-none">프리미엄 보기</Link>
          <Link href="/spokedu-master/library" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-4 text-[13px] font-black text-[color:var(--spm-t2)]">라이브러리로</Link>
        </div>
      </main>
    );
  }

  const model = buildLessonDisplayModel(program);
  const favorite = Boolean(storedFavoriteIds) && isFavoriteProgram(ownerId, program.id);
  const videoUrl = model.videoUrl ?? undefined;
  const videoEmbedUrl = getVideoEmbedUrl(videoUrl, { autoplay: shouldAutoplayVideo });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(videoUrl) ? videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(videoUrl) : undefined;

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
        <p data-detail-sticky-title aria-hidden={isHeroTitleVisible} className={`min-w-0 truncate text-center text-[13px] font-black text-[color:var(--spm-t)] transition-opacity duration-150 motion-reduce:transition-none sm:text-[14px] ${isHeroTitleVisible ? 'invisible opacity-0' : 'visible opacity-100'}`}>
          {model.title}
        </p>
        <button type="button" onClick={() => toggleFavoriteProgram(ownerId, program.id)} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-[color:var(--spm-t2)] ${favorite ? 'border-amber-200 bg-amber-50 text-amber-600' : ownerId ? 'border-[color:var(--spm-br2)] bg-[var(--spm-s1)]' : 'cursor-not-allowed border-[color:var(--spm-br2)] bg-[var(--spm-s3)] text-[color:var(--spm-t3)]'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2`} aria-pressed={favorite} aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} disabled={!ownerId}>
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <DetailLessonGuide
          model={model}
          heroTitleRef={heroTitleRef}
          actions={(
            <div data-detail-actions className="mx-auto grid w-full max-w-[760px] grid-cols-3 gap-2 sm:gap-2.5">
              <Link data-detail-action="primary" href={`/spokedu-master/class-record?program=${program.id}`} className="spm-btn-primary inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-[10px] px-1.5 text-[11px] font-black whitespace-nowrap focus-visible:outline-none sm:gap-2 sm:px-3 sm:text-[13px]">
                <Clipboard className="hidden h-4 w-4 shrink-0 sm:block" /> 수업 기록 시작
              </Link>
              <button data-detail-action="today" type="button" disabled={!ownerId || isTodayLesson} onClick={() => { if (ownerId && !isTodayLesson) setTodayLesson(ownerId, { id: program.id, title: program.title }); }} className="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-slate-300 bg-white px-1 text-[10px] font-black text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 sm:px-3 sm:text-[13px]" aria-pressed={isTodayLesson}>
                {isTodayLesson ? '✓ 오늘 수업 지정됨' : '오늘 수업으로 지정'}
              </button>
              <button data-detail-action="copy" type="button" onClick={() => void copyLessonPlan()} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[10px] border border-slate-200 bg-white px-1 text-[11px] font-black text-[color:var(--spm-t2)] transition-colors hover:bg-slate-50 sm:px-3 sm:text-[13px]">
                <Copy className="hidden h-4 w-4 shrink-0 sm:block" /> {planCopied ? '복사 완료' : '지도안 복사'}
              </button>
            </div>
          )}
          video={{ embedUrl: videoEmbedUrl, directUrl: directVideoUrl, externalUrl: externalVideoUrl, sourceUrl: videoUrl, autoplay: shouldAutoplayVideo, onPlaybackStarted: recordVideoStarted }}
        />
      </div>
    </main>
  );
}
