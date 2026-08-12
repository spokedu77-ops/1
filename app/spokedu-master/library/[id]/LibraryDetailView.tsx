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

import { BottomSheet } from '../../components/ui/BottomSheet';
import { SaveErrorBanner } from '../../components/ui/SaveErrorBanner';

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
import { classRecordToCreateInput, toClassRecord, toStudentProfile } from '../../lib/operationalDataAdapter';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import { buildProgramResumeHref } from '../../lib/recentProgramActivity';
import {
  canAttemptOnlineSave,
  getOfflineSaveFeedback,
  resolveSaveActionFeedback,
  type SaveActionFeedback,
} from '../../lib/saveActionFeedback';
import {
  getSupportedOfficialSpomovePresets,
} from '../../lib/program-meta';
import { publicOfficialPresetSessionHref } from '../../spomove/officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../../spomove/spomovePresetDisplayModel';
import {
  QUICK_RECORD_DRAFT_KEY,
  clearOwnerSaveDraft,
  readOwnerSaveDraft,
  writeOwnerSaveDraft,
} from '../../lib/saveDraftStorage';
import {
  resolveTodayLessonNextAction,
  type TodayLessonNextActionRecommendation,
} from '../../lib/todayLessonNextAction';
import { useMasterAccessSnapshot } from '../../access/MasterAccessProvider';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore } from '../../store';
import type { ClassRecord, Program } from '../../types';
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

function buildDetailTodayLessonActionView(
  recommendation: TodayLessonNextActionRecommendation,
  program: Program,
) {
  const recordHref = `/spokedu-master/class-record?program=${encodeURIComponent(program.id)}`;
  const detailHref = `/spokedu-master/library/${encodeURIComponent(program.id)}`;

  if (recommendation.primary.kind === 'continue_record') {
    return {
      title: '작성 중인 수업 기록이 있습니다.',
      description: '오늘 수업과 연결된 기록 초안을 먼저 마무리하세요.',
      primary: {
        label: '기록 계속하기',
        href: recommendation.primary.targetId
          ? `/spokedu-master/class-record?record=${encodeURIComponent(recommendation.primary.targetId)}&program=${encodeURIComponent(program.id)}`
          : recordHref,
      },
      secondary: null,
    };
  }

  if (recommendation.primary.kind === 'create_record') {
    const spomove = recommendation.secondary.find((item) => item.kind === 'view_spomove');
    return {
      title: '오늘 수업 이어가기',
      description: '화면 활동을 실행했습니다. 아직 이 수업의 기록은 남지 않았습니다.',
      primary: { label: '수업 기록 남기기', href: recordHref },
      secondary: spomove?.kind === 'view_spomove' && spomove.presetId
        ? { label: 'SPOMOVE 다시 실행', href: buildProgramResumeHref(spomove.presetId, 'spomove_started') }
        : null,
    };
  }

  if (recommendation.primary.kind === 'view_record') {
    const report = recommendation.secondary.find((item) => item.kind === 'create_report');
    return {
      title: '오늘 수업 기록 완료',
      description: '저장된 기록을 확인하거나 필요한 경우 안내문으로 이어갈 수 있습니다.',
      primary: {
        label: '기록 보기',
        href: recommendation.primary.targetId
          ? `/spokedu-master/class-record?record=${encodeURIComponent(recommendation.primary.targetId)}&program=${encodeURIComponent(program.id)}`
          : recordHref,
      },
      secondary: report?.kind === 'create_report'
        ? { label: '안내문 만들기', href: `/spokedu-master/report?record=${encodeURIComponent(report.recordId)}&program=${encodeURIComponent(program.id)}` }
        : null,
    };
  }

  if (recommendation.primary.kind === 'select_lesson') {
    return {
      title: '오늘 사용할 수업을 정하세요.',
      description: '오늘 수업으로 지정하면 준비와 기록으로 바로 이어갈 수 있습니다.',
      primary: { label: '오늘 수업으로 지정', href: detailHref },
      secondary: null,
    };
  }

  return {
    title: '오늘 수업으로 지정됨',
    description: '준비물과 진행 순서를 확인하고 바로 사용할 수 있습니다.',
    primary: { label: '준비 확인', href: '#lesson-preparation' },
    secondary: null,
  };
}

function TodayLessonActionPanel({
  recommendation,
  program,
}: {
  recommendation: TodayLessonNextActionRecommendation;
  program: Program;
}) {
  const view = buildDetailTodayLessonActionView(recommendation, program);
  return (
    <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-[12px] font-black text-emerald-800">{view.title}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-emerald-900">{view.description}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href={view.primary.href} className="spm-btn-primary inline-flex h-10 items-center justify-center rounded-[9px] px-3 text-[12px] font-black focus-visible:outline-none">
          {view.primary.label}
        </a>
        {view.secondary ? (
          <Link href={view.secondary.href} className="inline-flex h-10 items-center justify-center rounded-[9px] border border-emerald-200 bg-white px-3 text-[12px] font-black text-emerald-800">
            {view.secondary.label}
          </Link>
        ) : null}
      </div>
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
  const clearTodayLesson = useMasterStore((state) => state.clearTodayLesson);
  const todayLesson = useMasterStore((state) =>
    ownerId ? state.getTodayLesson(ownerId) : null,
  );
  const recentProgramActivities = useMasterStore((state) => state.recentProgramActivities);
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
  const [planCopied, setPlanCopied] = useState(false);
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
  const isTodayLesson = Boolean(program && todayLesson?.programId === program.id);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);
  const quickRecordDraft = readOwnerSaveDraft<QuickRecordDraft>(QUICK_RECORD_DRAFT_KEY, ownerId);
  const recentSpomoveForProgram = useMemo(
    () => recentProgramActivities
      .filter((activity) =>
        activity.ownerId === ownerId &&
        activity.action === 'spomove_started' &&
        activity.programId === id
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null,
    [id, ownerId, recentProgramActivities],
  );
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
    writeOwnerSaveDraft(QUICK_RECORD_DRAFT_KEY, ownerId, {
      programId: program.id,
      date: quickDate,
      classId: quickClassId,
      memo: quickMemo,
      parentNote: quickParentNote,
      focusStudentId: quickFocusStudentId,
    } satisfies QuickRecordDraft);
  }, [ownerId, program, quickClassId, quickDate, quickFocusStudentId, quickMemo, quickModalOpen, quickParentNote, quickSaved]);

  const defaultQuickClassId = useMemo(
    () => resolveQuickRecordClassId(classRecords, operationalData.students.map((student) => student.group)),
    [classRecords, operationalData.students],
  );

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
  const todayLessonRecommendation = resolveTodayLessonNextAction({
    todayLesson: isTodayLesson && program ? { programId: program.id, title: program.title } : null,
    recordDraft: quickRecordDraft?.programId === program.id
      ? { programId: quickRecordDraft.programId }
      : null,
    savedRecord: sortedUsageRecords[0]
      ? { id: sortedUsageRecords[0].id, programId: sortedUsageRecords[0].programId }
      : null,
    recentSpomove: recentSpomoveForProgram
      ? { presetId: recentSpomoveForProgram.programId, programId: recentSpomoveForProgram.programId }
      : null,
  });

  const openQuickModal = () => {
    const draft = readOwnerSaveDraft<QuickRecordDraft>(QUICK_RECORD_DRAFT_KEY, ownerId);
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
      clearOwnerSaveDraft(QUICK_RECORD_DRAFT_KEY, ownerId);
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

      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:space-y-8 lg:px-8">
        <DetailLessonGuide
          model={model}
          headerStatus={usageCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              <Check className="h-3 w-3" />
              {usageCount}회 사용{latestUsageDate ? ` · 최근 ${latestUsageDate}` : ''}
            </span>
          ) : undefined}
          actions={(
            <div className="space-y-3">
              {isTodayLesson ? <TodayLessonActionPanel recommendation={todayLessonRecommendation} program={program} /> : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href={`/spokedu-master/class-record?program=${program.id}`} className="spm-btn-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[9px] px-5 text-[13px] font-black focus-visible:outline-none sm:min-w-[190px]">
                  <Clipboard className="h-4 w-4" /> 수업 기록 시작
                </Link>
                <button type="button" disabled={!ownerId} onClick={() => { if (!ownerId) return; if (isTodayLesson) clearTodayLesson(ownerId); else setTodayLesson(ownerId, { id: program.id, title: program.title }); }} className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[9px] border border-slate-300 bg-white px-4 text-[13px] font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-50" aria-pressed={isTodayLesson}>
                  {isTodayLesson ? '오늘 수업 해제' : '오늘 수업으로 지정'}
                </button>
                <button type="button" onClick={openQuickModal} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border border-emerald-200 bg-emerald-50/70 px-3.5 text-[12px] font-black text-emerald-800"><Check className="h-3.5 w-3.5" /> 빠른 기록</button>
                <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-[12px] font-black text-[color:var(--spm-t2)]"><FileText className="h-3.5 w-3.5" /> 안내문</Link>
                <button type="button" onClick={() => void copyLessonPlan()} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-[12px] font-black text-[color:var(--spm-t2)]"><Copy className="h-3.5 w-3.5" /> {planCopied ? '복사 완료' : '지도안 복사'}</button>
              </div>
            </div>
          )}
          video={{ embedUrl: videoEmbedUrl, directUrl: directVideoUrl, externalUrl: externalVideoUrl, sourceUrl: videoUrl, autoplay: shouldAutoplayVideo, onPlaybackStarted: recordVideoStarted }}
        />

        <RelatedSpomoveSection program={program} />

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
              필요 없으면 비워도 됩니다. 저장된 문구는 이 수업 기록에만 남고, 원본 수업은 변경되지 않습니다.
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
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Link href={`/spokedu-master/class-record?record=${quickSavedRecordId}&program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-[var(--spm-s1)] px-3 text-center text-xs font-black text-emerald-700">이 기록 보강</Link>
                <Link href={`/spokedu-master/report?record=${quickSavedRecordId}&program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-[var(--spm-s1)] px-3 text-center text-xs font-black text-emerald-700">안내문</Link>
                <Link href="/spokedu-master/dashboard" data-loop-action="home" onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-[var(--spm-s1)] px-3 text-center text-xs font-black text-emerald-700">홈으로</Link>
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
                  className="spm-btn-primary inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-[10px] text-[13px] font-black focus-visible:outline-none disabled:opacity-50"
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
