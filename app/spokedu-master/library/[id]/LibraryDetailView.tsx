'use client';

import { ArrowLeft, Bookmark, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LessonAccessModal } from '../../components/lesson/LessonAccessModal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DetailLessonGuideV2 } from './components/DetailLessonGuideV2';
import v2Styles from './components/DetailLessonGuideV2.module.css';
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
import { useMasterAccessSnapshot } from '../../access/MasterAccessProvider';
import { isProgramFullDetailLocked } from '../../lib/commercialProgramAccess';
import { buildProgramLessonGateHref } from '../../lib/masterGateIntent';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { AssignProgramToSessionButton } from '../../components/session/AssignProgramToSessionButton';
import { getLibraryReturnHref } from '../libraryNavigation';
import { buildActivitySessionHref, parseMasterWorkReturnHref } from '../../lib/masterNavigationContext';
import { selectRelatedLessonVideos } from '../relatedLessonVideos';
import { fetchSessionCaptures } from '../../lib/sessionCaptureClient';
import type { MasterClassRecordDto } from '../../types/legacyOperational';
import { PersonalizedNote } from '../../components/information/PersonalizedNote';
import { selectLatestProgramMemory } from '../programMemory';
import { trackMasterFunnelEvent } from '../../lib/funnelEvents';
import { Skeleton } from '../../components/ui/Skeleton';
import { buildMasterLoginHref } from '../../lib/masterLoginReturn';

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] text-[color:var(--spm-t2)]">
      <FileText className="h-7 w-7" />
    </div>
  );
}

function LibraryDetailLoading() {
  return (
    <main data-library-detail-state="loading" className="min-h-dvh bg-[var(--spm-bg)] text-[color:var(--spm-t)]">
      <div className="h-14 border-b border-slate-200/70 bg-[var(--spm-s1)]" />
      <div className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6 sm:py-11 lg:px-8 lg:py-12">
        <section className="rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-5 sm:p-7">
          <Skeleton height={14} width="28%" className="mb-4" />
          <Skeleton height={36} width="68%" className="mb-3" />
          <Skeleton height={16} width="48%" className="mb-7" />
          <Skeleton className="aspect-video w-full" rounded="14px" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Skeleton height={120} rounded="14px" />
            <Skeleton height={120} rounded="14px" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const router = useRouter();
  const operationalData = useOperationalData();
  const programs = useMasterStore((state) => state.programs);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const programsLoading = useMasterStore((state) => state.programsLoading);
  const programsError = useMasterStore((state) => state.programsError);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const isPremium = useIsPremium();
  const accessSnapshot = useMasterAccessSnapshot();
  const profile = useMasterStore((state) => state.profile);
  const ownerId = getFavoritesOwnerId(profile);
  const storedFavoriteRefs = useMasterStore((state) =>
    ownerId ? state.favoriteContentRefsByOwner[ownerId] : undefined,
  );
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const heroTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [planCopyStatus, setPlanCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sessionCaptures, setSessionCaptures] = useState<MasterClassRecordDto[]>([]);
  const copyFeedbackTimerRef = useRef<number | null>(null);

  const program = useMemo(() => programs.find((item) => String(item.id) === id), [id, programs]);
  const programLocked = program ? isProgramFullDetailLocked({
    canUseLibrary: accessSnapshot.canUseLibrary,
  }) : true;
  const relatedVideos = useMemo(
    () => (program ? selectRelatedLessonVideos(program, programs) : []),
    [program, programs],
  );
  const latestProgramMemory = useMemo(() => selectLatestProgramMemory({
    programId: id,
    sessions: operationalData.sessions,
    captures: sessionCaptures,
  }), [id, operationalData.sessions, sessionCaptures]);
  const section = searchParams.get('section');
  const shouldAutoplayVideo = section === 'video' && searchParams.get('autoplay') === '1';
  const libraryReturnHref = getLibraryReturnHref(
    searchParams.get('libraryView'),
    searchParams.get('libraryReturn'),
  );
  const sessionId = searchParams.get('session')?.trim() || null;
  const fromSession = searchParams.get('source') === 'session' && Boolean(sessionId);
  const workReturnHref = parseMasterWorkReturnHref(
    searchParams.get('returnTo'),
    null,
    null,
    sessionId ? buildActivitySessionHref(sessionId) : libraryReturnHref,
  );
  const detailReturnHref = fromSession ? workReturnHref : libraryReturnHref;
  const detailQuery = searchParams.toString();
  const detailCurrentPath = `/spokedu-lab/library/${encodeURIComponent(id)}${detailQuery ? `?${detailQuery}` : ''}`;

  useEffect(() => {
    if (!isPremium) {
      setSessionCaptures([]);
      return;
    }
    let active = true;
    void fetchSessionCaptures('limit=100').then((result) => {
      if (!active) return;
      setSessionCaptures(result.status === 'loaded' ? result.data : []);
    });
    return () => { active = false; };
  }, [isPremium]);

  useEffect(() => {
    if (!program || shouldAutoplayVideo || openedProgramRef.current === program.id) return;
    openedProgramRef.current = program.id;
    recordRecentProgramActivity({
      programId: program.id,
      programTitle: program.title,
      action: 'lesson_opened',
      occurredAt: new Date().toISOString(),
    });
    if (!programLocked) {
      trackMasterFunnelEvent('first_value_program_detail', { surface: 'library_detail', program_id: String(program.id) });
    }
  }, [program, programLocked, recordRecentProgramActivity, shouldAutoplayVideo]);

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

  if (!program && (!programsLoaded || programsLoading)) return <LibraryDetailLoading />;

  if (!program && programsError) {
    const isUnauthorized = programsError === 'unauthorized';
    const isForbidden = programsError === 'forbidden';
    return (
      <main data-library-detail-state="error" className="flex min-h-dvh flex-col items-center justify-center bg-[var(--spm-bg)] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-semibold text-[color:var(--spm-t)]">수업을 불러올 수 없습니다.</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--spm-t3)]">
          {isUnauthorized
            ? '로그인 후 수업 자료를 확인할 수 있습니다.'
            : isForbidden
              ? '현재 이용권으로는 이 수업 자료를 확인할 수 없습니다.'
              : '네트워크 또는 서버 문제로 수업을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {isUnauthorized ? (
            <Link href={buildMasterLoginHref(detailCurrentPath)} className="spm-btn-primary inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold focus-visible:outline-none">로그인하기</Link>
          ) : isForbidden ? (
            <Link href={buildProgramLessonGateHref(id, detailCurrentPath)} className="spm-btn-primary inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold focus-visible:outline-none">이용권 확인하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="spm-btn-primary inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold focus-visible:outline-none">다시 시도</button>
          )}
          <Link href={detailReturnHref} className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-5 text-[13px] font-semibold text-[color:var(--spm-t2)]">놀이체육으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--spm-bg)] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-semibold text-[color:var(--spm-t)]">수업을 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-[color:var(--spm-t3)]">놀이체육에서 다른 수업을 선택해 주세요.</p>
        <Link href={detailReturnHref} className="spm-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold focus-visible:outline-none">
          놀이체육으로 돌아가기
        </Link>
      </main>
    );
  }

  const favoriteEnabled = ownerId != null && accessSnapshot.canUseLibrary;
  const programGateHref = buildProgramLessonGateHref(program.id, detailCurrentPath);

  if (programLocked) {
    return <main className="min-h-dvh bg-[var(--spm-bg)]"><LessonAccessModal title={program.title} paymentHref={programGateHref} onClose={() => router.replace(detailReturnHref)} /></main>;
  }

  const model = buildLessonDisplayModel(program);
  const favorite = Boolean(storedFavoriteRefs) && isFavoriteProgram(ownerId, program.id);
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
    <main className={v2Styles.page}>
      <div className={v2Styles.backbar}><div className={v2Styles.backbarInner}>
        <Link href={detailReturnHref}><ArrowLeft />{fromSession ? '수업으로 돌아가기' : '놀이체육 목록으로'}</Link>
        <span className={v2Styles.breadcrumb}>프로그램 &gt; 놀이체육 &gt; {model.title}</span>
      </div></div>
      <div className={v2Styles.container}>
        <DetailLessonGuideV2 model={model} heroTitleRef={heroTitleRef} libraryHref={libraryReturnHref}
          video={{ embedUrl: videoEmbedUrl, directUrl: directVideoUrl, externalUrl: externalVideoUrl, sourceUrl: videoUrl, autoplay: shouldAutoplayVideo, onPlaybackStarted: recordVideoStarted }}
          relatedVideos={relatedVideos}
          personalizedContext={latestProgramMemory ? <PersonalizedNote label="지난 수업에서 이어갈 점" date={new Date(latestProgramMemory.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} context={latestProgramMemory.className} preview={latestProgramMemory.nextSessionNote} href={`/spokedu-lab/activity?session=${encodeURIComponent(latestProgramMemory.sessionId)}&capture=1`} actionLabel="지난 수업 기록 열기" /> : null}
          actions={<div className={v2Styles.actionStack}>
            <AssignProgramToSessionButton program={program} label="내 수업에 추가" targetSessionId={fromSession ? sessionId : null} returnHref={fromSession ? workReturnHref : null} className={v2Styles.primary} />
            <button type="button" onClick={() => void copyLessonPlan()} className={v2Styles.secondary}><Copy size={16} />{planCopyStatus === 'success' ? '복사 완료' : planCopyStatus === 'error' ? '다시 시도' : '지도안 복사'}</button>
            <button type="button" className={v2Styles.favorite} disabled={!favoriteEnabled} aria-pressed={favorite} onClick={() => toggleFavoriteProgram(ownerId, program.id)}><Bookmark size={14} fill={favorite ? 'currentColor' : 'none'} />즐겨찾기</button>
            <span role="status" className="sr-only">{planCopyStatus === 'success' ? '지도안을 복사했습니다.' : planCopyStatus === 'error' ? '복사하지 못했습니다. 다시 시도해 주세요.' : ''}</span>
          </div>}
        />
      </div>
    </main>
  );
}
