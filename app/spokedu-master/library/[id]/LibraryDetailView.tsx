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
import { selectRelatedLessonVideos } from '../relatedLessonVideos';

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
  const relatedVideos = useMemo(
    () => (program ? selectRelatedLessonVideos(program, programs) : []),
    [program, programs],
  );
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
    <main
      className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[color:var(--spm-t)] lg:pb-14"
      style={{
        background:
          'radial-gradient(circle at 50% -8rem, var(--spm-acc-a10), transparent 34rem), linear-gradient(180deg, color-mix(in srgb, var(--spm-s2) 82%, white) 0, var(--spm-bg) 38rem)',
      }}
    >
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200/70 bg-[color-mix(in_srgb,var(--spm-s1)_91%,transparent)] px-3 shadow-[0_6px_24px_rgba(15,23,42,0.035)] backdrop-blur-2xl sm:gap-3 sm:px-6 lg:px-8">
        <Link href={libraryReturnHref} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[11px] px-1 text-sm font-black text-[color:var(--spm-t2)] transition-colors duration-200 hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] motion-reduce:transition-none sm:justify-start sm:px-2" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">라이브러리로</span>
        </Link>
        <p data-detail-sticky-title aria-hidden={isHeroTitleVisible} className={`min-w-0 truncate text-center text-[13px] font-black text-[color:var(--spm-t)] transition-opacity duration-150 motion-reduce:transition-none sm:text-[14px] ${isHeroTitleVisible ? 'invisible opacity-0' : 'visible opacity-100'}`}>
          {model.title}
        </p>
        <button type="button" onClick={() => toggleFavoriteProgram(ownerId, program.id)} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--spm-t2)] shadow-sm ring-1 transition duration-200 ease-out hover:scale-[1.03] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${favorite ? 'bg-amber-50/90 text-amber-600 ring-amber-200/90' : ownerId ? 'bg-white/85 ring-slate-200/80 hover:bg-white' : 'cursor-not-allowed bg-[var(--spm-s3)] text-[color:var(--spm-t3)] ring-slate-200/70'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2`} aria-pressed={favorite} aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} disabled={!ownerId}>
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1220px] px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-12">
        <DetailLessonGuide
          model={model}
          heroTitleRef={heroTitleRef}
          actions={(
            <div data-detail-actions className="mx-auto grid w-full max-w-[740px] grid-cols-3 gap-1.5 sm:gap-2.5">
              <Link data-detail-action="primary" href={`/spokedu-master/class-record?program=${program.id}`} className="inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[12px] bg-[linear-gradient(145deg,var(--spm-acc),var(--spm-acc-muted))] px-1 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 ease-out hover:-translate-y-px hover:shadow-[0_13px_30px_rgba(15,23,42,0.23),inset_0_1px_0_rgba(255,255,255,0.18)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-[13px]">
                <Clipboard className="hidden h-4 w-4 shrink-0 sm:block" /> 수업 기록 시작
              </Link>
              <button data-detail-action="today" type="button" disabled={!ownerId || isTodayLesson} onClick={() => { if (ownerId && !isTodayLesson) setTodayLesson(ownerId, { id: program.id, title: program.title }); }} className={`inline-flex h-12 min-w-0 items-center justify-center whitespace-nowrap rounded-[12px] px-1 text-[12px] font-black shadow-sm ring-1 transition duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none sm:px-3 sm:text-[13px] ${isTodayLesson ? 'cursor-default bg-[var(--spm-acc-a10)] text-[var(--spm-acc)] ring-[var(--spm-acc-a28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' : ownerId ? 'bg-white/90 text-slate-800 ring-slate-300/90 hover:-translate-y-px hover:bg-white hover:shadow-md' : 'cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200'}`} aria-pressed={isTodayLesson}>
                {isTodayLesson ? '✓ 오늘 수업 지정됨' : '오늘 수업으로 지정'}
              </button>
              <button data-detail-action="copy" type="button" onClick={() => void copyLessonPlan()} className="inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[12px] bg-white/74 px-1 text-[12px] font-black text-[color:var(--spm-t2)] shadow-sm ring-1 ring-slate-200/80 transition duration-200 ease-out hover:-translate-y-px hover:bg-white hover:shadow-md active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-[13px]">
                <Copy className="hidden h-4 w-4 shrink-0 sm:block" /> {planCopied ? '복사 완료' : '지도안 복사'}
              </button>
            </div>
          )}
          video={{ embedUrl: videoEmbedUrl, directUrl: directVideoUrl, externalUrl: externalVideoUrl, sourceUrl: videoUrl, autoplay: shouldAutoplayVideo, onPlaybackStarted: recordVideoStarted }}
          relatedVideos={relatedVideos}
        />
      </div>
    </main>
  );
}
