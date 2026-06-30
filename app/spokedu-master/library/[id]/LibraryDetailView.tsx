'use client';

import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  ExternalLink,
  FileText,
  MonitorPlay,
  Play,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BottomSheet } from '../../components/ui/BottomSheet';

import {
  LessonBulletList,
  LessonChecklistCard,
  LessonCoachScript,
  LessonFullSection,
  LessonMetaGrid,
  LessonNumberedList,
  LessonTitle,
  LessonVariationText,
} from '../../components/lesson/LessonPanels';
import { TrackedVideoIframe } from '../../components/lesson/TrackedVideoIframe';
import { buildLessonDisplayModel } from '../../lib/lessonDisplayModel';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
} from '../../lib/program-media';
import { getSpomoveSessionHref, getSupportedOfficialSpomovePresets } from '../../lib/program-meta';
import { classRecordToCreateInput, toClassRecord } from '../../lib/operationalDataAdapter';
import { getFavoritesOwnerId } from '../../lib/favoriteLib';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useMasterStore } from '../../store';
import type { ClassRecord } from '../../types';
import { getLibraryReturnHref } from '../libraryNavigation';

const THUMBNAIL_FRAME = 'relative aspect-square w-full max-w-[1250px] overflow-hidden';
const RECORD_SAVE_ERROR_MESSAGE = '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500">
      <FileText className="h-7 w-7" />
    </div>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const profile = useMasterStore((state) => state.profile);
  const ownerId = getFavoritesOwnerId(profile);
  const storedFavoriteIds = useMasterStore((state) =>
    ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined,
  );
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const operationalData = useOperationalData();
  const classRecords = operationalData.classRecords.map(toClassRecord);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const searchParams = useSearchParams();
  const openedProgramRef = useRef<string | null>(null);
  const videoReportedRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickDate, setQuickDate] = useState('');
  const [quickClassId, setQuickClassId] = useState('');
  const [quickMemo, setQuickMemo] = useState('');
  const [quickParentNote, setQuickParentNote] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSavedRecordId, setQuickSavedRecordId] = useState<string | null>(null);
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);

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

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f7fb] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-slate-950">수업 자료를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 수업을 선택해 주세요.</p>
        <Link href={libraryReturnHref} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  const model = buildLessonDisplayModel(program);
  const title = model.title;
  const parentCopy = model.parentNote;
  const favorite = Boolean(storedFavoriteIds) && isFavoriteProgram(ownerId, program.id);
  const usageCount = usageRecords.length;
  const latestUsageDate = usageRecords.length > 0
    ? new Date([...usageRecords].sort((a, b) => b.date.localeCompare(a.date))[0].date)
        .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : null;

  const openQuickModal = () => {
    setQuickDate(new Date().toISOString().slice(0, 10));
    setQuickClassId('');
    setQuickMemo('');
    setQuickParentNote(model.parentNote);
    setQuickSaved(false);
    setQuickSavedRecordId(null);
    setQuickSaving(false);
    setQuickSaveError(null);
    setQuickModalOpen(true);
  };

  const canSaveQuickRecord = Boolean(quickDate.trim());

  const handleQuickSave = () => {
    if (!canSaveQuickRecord || quickSaving) return;
    const record: ClassRecord = {
      id: Date.now().toString(),
      lessonTitle: title,
      classId: quickClassId.trim() || '수업',
      programId: program.id,
      programTitle: program.title,
      date: new Date(quickDate).toISOString(),
      present: 0,
      absent: 0,
      focusCount: 0,
      skillCount: 0,
      kakaoSent: false,
      students: [],
      memo: quickMemo.trim() || undefined,
      parentNoteSnapshot: quickParentNote.trim() || undefined,
      recordType: 'quick',
    };
    setQuickSaving(true);
    setQuickSaveError(null);
    setQuickSaved(false);
    setQuickSavedRecordId(null);
    void operationalData.saveClassRecord(classRecordToCreateInput(record, operationalData.students)).then((saved) => {
      setQuickSavedRecordId(saved.id);
      setQuickSaved(true);
    }).catch(() => {
      setQuickSaveError(RECORD_SAVE_ERROR_MESSAGE);
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
  const relatedSpomovePresets = getSupportedOfficialSpomovePresets(program);
  const primarySpomovePreset = relatedSpomovePresets[0] ?? null;
  const classToolsHref = `/spokedu-master/class-tools?returnTo=${encodeURIComponent(`/spokedu-master/library/${program.id}`)}`;

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-dvh bg-[#f6f7f9] pb-44 text-slate-950 lg:pb-14">
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href={libraryReturnHref} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-black text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4" />
          라이브러리로
        </Link>
        <p className="min-w-0 truncate text-right text-[14px] font-black text-slate-950 sm:text-center">
          {title}
        </p>
      </header>

      <div className="mx-auto w-full max-w-[1360px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[14px] border border-slate-200 bg-white p-4 text-[12px] font-bold text-slate-600">
          <p className="text-[13px] font-black text-slate-950">전체 수업 자료 구성</p>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {['1. 수업 개요', '2. 준비물·공간', '3. 수업 목표', '4. 활동 진행 순서', '5. 규칙과 지도 포인트', '6. 난이도 조절·변형', '7. 안전 유의사항', '8. 실행 행동'].map((item) => (
              <li key={item} className="break-words rounded-lg bg-slate-50 px-3 py-2">{item}</li>
            ))}
          </ol>
        </section>
        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6">
          <LessonTitle
            title={title}
            badges={usageCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                <Check className="h-3 w-3" />
                {usageCount}회 사용{latestUsageDate ? ` · 최근 ${latestUsageDate}` : ''}
              </span>
            ) : undefined}
          />
          <div className="mt-3">
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
        </section>

        {setupImage || hasPreActivityChecklist ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
            {setupImage ? (
              <LessonFullSection title="초기 교구 세팅" className="h-full">
                <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                  <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                    <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-square lg:aspect-[4/5]">
                      <Image src={setupImage} alt={`${title} 세팅 방법`} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" unoptimized />
                    </div>
                  </div>
                </div>
              </LessonFullSection>
            ) : null}

            {hasPreActivityChecklist ? (
              <LessonFullSection title="사전 체크리스트" className="h-full">
                <div className="flex flex-col gap-3">
                  {model.equipment.length > 0 ? (
                    <LessonChecklistCard label="준비물" accent="emerald">
                      <LessonBulletList items={model.equipment} compact />
                    </LessonChecklistCard>
                  ) : null}
                  {model.setupNotes.length > 0 ? (
                    <LessonChecklistCard label="세팅">
                      <LessonBulletList items={model.setupNotes} compact />
                    </LessonChecklistCard>
                  ) : null}
                  {model.coachScript ? (
                    <LessonChecklistCard label="수업 스크립트" accent="indigo">
                      <LessonCoachScript text={model.coachScript} />
                    </LessonChecklistCard>
                  ) : null}
                  {model.briefingNotes.length > 0 ? (
                    <LessonChecklistCard label="사전 교육">
                      <LessonBulletList items={model.briefingNotes} compact />
                    </LessonChecklistCard>
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
                    />
                  ) : directVideoUrl ? (
                    <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay={shouldAutoplayVideo} muted onPlay={recordVideoStarted} />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center text-white">
                      <div>
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white ring-4 ring-white/70">
                          <Play className="h-5 w-5 fill-current" />
                        </span>
                        <p className="mt-4 text-base font-black">참고 영상 링크</p>
                        <a href={externalVideoUrl} target="_blank" rel="noreferrer" onClick={recordVideoStarted} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950">
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
            <button type="button" onClick={copyParentNote} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '학부모 문구 복사'}
            </button>
          </div>
        ) : null}

        {(relatedSpomovePresets.length > 0 || galleryImages.length > 0) ? (
          <details className="rounded-[14px] border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-black text-slate-700">추가 자료 (SPOMOVE · 수업 장면)</summary>
            <div className="mt-4 space-y-4">
              {relatedSpomovePresets.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {relatedSpomovePresets.map((preset) => (
                    <Link
                      key={preset.id}
                      href={getSpomoveSessionHref(program, preset)}
                      className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                        <MonitorPlay className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black text-slate-950">{preset.title}</strong>
                        <span className="mt-1 block text-xs font-semibold text-indigo-700">TV·빔 실행</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {galleryImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {galleryImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
                      <div className={THUMBNAIL_FRAME}>
                        <Image src={imageUrl} alt={`${title} 수업 장면 ${index + 1}`} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" unoptimized />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">Preparation</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">수업 준비 보조</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href={classToolsHref} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-black text-indigo-700">
              <Wrench className="h-4 w-4" />
              수업 도구
            </Link>
            <button
              type="button"
              onClick={() => toggleFavoriteProgram(ownerId, program.id)}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-black ${
                favorite
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : ownerId
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
              aria-pressed={favorite}
              aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
              disabled={!ownerId}
            >
              <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              즐겨찾기
            </button>
          </div>
        </section>

        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-600">After class</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">수업 후 정리</h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={openQuickModal} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-700">
              <Check className="h-4 w-4" />
              빠른 수업 기록
            </button>
            <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-black text-indigo-700">
              <FileText className="h-4 w-4" />
              안내문
            </Link>
            {usageCount > 0 ? (
              <Link href="/spokedu-master/class-record" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700">
                <Clipboard className="h-4 w-4" />
                기존 기록 보기
              </Link>
            ) : null}
          </div>
        </section>

        <div
          className={`sticky bottom-[78px] z-40 grid grid-cols-1 gap-1.5 rounded-[14px] border border-slate-200 bg-white/95 p-1.5 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl ${primarySpomovePreset ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} lg:bottom-0`}
          style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        >
          <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-2 text-[12px] font-black text-white">
            <MonitorPlay className="h-4 w-4" />
            수업 실행
          </Link>
          {primarySpomovePreset ? (
            <Link href={getSpomoveSessionHref(program, primarySpomovePreset)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2 text-[12px] font-black text-indigo-700">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 실행
            </Link>
          ) : null}
        </div>
      </div>

      <BottomSheet open={quickModalOpen} title="수업 기록" onClose={() => setQuickModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700">날짜 <span className="font-semibold text-red-400">*</span></label>
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className={`mt-1.5 h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 ${!quickDate ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'}`}
            />
            {!quickDate ? (
              <p className="mt-1 text-[11px] font-semibold text-red-400">날짜를 선택해야 저장할 수 있습니다.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">반/기관명</label>
            <input
              type="text"
              value={quickClassId}
              onChange={(e) => setQuickClassId(e.target.value)}
              placeholder="예: 토끼반, ○○초등학교"
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">메모 <span className="font-semibold text-slate-400">(선택)</span></label>
            <textarea
              value={quickMemo}
              onChange={(e) => setQuickMemo(e.target.value)}
              placeholder="수업 중 특이사항, 다음 수업 준비 메모"
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">
              안내문 <span className="font-semibold text-slate-400">(수정 가능)</span>
            </label>
            <textarea
              value={quickParentNote}
              onChange={(e) => setQuickParentNote(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-400">필요 없으면 비워도 됩니다. 저장된 문구는 수업 기록에만 남고, 원본 수업 자료는 변경되지 않습니다.</p>
          </div>
          {quickSaved ? (
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                사용 기록이 저장되었습니다.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Link href="/spokedu-master/class-record" onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-center text-xs font-black text-emerald-700">수업 기록 보기</Link>
                <Link href={`/spokedu-master/report?record=${quickSavedRecordId}&program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-center text-xs font-black text-emerald-700">안내문</Link>
                <Link href={`/spokedu-master/class-record?program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 text-center text-xs font-black text-emerald-700">학생 기록 작성</Link>
              </div>
            </div>
          ) : (
            <>
              {quickSaveError ? (
                <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{quickSaveError}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickModalOpen(false)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleQuickSave}
                  disabled={!canSaveQuickRecord || quickSaving}
                  className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-50"
                >
                  사용 기록 저장
                </button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}
