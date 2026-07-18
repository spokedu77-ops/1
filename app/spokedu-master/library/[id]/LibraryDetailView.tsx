'use client';

import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  ExternalLink,
  FileText,
  Play,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BottomSheet } from '../../components/ui/BottomSheet';
import { SaveErrorBanner } from '../../components/ui/SaveErrorBanner';

import {
  LessonBulletList,
  LessonCoachScript,
  LessonFullSection,
  LessonMetaGrid,
  LessonNumberedList,
  LessonTitle,
  LessonVariationText,
} from '../../components/lesson/LessonPanels';
import { TrackedVideoIframe } from '../../components/lesson/TrackedVideoIframe';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import { canOptimizeRemoteImage } from '../../lib/mediaPreferences';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  getVideoThumbnail,
  isDirectVideoUrl,
  isRemoteImage,
} from '../../lib/program-media';
import { classRecordToCreateInput, toClassRecord, toStudentProfile } from '../../lib/operationalDataAdapter';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import {
  canAttemptOnlineSave,
  getOfflineSaveFeedback,
  resolveSaveActionFeedback,
  type SaveActionFeedback,
} from '../../lib/saveActionFeedback';
import {
  QUICK_RECORD_DRAFT_KEY,
  clearSaveDraft,
  readSaveDraft,
  writeSaveDraft,
} from '../../lib/saveDraftStorage';
import { useMasterAccessSnapshot } from '../../access/MasterAccessProvider';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore } from '../../store';
import type { ClassRecord } from '../../types';
import { getLibraryReturnHref } from '../libraryNavigation';

const THUMBNAIL_FRAME = 'relative aspect-square w-full max-w-[1250px] overflow-hidden';

type QuickRecordDraft = {
  programId: string;
  date: string;
  classId: string;
  memo: string;
  parentNote: string;
  focusStudentId: string;
};

/** 최근 기록·학생 그룹에서 반명을 찾아 빠른 기록 기본값으로 쓴다. */
function resolveQuickRecordClassId(
  records: ClassRecord[],
  studentGroups: Array<string | null | undefined>,
): string {
  const fromRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((record) => record.classId.trim())
    .find((label) => label && label !== '수업');
  if (fromRecords) return fromRecords;

  const fromStudents = studentGroups
    .map((group) => group?.trim() ?? '')
    .find((label) => label && label !== '수업');
  return fromStudents ?? '';
}

function LessonPrepBlock({
  label,
  accent = 'slate',
  children,
}: {
  label: string;
  accent?: 'emerald' | 'indigo' | 'slate';
  children: ReactNode;
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-[var(--spm-grn)]'
      : accent === 'indigo'
        ? 'text-[var(--spm-acc)]'
        : 'text-[color:var(--spm-t2)]';

  return (
    <section className="border-t border-[color:var(--spm-br)] pt-4 first:border-t-0 first:pt-0">
      <h4 className={`text-[11px] font-black uppercase tracking-[0.08em] ${accentClass}`}>{label}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

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
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const operationalData = useOperationalData();
  const classRecords = operationalData.classRecords.map(toClassRecord);
  const rosterStudents = useMemo(
    () => operationalData.students.map(toStudentProfile),
    [operationalData.students],
  );
  const accessSnapshot = useMasterAccessSnapshot();
  const isOnline = useMasterStore((state) => state.operational.online);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickDate, setQuickDate] = useState('');
  const [quickClassId, setQuickClassId] = useState('');
  const [quickMemo, setQuickMemo] = useState('');
  const [quickParentNote, setQuickParentNote] = useState('');
  const [quickFocusStudentId, setQuickFocusStudentId] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSavedRecordId, setQuickSavedRecordId] = useState<string | null>(null);
  const [quickSaveFeedback, setQuickSaveFeedback] = useState<SaveActionFeedback | null>(null);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);
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

  useEffect(() => {
    if (!quickModalOpen || quickSaved || !program) return;
    writeSaveDraft(QUICK_RECORD_DRAFT_KEY, {
      programId: program.id,
      date: quickDate,
      classId: quickClassId,
      memo: quickMemo,
      parentNote: quickParentNote,
      focusStudentId: quickFocusStudentId,
    } satisfies QuickRecordDraft);
  }, [program, quickClassId, quickDate, quickFocusStudentId, quickMemo, quickModalOpen, quickParentNote, quickSaved]);

  const defaultQuickClassId = useMemo(
    () => resolveQuickRecordClassId(classRecords, operationalData.students.map((student) => student.group)),
    [classRecords, operationalData.students],
  );

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--spm-bg)] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-[color:var(--spm-t)]">수업 자료를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-[color:var(--spm-t3)]">라이브러리에서 다른 수업을 선택해 주세요.</p>
        <Link href={libraryReturnHref} className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-5 text-[13px] font-black text-white">
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
        <h1 className="mt-5 text-xl font-black text-[color:var(--spm-t)]">프리미엄 전용 수업 자료입니다.</h1>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">
          이 수업의 전체 지도안, 코치 스크립트, 영상 자료는 프리미엄 이용권에서 열람할 수 있습니다.
        </p>
        <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
          <Link href="/spokedu-master/payment?plan=premium" className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-4 text-[13px] font-black text-white">
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

  const openQuickModal = () => {
    const draft = readSaveDraft<QuickRecordDraft>(QUICK_RECORD_DRAFT_KEY);
    const useDraft = draft?.programId === program.id;
    setQuickDate(useDraft && draft.date ? draft.date : new Date().toISOString().slice(0, 10));
    setQuickClassId(useDraft ? draft.classId : defaultQuickClassId);
    setQuickMemo(useDraft ? draft.memo : '');
    setQuickParentNote(useDraft && draft.parentNote ? draft.parentNote : model.parentNote);
    const draftFocusId = useDraft ? (draft.focusStudentId ?? '') : '';
    setQuickFocusStudentId(
      draftFocusId && rosterStudents.some((student) => student.id === draftFocusId) ? draftFocusId : '',
    );
    setQuickSaved(false);
    setQuickSavedRecordId(null);
    setQuickSaving(false);
    setQuickSaveFeedback(null);
    setQuickModalOpen(true);
  };

  const canSaveQuickRecord = Boolean(quickDate.trim());

  const handleQuickSave = () => {
    if (!canSaveQuickRecord || quickSaving) return;
    if (!canAttemptOnlineSave(isOnline)) {
      setQuickSaveFeedback(getOfflineSaveFeedback());
      return;
    }
    const focusStudent = rosterStudents.find((student) => student.id === quickFocusStudentId) ?? null;
    const record: ClassRecord = {
      id: Date.now().toString(),
      lessonTitle: title,
      classId: quickClassId.trim() || '수업',
      programId: program.id,
      programTitle: program.title,
      date: new Date(quickDate).toISOString(),
      present: focusStudent ? 1 : 0,
      absent: 0,
      focusCount: focusStudent ? 1 : 0,
      skillCount: 0,
      kakaoSent: false,
      students: focusStudent
        ? [{
            studentId: focusStudent.id,
            studentName: focusStudent.name,
            attendance: 'present',
            focused: true,
            skills: [],
            memo: undefined,
          }]
        : [],
      memo: quickMemo.trim() || undefined,
      parentNoteSnapshot: quickParentNote.trim() || undefined,
      recordType: 'quick',
    };
    setQuickSaving(true);
    setQuickSaveFeedback(null);
    setQuickSaved(false);
    setQuickSavedRecordId(null);
    void operationalData.saveClassRecord(classRecordToCreateInput(record, operationalData.students)).then((saved) => {
      setQuickSavedRecordId(saved.id);
      setQuickSaved(true);
      clearSaveDraft(QUICK_RECORD_DRAFT_KEY);
    }).catch((caught) => {
      setQuickSaveFeedback(resolveSaveActionFeedback(caught, accessSnapshot));
      setQuickSaved(false);
      setQuickSavedRecordId(null);
    }).finally(() => setQuickSaving(false));
  };
  const videoUrl = model.videoUrl ?? undefined;
  const videoEmbedUrl = getVideoEmbedUrl(videoUrl, { autoplay: shouldAutoplayVideo });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(videoUrl) ? videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(videoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const setupImage = model.setupImageUrl;
  const hasPreActivityChecklist =
    model.equipment.length > 0 ||
    model.setupNotes.length > 0 ||
    Boolean(model.coachScript) ||
    model.briefingNotes.length > 0;
  const galleryImages = model.galleryImageUrls;
  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[color:var(--spm-t)] lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[color:var(--spm-br2)] bg-[color-mix(in_srgb,var(--spm-s1)_95%,transparent)] px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8">
        <Link href={libraryReturnHref} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-black text-[color:var(--spm-t2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] sm:justify-start sm:px-2" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">라이브러리로</span>
        </Link>
        <p className="min-w-0 truncate text-center text-[13px] font-black text-[color:var(--spm-t)] sm:text-[14px]">
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

      <div className="mx-auto w-full max-w-[1360px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[14px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0">
              <LessonTitle
                title={title}
                badges={usageCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                    <Check className="h-3 w-3" />
                    {usageCount}회 사용{latestUsageDate ? ` · 최근 ${latestUsageDate}` : ''}
                  </span>
                ) : undefined}
              />
              <div className="mt-4">
                <LessonMetaGrid
                  cells={[
                    { label: '테마', value: model.theme },
                    { label: '대상', value: model.target },
                    { label: '기능', value: model.functions.join(', ') },
                    { label: '움직임', value: model.movements.join(', ') },
                    { label: '공간', value: model.space },
                    { label: '인원', value: model.participantFormat },
                  ].filter((cell) => cell.value)}
                />
              </div>
            </div>

            <aside className="rounded-[12px] border border-[color-mix(in_srgb,var(--spm-acc)_22%,transparent)] bg-[var(--spm-acc-glow)] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--spm-acc)]">이 수업으로</p>
              <p className="mt-1 text-base font-black text-[color:var(--spm-t)]">이 수업으로 바로 진행</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[color:var(--spm-t2)]">
                오늘 관찰을 남기면 학생 이력과 안내문 초안으로 이어집니다.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href={`/spokedu-master/class-record?program=${program.id}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--spm-acc)] px-3 text-[13px] font-black text-white">
                  <Clipboard className="h-4 w-4" />
                  수업 기록 시작
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={openQuickModal} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-emerald-200 bg-[var(--spm-s1)] px-3 text-[13px] font-black text-emerald-700">
                    <Check className="h-4 w-4" />
                    빠른 기록
                  </button>
                  <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[var(--spm-s1)] px-3 text-[13px] font-black text-[var(--spm-acc)]">
                    <FileText className="h-4 w-4" />
                    안내문
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {setupImage || hasPreActivityChecklist ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-start">
            {setupImage ? (
              <LessonFullSection title="초기 교구 세팅">
                <div className="overflow-hidden rounded-[12px] border border-[color:var(--spm-br2)] bg-[var(--spm-s3)] p-2">
                  <Image
                    src={setupImage}
                    alt={`${title} 세팅 방법`}
                    width={960}
                    height={720}
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className="mx-auto h-auto max-h-[420px] w-full rounded-[10px] object-contain lg:max-h-[500px]"
                    unoptimized={isRemoteImage(setupImage) && !canOptimizeRemoteImage(setupImage)}
                  />
                </div>
              </LessonFullSection>
            ) : null}

            {hasPreActivityChecklist ? (
              <LessonFullSection title="사전 체크리스트">
                <div className="space-y-4">
                  {model.equipment.length > 0 ? (
                    <LessonPrepBlock label="준비물" accent="emerald">
                      <LessonBulletList items={model.equipment} compact />
                    </LessonPrepBlock>
                  ) : null}
                  {model.setupNotes.length > 0 ? (
                    <LessonPrepBlock label="세팅">
                      <LessonBulletList items={model.setupNotes} compact />
                    </LessonPrepBlock>
                  ) : null}
                  {model.coachScript ? (
                    <LessonPrepBlock label="수업 스크립트" accent="indigo">
                      <LessonCoachScript text={model.coachScript} />
                    </LessonPrepBlock>
                  ) : null}
                  {model.briefingNotes.length > 0 ? (
                    <LessonPrepBlock label="사전 교육">
                      <LessonBulletList items={model.briefingNotes} compact />
                    </LessonPrepBlock>
                  ) : null}
                </div>
              </LessonFullSection>
            ) : null}
          </div>
        ) : null}

        {hasVideo ? (
          <div id="lesson-video" className="scroll-mt-20">
            <LessonFullSection title="영상">
              <div className="overflow-hidden rounded-[14px] bg-slate-950">
                <div className="relative aspect-video">
                  {videoEmbedUrl ? (
                    <TrackedVideoIframe
                      key={`${program.id}-${videoEmbedUrl}`}
                      src={videoEmbedUrl}
                      title={`${title} 참고 영상`}
                      className="h-full w-full"
                      onPlaybackStarted={recordVideoStarted}
                      posterUrl={getVideoThumbnail(videoUrl) ?? undefined}
                      deferUntilPlay={!shouldAutoplayVideo}
                    />
                  ) : directVideoUrl ? (
                    <video
                      src={directVideoUrl}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      autoPlay={shouldAutoplayVideo}
                      muted={shouldAutoplayVideo}
                      preload="none"
                      poster={getVideoThumbnail(videoUrl)}
                      onPlay={recordVideoStarted}
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center text-white">
                      <div>
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--spm-acc)] text-white ring-4 ring-white/70">
                          <Play className="h-5 w-5 fill-current" />
                        </span>
                        <p className="mt-4 text-base font-black">참고 영상 링크</p>
                        <a href={externalVideoUrl} target="_blank" rel="noreferrer" onClick={recordVideoStarted} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--spm-s1)] px-5 text-sm font-black text-[color:var(--spm-t)]">
                          유튜브에서 열기
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </LessonFullSection>
          </div>
        ) : null}

        {model.activityMethod.length > 0 ? (
          <LessonFullSection title="활동 방법">
            <LessonNumberedList items={model.activityMethod} />
          </LessonFullSection>
        ) : null}

        {model.variationMethod.length > 0 ? (
          <LessonFullSection title="변형 방법">
            <LessonVariationText text={model.variationMethod.join('\n')} />
          </LessonFullSection>
        ) : null}

        {/* 보호자 문구 — 등록된 값이 있을 때만 표시 (6순위) */}
        {model.fieldTips.length > 0 ? (
          <LessonFullSection title="지도 포인트">
            <LessonBulletList items={model.fieldTips} />
          </LessonFullSection>
        ) : null}

        {model.safetyNotes.length > 0 ? (
          <LessonFullSection title="안전 유의사항">
            <LessonBulletList items={model.safetyNotes} />
          </LessonFullSection>
        ) : null}

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
                        className="inline-flex min-h-10 items-center rounded-[10px] bg-[var(--spm-acc)] px-3 text-[11px] font-black text-white"
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

        <details className="rounded-[14px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-4 text-[12px] font-bold text-[color:var(--spm-t2)]">
          <summary className="cursor-pointer text-[13px] font-black text-[color:var(--spm-t)]">전체 수업 자료 구성</summary>
          <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {['1. 수업 개요', '2. 준비물·공간', '3. 수업 목표', '4. 활동 진행 순서', '5. 규칙과 지도 포인트', '6. 난이도 조절·변형', '7. 안전 유의사항', '8. 실행 행동'].map((item) => (
              <li key={item} className="break-words rounded-lg bg-[var(--spm-s2)] px-3 py-2">{item}</li>
            ))}
          </ol>
          {usageCount > 0 ? (
            <Link href="/spokedu-master/class-record" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-1 text-[12px] font-black text-[color:var(--spm-t2)]">
              기존 기록 보기
            </Link>
          ) : null}
        </details>
      </div>

      <BottomSheet open={quickModalOpen} title="빠른 기록" onClose={() => setQuickModalOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[color:var(--spm-t3)]">오늘 남기는 수업</p>
            <p className="mt-0.5 text-[13px] font-black leading-5 text-[color:var(--spm-t)]">{title}</p>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-[color:var(--spm-t3)]">
              날짜와 관찰 한 줄만 남겨도 학생 이력·안내문 근거로 쌓입니다.
            </p>
          </div>
          <div>
            <label className="block text-xs font-black text-[color:var(--spm-t2)]">수업 날짜 <span className="font-semibold text-red-400">*</span></label>
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className={`mt-1.5 h-11 w-full rounded-xl border bg-[var(--spm-s2)] px-3 text-sm font-semibold text-[color:var(--spm-t)] outline-none focus:ring-2 ${!quickDate ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-[color:var(--spm-br2)] focus:border-emerald-400 focus:ring-emerald-100'}`}
            />
            {!quickDate ? (
              <p className="mt-1 text-[11px] font-semibold text-red-400">날짜를 선택해야 저장할 수 있습니다.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-black text-[color:var(--spm-t2)]">반 / 기관</label>
            <input
              type="text"
              value={quickClassId}
              onChange={(e) => setQuickClassId(e.target.value)}
              placeholder="예: 토끼반, ○○초등학교 3학년"
              className="mt-1.5 h-11 w-full rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 text-sm font-semibold text-[color:var(--spm-t)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--spm-t3)]">비우면 &apos;수업&apos;으로 저장됩니다. 최근 사용한 반명이 있으면 자동으로 채워집니다.</p>
          </div>
          <div>
            <label className="block text-xs font-black text-[color:var(--spm-t2)]">
              오늘 관찰·지도 포인트 <span className="font-semibold text-[color:var(--spm-t3)]">(선택)</span>
            </label>
            <textarea
              value={quickMemo}
              onChange={(e) => setQuickMemo(e.target.value)}
              placeholder="예: 방향 전환은 잘 따라왔고, 대기 규칙 연습이 더 필요함"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 py-2.5 text-sm font-semibold text-[color:var(--spm-t)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--spm-t3)]">
              참여 태도, 움직임, 다음 수업에서 볼 점을 한 줄로 남겨 주세요. 이후 기록 보강·안내문에 이어집니다.
            </p>
          </div>
          <div>
            <label className="block text-xs font-black text-[color:var(--spm-t2)]">
              오늘 집중 관찰 <span className="font-semibold text-[color:var(--spm-t3)]">(선택, 1명)</span>
            </label>
            {rosterStudents.length > 0 ? (
              <select
                value={quickFocusStudentId}
                onChange={(e) => setQuickFocusStudentId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 text-sm font-semibold text-[color:var(--spm-t)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">나중에 보강해도 됩니다</option>
                {rosterStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}{student.group ? ` · ${student.group}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 py-2.5 text-[12px] font-semibold text-[color:var(--spm-t3)]">
                등록된 학생이 없습니다. 기록은 남기고, 학생은{' '}
                <Link href="/spokedu-master/students?add=1" className="font-black text-[var(--spm-acc)]">학생 관리</Link>
                에서 추가할 수 있습니다.
              </p>
            )}
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--spm-t3)]">
              오늘 의미 있게 본 아이 한 명만 남겨도 학생 이력에 쌓입니다.
            </p>
          </div>
          <div>
            <label className="block text-xs font-black text-[color:var(--spm-t2)]">
              안내문 초안 <span className="font-semibold text-[color:var(--spm-t3)]">(수정 가능)</span>
            </label>
            <textarea
              value={quickParentNote}
              onChange={(e) => setQuickParentNote(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl border border-[color:var(--spm-br2)] bg-[var(--spm-s2)] px-3 py-2.5 text-sm font-semibold leading-6 text-[color:var(--spm-t)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--spm-t3)]">
              필요 없으면 비워도 됩니다. 저장된 문구는 이 수업 기록에만 남고, 원본 수업 자료는 변경되지 않습니다.
            </p>
          </div>
          {quickSaved ? (
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                오늘 수업 기록이 쌓였습니다.
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-emerald-700/80">
                같은 기록에 출석·관찰을 더하거나, 안내문으로 이어갈 수 있습니다.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link href={`/spokedu-master/class-record?record=${quickSavedRecordId}&program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-[var(--spm-s1)] px-3 text-center text-xs font-black text-emerald-700">이 기록 보강</Link>
                <Link href={`/spokedu-master/report?record=${quickSavedRecordId}&program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-[var(--spm-s1)] px-3 text-center text-xs font-black text-emerald-700">안내문</Link>
              </div>
            </div>
          ) : (
            <>
              {quickSaveFeedback ? (
                <SaveErrorBanner
                  message={quickSaveFeedback.message}
                  onRetry={quickSaveFeedback.retryable ? handleQuickSave : undefined}
                  upgradeHref={quickSaveFeedback.upgradeHref}
                  upgradeLabel={quickSaveFeedback.upgradeLabel}
                  className="bg-red-50"
                />
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickModalOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] text-[13px] font-bold text-[color:var(--spm-t2)]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleQuickSave}
                  disabled={!canSaveQuickRecord || quickSaving}
                  className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-[10px] bg-[var(--spm-acc)] text-[13px] font-black text-white disabled:opacity-50"
                >
                  {quickSaving ? '저장 중…' : '기록 남기기'}
                </button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}
