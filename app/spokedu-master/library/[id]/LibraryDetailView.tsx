'use client';

import { ArrowLeft, Bookmark, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DetailLessonGuide } from './components/DetailLessonGuide';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import { formatLessonPlanText } from '../../lib/lessonPlanExport';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import { prefersReducedMotion } from '../../lib/mediaPreferences';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
} from '../../lib/program-media';
import { useIsPremium, useMasterStore } from '../../store';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { AssignProgramToSessionButton } from '../../components/session/AssignProgramToSessionButton';
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
  const operationalData = useOperationalData();
  const programs = useMasterStore((state) => state.programs);
  const isPremium = useIsPremium();
  const profile = useMasterStore((state) => state.profile);
  const ownerId = getFavoritesOwnerId(profile);
  const storedFavoriteIds = useMasterStore((state) =>
    ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined,
  );
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const heroTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [isHeroTitleVisible, setIsHeroTitleVisible] = useState(true);
  const [planCopyStatus, setPlanCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const copyFeedbackTimerRef = useRef<number | null>(null);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const relatedVideos = useMemo(
    () => (program ? selectRelatedLessonVideos(program, programs) : []),
    [program, programs],
  );
  const latestApplicationIdea = useMemo(() => operationalData.sessions
    .filter((session) => session.programs.some((item) => String(item.programId) === id) && session.memo?.trim())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .map((session) => ({ date: session.startAt, classId: session.className, applicationIdea: session.memo! }))[0] ?? null,
  [id, operationalData.sessions]);
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
      document.getElementById('lesson-video')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [section]);

  useEffect(() => () => {
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current);
  }, []);

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
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current);
    try {
      await navigator.clipboard.writeText(formatLessonPlanText(model));
      setPlanCopyStatus('success');
    } catch {
      setPlanCopyStatus('error');
    }
    copyFeedbackTimerRef.current = window.setTimeout(() => setPlanCopyStatus('idle'), 1600);
  };

  return (
    <main
      className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[color:var(--spm-t)] lg:pb-14"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--spm-s2) 58%, white) 0, var(--spm-bg) 34rem)',
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
        <button type="button" onClick={() => toggleFavoriteProgram(ownerId, program.id)} className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--spm-t2)] ring-1 transition duration-200 ease-out hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none ${favorite ? 'bg-amber-50/90 text-amber-600 ring-amber-200/90' : ownerId ? 'bg-white/70 ring-slate-200/70 hover:bg-white' : 'cursor-not-allowed bg-[var(--spm-s3)] text-[color:var(--spm-t3)] ring-slate-200/70'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2`} aria-pressed={favorite} aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'} disabled={!ownerId}>
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1220px] px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-12">
        <DetailLessonGuide
          model={model}
          heroTitleRef={heroTitleRef}
          continuity={latestApplicationIdea ? (
            <aside data-next-prep-continuity className="mx-auto w-full max-w-[740px] rounded-[14px] border border-slate-200 bg-white/72 px-4 py-3 text-left shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-black" style={{ color: 'var(--spm-t3)' }}>지난 수업에서 남긴 다음 적용점</p>
              <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                {new Date(latestApplicationIdea.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · {latestApplicationIdea.classId}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-[13px] font-bold leading-6" style={{ color: 'var(--spm-t2)' }}>{latestApplicationIdea.applicationIdea}</p>
              <Link href="/spokedu-master/activity" className="mt-2 inline-flex min-h-10 items-center text-[11px] font-black" style={{ color: 'var(--spm-acc)' }}>Session 기록 보기</Link>
            </aside>
          ) : null}
          actions={(
            <div data-detail-actions className="mx-auto grid w-full max-w-[740px] grid-cols-3 gap-1.5 sm:gap-2.5">
              <AssignProgramToSessionButton program={program} className="inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[11px] bg-[var(--spm-acc)] px-1 text-[12px] font-black text-white shadow-[0_6px_16px_rgba(15,23,42,0.14)] sm:px-3 sm:text-[13px]" />
              <Link data-detail-action="calendar" href="/spokedu-master/activity" className="inline-flex h-12 min-w-0 items-center justify-center rounded-[12px] bg-white/90 px-1 text-[12px] font-black text-slate-800 shadow-sm ring-1 ring-slate-300/90 sm:px-3 sm:text-[13px]">수업 캘린더</Link>
              <button data-detail-action="copy" type="button" onClick={() => void copyLessonPlan()} className="inline-flex h-12 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[11px] bg-white/62 px-1 text-[12px] font-black text-[color:var(--spm-t2)] ring-1 ring-slate-200/75 transition duration-200 ease-out hover:-translate-y-px hover:bg-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-[13px]">
                <Copy className="hidden h-4 w-4 shrink-0 sm:block" /> {planCopyStatus === 'success' ? '복사 완료' : planCopyStatus === 'error' ? '다시 시도' : '지도안 복사'}
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
