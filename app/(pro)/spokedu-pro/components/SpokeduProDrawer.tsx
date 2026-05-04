'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useEffect, useRef } from 'react';
import { X, Edit2, FileText, ClipboardList, Package, BookOpen, Lightbulb, Gamepad2 } from 'lucide-react';
import type { ProgramDetail } from '../types';
import { FUNCTION_TYPES, MAIN_THEMES, extractEquipmentDisplayTags } from '@/app/lib/spokedu-pro/programClassification';
import { getYouTubeId } from '@/app/(pro)/spokedu-pro/utils/youtube';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';
import type { ProgramLessonDetail, ProgramLessonDetailLite } from '@/app/lib/spokedu-pro/programLessonDetail';

function stringifyJsonArray(arr: unknown[]): string {
  try {
    return JSON.stringify(arr, null, 2);
  } catch {
    return '[]';
  }
}

function parseJsonArrayField(raw: string, fallback: unknown[]): unknown[] {
  const t = raw.trim();
  if (!t) return fallback;
  try {
    const v = JSON.parse(t) as unknown;
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function formatArrayForDisplay(items: unknown[]): string {
  if (!items.length) return '';
  return items
    .map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`;
      try {
        return `${i + 1}. ${JSON.stringify(item)}`;
      } catch {
        return `${i + 1}.`;
      }
    })
    .join('\n');
}

export default function SpokeduProDrawer({
  open,
  programId,
  programDetail,
  isEditMode,
  onSaveProgramDetail,
  onClose,
  onFabClick,
  detailKind = 'program',
  onLaunchMemoryGame,
  /** 스크린플레이: 라이브러리 카드와 동일한 인지 태그(영역·과제·레벨). 없으면 기존 태그 로직 사용 */
  screenplayTags,
  lessonDetail,
  onSaveLessonDetail,
}: {
  open: boolean;
  programId: number | null;
  programDetail?: ProgramDetail | null;
  role?: string;
  themeKey?: string;
  isEditMode?: boolean;
  onSaveProgramDetail?: (
    programId: number,
    detail: ProgramDetail,
    options?: { screenplay?: boolean }
  ) => Promise<void>;
  onClose: () => void;
  onFabClick?: () => void;
  /** 스크린플레이(스포무브): 센터 설명 모달과 별도로 게임 실행 */
  detailKind?: 'program' | 'screenplay';
  onLaunchMemoryGame?: () => void;
  screenplayTags?: string[];
  /** curriculum.id 기준 program_lesson_detail (펑셔널 프로그램만). 목록 스냅샷은 Lite일 수 있음 */
  lessonDetail?: ProgramLessonDetail | ProgramLessonDetailLite | null;
  onSaveLessonDetail?: (detail: ProgramLessonDetail) => Promise<void>;
}) {
  const tr = useTranslator();
  const checklistSectionRef = useRef<HTMLElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lessonEditOpen, setLessonEditOpen] = useState(false);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    isFeaturedLesson: false,
    summary: '',
    recommendedAge: '',
    recommendedPlayers: '',
    duration: '',
    space: '',
    objective: '',
    developmentFocus: '',
    coachScript: '',
    parentNote: '',
    stepsJson: '[]',
    fieldTipsJson: '[]',
    variationsJson: '[]',
    safetyNotesJson: '[]',
    relatedProgramIdsJson: '[]',
    relatedSpomoveIdsJson: '[]',
    packageKeysJson: '[]',
  });
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    videoUrl: '',
    functionTypes: [] as string[],
    functionType: '',
    mainTheme: '',
    checklist: '',
    equipment: '',
    activityMethod: '',
    activityTip: '',
  });

  const d = programDetail;
  useEffect(() => {
    if (!open || programId == null) return;
    setEditForm({
      title: d?.title ?? `프로그램 #${programId}`,
      subtitle: d?.subtitle ?? '',
      videoUrl: d?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(d?.functionTypes) ? d?.functionTypes : d?.functionType ? [d.functionType] : []) ?? [],
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
      checklist: d?.checklist ?? '',
      equipment: d?.equipment ?? '',
      activityMethod: d?.activityMethod ?? '',
      activityTip: d?.activityTip ?? '',
    });
    setIsEditModalOpen(false);
  }, [
    open,
    programId,
    d?.title,
    d?.subtitle,
    d?.videoUrl,
    d?.functionType,
    d?.mainTheme,
    d?.checklist,
    d?.equipment,
    d?.activityMethod,
    d?.activityTip,
  ]);

  const ld = lessonDetail && detailKind === 'program' ? lessonDetail : null;

  const openLessonEditModal = () => {
    if (programId == null) return;
    const base = ld;
    setLessonForm({
      isFeaturedLesson: base?.isFeaturedLesson ?? false,
      summary: base?.summary ?? '',
      recommendedAge: base?.recommendedAge ?? '',
      recommendedPlayers: base?.recommendedPlayers ?? '',
      duration: base?.duration ?? '',
      space: base?.space ?? '',
      objective: base?.objective ?? '',
      developmentFocus: base?.developmentFocus ?? '',
      coachScript: base?.coachScript ?? '',
      parentNote: base?.parentNote ?? '',
      stepsJson: stringifyJsonArray(base?.steps ?? []),
      fieldTipsJson: stringifyJsonArray(base?.fieldTips ?? []),
      variationsJson: stringifyJsonArray(base?.variations ?? []),
      safetyNotesJson: stringifyJsonArray(base?.safetyNotes ?? []),
      relatedProgramIdsJson: stringifyJsonArray(base?.relatedProgramIds ?? []),
      relatedSpomoveIdsJson: stringifyJsonArray(base?.relatedSpomoveIds ?? []),
      packageKeysJson: stringifyJsonArray(base?.packageKeys ?? []),
    });
    setLessonEditOpen(true);
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (programId == null || !onSaveLessonDetail) return;
    setLessonSaving(true);
    try {
      const next: ProgramLessonDetail = {
        curriculumId: programId,
        status: lessonDetail?.status === 'reviewed' ? 'reviewed' : 'draft',
        isFeaturedLesson: lessonForm.isFeaturedLesson,
        summary: lessonForm.summary.trim() || null,
        recommendedAge: lessonForm.recommendedAge.trim() || null,
        recommendedPlayers: lessonForm.recommendedPlayers.trim() || null,
        duration: lessonForm.duration.trim() || null,
        space: lessonForm.space.trim() || null,
        objective: lessonForm.objective.trim() || null,
        developmentFocus: lessonForm.developmentFocus.trim() || null,
        coachScript: lessonForm.coachScript.trim() || null,
        parentNote: lessonForm.parentNote.trim() || null,
        steps: parseJsonArrayField(lessonForm.stepsJson, []),
        fieldTips: parseJsonArrayField(lessonForm.fieldTipsJson, []),
        variations: parseJsonArrayField(lessonForm.variationsJson, []),
        safetyNotes: parseJsonArrayField(lessonForm.safetyNotesJson, []),
        relatedProgramIds: parseJsonArrayField(lessonForm.relatedProgramIdsJson, []),
        relatedSpomoveIds: parseJsonArrayField(lessonForm.relatedSpomoveIdsJson, []),
        packageKeys: parseJsonArrayField(lessonForm.packageKeysJson, []),
      };
      await onSaveLessonDetail(next);
      setLessonEditOpen(false);
    } finally {
      setLessonSaving(false);
    }
  };

  if (!open) return null;

  const title = stripMonthWeekPrefix(d?.title ?? editForm.title ?? `프로그램 #${programId ?? ''}`);
  const subtitle = d?.subtitle ?? editForm.subtitle ?? '';
  const videoUrl = d?.videoUrl ?? editForm.videoUrl ?? '';
  const functionTypes = (d?.functionTypes && d.functionTypes.length > 0)
    ? d.functionTypes
    : (editForm.functionTypes.length > 0 ? editForm.functionTypes : (d?.functionType ? [d.functionType] : (editForm.functionType ? [editForm.functionType] : [])));
  const functionType = d?.functionType ?? editForm.functionType; // legacy fallback
  const mainTheme = d?.mainTheme ?? editForm.mainTheme;
  const checklist = d?.checklist ?? editForm.checklist;
  const equipment = d?.equipment ?? editForm.equipment;
  const activityMethod = d?.activityMethod ?? editForm.activityMethod;
  const activityTip = d?.activityTip ?? editForm.activityTip;
  const videoId = getYouTubeId(videoUrl);

  const tags =
    detailKind === 'program' ? extractEquipmentDisplayTags(equipment) : [...functionTypes, mainTheme].filter(Boolean).slice(0, 3);
  const tagChips =
    detailKind === 'screenplay' && Array.isArray(screenplayTags) && screenplayTags.length > 0
      ? screenplayTags.slice(0, 3)
      : tags;

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm({
      title: d?.title ?? '',
      subtitle: d?.subtitle ?? '',
      videoUrl: d?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(d?.functionTypes) ? d?.functionTypes : d?.functionType ? [d.functionType] : []) ?? [],
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
      checklist: d?.checklist ?? '',
      equipment: d?.equipment ?? '',
      activityMethod: d?.activityMethod ?? '',
      activityTip: d?.activityTip ?? '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (programId == null || !onSaveProgramDetail) return;
    setSaving(true);
    try {
      await onSaveProgramDetail(
        programId,
        {
          title: editForm.title.trim() || undefined,
          subtitle: editForm.subtitle.trim() || undefined,
          videoUrl: editForm.videoUrl.trim() || undefined,
          functionTypes: editForm.functionTypes.length > 0 ? editForm.functionTypes : undefined,
          functionType: editForm.functionType.trim() || undefined,
          mainTheme: editForm.mainTheme.trim() || undefined,
          checklist: editForm.checklist.trim() || undefined,
          equipment: editForm.equipment.trim() || undefined,
          activityMethod: editForm.activityMethod.trim() || undefined,
          activityTip: editForm.activityTip.trim() || undefined,
        },
        detailKind === 'screenplay' ? { screenplay: true } : undefined
      );
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      title: d?.title ?? title,
      subtitle: d?.subtitle ?? subtitle,
      videoUrl: d?.videoUrl ?? videoUrl,
      functionTypes: Array.isArray(d?.functionTypes)
        ? d?.functionTypes ?? []
        : (d?.functionType ? [d.functionType] : (functionTypes ?? [])),
      functionType: d?.functionType ?? functionType ?? '',
      mainTheme: d?.mainTheme ?? mainTheme ?? '',
      checklist: d?.checklist ?? checklist ?? '',
      equipment: d?.equipment ?? equipment ?? '',
      activityMethod: d?.activityMethod ?? activityMethod ?? '',
      activityTip: d?.activityTip ?? activityTip ?? '',
    });
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] bg-slate-900 border border-slate-700/80">
          {/* 비디오 */}
          <div className="relative w-full aspect-video bg-slate-950">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="encrypted-media; fullscreen"
                allowFullScreen
                title={tr('프로그램 영상')}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                  <span className="text-3xl">▶</span>
                </div>
                <p className="text-sm font-semibold">{tr('영상이 등록되지 않았습니다')}</p>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="mt-4 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {tr('상세 수정')}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label={tr('닫기')}
            >
              <X size={20} />
            </button>
            {isEditMode && videoId && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute top-4 right-16 px-4 py-2 rounded-xl bg-black/50 hover:bg-black/70 text-white text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Edit2 size={16} /> {tr('수정')}
              </button>
            )}
          </div>

          {/* 스크롤 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{title}</h2>
              {subtitle ? (
                isEditMode ? (
                  <p className="text-slate-400 text-sm font-medium mt-2 mb-2 whitespace-pre-wrap">{subtitle}</p>
                ) : subtitle.trim().length > 160 ? (
                  <details className="mt-2 rounded-lg border border-slate-700/50 bg-slate-950/30">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                      {tr('부가 설명 보기')}
                    </summary>
                    <div className="border-t border-slate-800/80 px-3 py-3">
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{subtitle}</p>
                    </div>
                  </details>
                ) : (
                  <p className="text-slate-400 text-sm font-normal mt-2 mb-1 leading-relaxed whitespace-pre-wrap">
                    {subtitle}
                  </p>
                )
              ) : null}
              {tagChips.length > 0 && detailKind === 'program' && isEditMode ? (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('핵심 정보')}</p>
              ) : null}
              {tagChips.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${detailKind === 'program' ? 'mt-1' : 'mt-2'}`}>
                  {(isEditMode ? tagChips : tagChips.slice(0, 2)).map((tagVal, i) => (
                    <span
                      key={`${tagVal}-${i}`}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        detailKind === 'screenplay'
                          ? 'bg-orange-950/35 text-orange-100/90 border-orange-400/20'
                          : 'bg-slate-900/35 text-slate-200/80 border-white/10'
                      }`}
                    >
                      {tr(String(tagVal))}
                    </span>
                  ))}
                </div>
              )}
              {detailKind === 'screenplay' &&
                (isEditMode ? (
                  <div className="mt-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-950/40 via-slate-900/30 to-slate-950/40 p-4 md:p-5 space-y-3">
                    <div className="flex items-center gap-2 text-orange-200">
                      <Gamepad2 className="w-5 h-5 shrink-0" aria-hidden />
                      <span className="text-xs font-black uppercase tracking-wider">
                        {tr('SPOMOVE 반응훈련, 이렇게 쓰면 돼요')}
                      </span>
                    </div>
                    <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300 [&>li]:pl-1">
                      <li>
                        {tr(
                          '아래 「SPOMOVE 실행」으로 전체 화면을 띄우면, 과제·신호·난이도는 화면 안내를 따르면 됩니다.'
                        )}
                      </li>
                      <li>
                        {tr('위 제목·부제는 수업 도입 멘트·학부모 안내용으로 활용해 보세요.')}
                      </li>
                      <li>
                        {tr('끝나면 우측 상단 X로 돌아오면 됩니다. (전체 화면은 ESC로도 닫을 수 있어요)')}
                      </li>
                    </ol>
                  </div>
                ) : (
                  <details className="mt-3 rounded-xl border border-orange-500/25 bg-orange-950/20">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-left text-sm font-medium text-orange-100 hover:bg-orange-950/35 [&::-webkit-details-marker]:hidden flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden />
                      {tr('SPOMOVE 활용 안내')}
                    </summary>
                    <ol className="list-decimal space-y-2.5 border-t border-orange-500/20 px-4 py-3 pl-7 text-sm leading-relaxed text-slate-200 [&>li]:pl-1">
                      <li>
                        {tr(
                          '아래 「SPOMOVE 실행」으로 전체 화면을 띄우면, 과제·신호·난이도는 화면 안내를 따르면 됩니다.'
                        )}
                      </li>
                      <li>{tr('위 제목·부제는 수업 도입 멘트·학부모 안내용으로 활용해 보세요.')}</li>
                      <li>{tr('끝나면 우측 상단 X로 돌아오면 됩니다. (전체 화면은 ESC로도 닫을 수 있어요)')}</li>
                    </ol>
                  </details>
                ))}
              {/* 수업에서 바로 쓰는 액션 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {detailKind === 'screenplay' && onLaunchMemoryGame && (
                  <button
                    type="button"
                    onClick={onLaunchMemoryGame}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    {tr('SPOMOVE 실행')}
                  </button>
                )}
              </div>
            </div>

            {isEditMode ? (
              <>
                {activityMethod && (
                  <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                    <div className="flex items-center gap-2 mb-3 text-violet-400">
                      <BookOpen size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">{tr('진행 방법')}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{activityMethod}</p>
                  </section>
                )}
                {activityTip && (
                  <section className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3 text-amber-300">
                      <Lightbulb size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">{tr('현장 팁')}</span>
                    </div>
                    <p className="text-amber-100/90 text-sm leading-relaxed whitespace-pre-wrap">{activityTip}</p>
                  </section>
                )}
                {checklist && (
                  <section ref={checklistSectionRef} className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                    <div className="flex items-center gap-2 mb-3 text-amber-400">
                      <ClipboardList size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">{tr('사전 체크리스트')}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{checklist}</p>
                  </section>
                )}
                {equipment && (
                  <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                    <div className="flex items-center gap-2 mb-3 text-blue-400">
                      <Package size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">{tr('준비물')}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{equipment}</p>
                  </section>
                )}
              </>
            ) : (
              <>
                {equipment && (
                  <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-2.5 text-blue-400">
                      <Package size={18} />
                      <span className="text-xs font-bold tracking-wide text-blue-300/95">{tr('준비물')}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{equipment}</p>
                  </section>
                )}
                {activityMethod && (
                  <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-2.5 text-violet-400">
                      <BookOpen size={18} />
                      <span className="text-xs font-bold tracking-wide text-violet-300/95">{tr('진행 방법')}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{activityMethod}</p>
                  </section>
                )}
                {activityTip && (
                  <section className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/20 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-2.5 text-amber-300">
                      <Lightbulb size={18} />
                      <span className="text-xs font-bold tracking-wide text-amber-200/95">{tr('현장 팁')}</span>
                    </div>
                    <p className="text-amber-100/95 text-sm leading-relaxed whitespace-pre-wrap">{activityTip}</p>
                  </section>
                )}
                {checklist ? (
                  <details className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
                    <summary className="cursor-pointer list-none px-4 py-3 text-left text-xs font-black tracking-wide text-slate-200 hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-amber-400/95">
                        <ClipboardList size={16} />
                        {tr('추가 활용 팁')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 normal-case">{tr('펼치기')}</span>
                    </summary>
                    <div className="border-t border-slate-700/60 px-4 py-3">
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{checklist}</p>
                    </div>
                  </details>
                ) : null}
              </>
            )}

            {ld && (
              <details
                className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-0 overflow-hidden"
                open={Boolean(isEditMode)}
              >
                <summary className="cursor-pointer list-none px-4 py-3 md:px-5 md:py-3.5 text-left text-xs font-black tracking-wide text-slate-200 hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
                  <span>{isEditMode ? tr('수업이 더 잘 굴러가는 팁') : tr('추가 활용 팁')}</span>
                  <span className="text-[10px] font-bold text-slate-500 normal-case">{tr('펼치기')}</span>
                </summary>
                <div className="border-t border-slate-700/60 px-4 py-4 md:px-5 md:pb-5 space-y-5 bg-gradient-to-b from-slate-900/50 to-slate-950/60">
                <div className="flex flex-wrap items-center gap-2">
                  {isEditMode && ld.isFeaturedLesson ? (
                    <span className="rounded-full bg-cyan-500/20 text-cyan-100 text-[10px] font-black px-2 py-0.5 border border-cyan-500/25">
                      {tr('대표')}
                    </span>
                  ) : null}
                </div>
                {ld.summary ? (
                  isEditMode ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('요약')}</h3>
                      <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{ld.summary}</p>
                    </section>
                  ) : (
                    <details className="rounded-xl border border-slate-700/50 bg-slate-950/40">
                      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-200 [&::-webkit-details-marker]:hidden">
                        {tr('한눈 요약')}
                      </summary>
                      <div className="border-t border-slate-800/80 px-3 py-2.5">
                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{ld.summary}</p>
                      </div>
                    </details>
                  )
                ) : null}
                {(ld.recommendedAge || ld.recommendedPlayers || ld.duration || ld.space) ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('기본 정보')}</h3>
                    <ul className="text-sm text-slate-200 space-y-1 list-disc list-inside">
                      {ld.recommendedAge ? <li>{tr('추천 연령')}: {ld.recommendedAge}</li> : null}
                      {ld.recommendedPlayers ? <li>{tr('권장 인원')}: {ld.recommendedPlayers}</li> : null}
                      {ld.duration ? <li>{tr('수업 시간')}: {ld.duration}</li> : null}
                      {ld.space ? <li>{tr('공간')}: {ld.space}</li> : null}
                    </ul>
                  </section>
                ) : null}
                {ld.objective ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('수업 목표')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{ld.objective}</p>
                  </section>
                ) : null}
                {ld.developmentFocus ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('발달 요소')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{ld.developmentFocus}</p>
                  </section>
                ) : null}
                {ld.steps.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('진행 방법')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{formatArrayForDisplay(ld.steps)}</p>
                  </section>
                ) : null}
                {ld.coachScript ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('강사 멘트')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{ld.coachScript}</p>
                  </section>
                ) : null}
                {ld.fieldTips.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('현장 팁')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{formatArrayForDisplay(ld.fieldTips)}</p>
                  </section>
                ) : null}
                {ld.variations.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('변형 방법')}</h3>
                    <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{formatArrayForDisplay(ld.variations)}</p>
                  </section>
                ) : null}
                {ld.safetyNotes.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-rose-300/90">{tr('안전 주의')}</h3>
                    <p className="text-rose-50/90 text-sm leading-relaxed whitespace-pre-wrap">{formatArrayForDisplay(ld.safetyNotes)}</p>
                  </section>
                ) : null}
                {(ld.relatedProgramIds.length > 0 || ld.relatedSpomoveIds.length > 0) ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('연계 활동')}</h3>
                    <p className="text-slate-200 text-sm font-mono break-all">
                      {ld.relatedProgramIds.length > 0 ? `${tr('프로그램 ID')}: ${stringifyJsonArray(ld.relatedProgramIds)}` : null}
                      {ld.relatedProgramIds.length > 0 && ld.relatedSpomoveIds.length > 0 ? ' · ' : null}
                      {ld.relatedSpomoveIds.length > 0 ? `${tr('SPOMOVE ID')}: ${stringifyJsonArray(ld.relatedSpomoveIds)}` : null}
                    </p>
                  </section>
                ) : null}
                {ld.parentNote ? (
                  <details className="rounded-xl border border-slate-700/50 bg-slate-950/40">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 [&::-webkit-details-marker]:hidden">
                      {tr('학부모 설명 문구')}
                    </summary>
                    <div className="border-t border-slate-800/80 px-3 py-3">
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{ld.parentNote}</p>
                    </div>
                  </details>
                ) : null}
                {isEditMode && ld.packageKeys.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('패키지 키')}</h3>
                    <p className="text-slate-200 text-xs font-mono whitespace-pre-wrap">{stringifyJsonArray(ld.packageKeys)}</p>
                  </section>
                ) : null}
                </div>
              </details>
            )}

            {!checklist && !equipment && !activityMethod && !activityTip && !subtitle && !ld && (
              <p className="text-slate-500 text-sm py-4">
                {detailKind === 'screenplay'
                  ? tr(
                      '텍스트형 체크리스트·교구 목록은 비어 있을 수 있어요. 인지 과제 본문은 「SPOMOVE 실행」화면에서 이어집니다. (관리자는 program_details로 보강 가능)'
                    )
                  : tr('등록된 상세가 없습니다.')}
              </p>
            )}

            {isEditMode && detailKind === 'program' && onSaveLessonDetail && (
              <div className="flex justify-end pt-2 border-t border-slate-700/60 mt-2">
                <button
                  type="button"
                  onClick={openLessonEditModal}
                  className="px-6 py-3 rounded-xl bg-cyan-900/60 hover:bg-cyan-700 text-cyan-50 font-bold text-sm transition-colors border border-cyan-500/30"
                >
                  {tr('수업 운영 팁 편집')}
                </button>
              </div>
            )}

            {isEditMode && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Edit2 size={16} /> {tr('수정')}
                </button>
              </div>
            )}
          </div>

          {!isEditMode && onFabClick && (
            <div className="absolute bottom-6 right-6 z-10">
              <button
                type="button"
                onClick={onFabClick}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-colors border border-slate-600"
                aria-label={tr('추가 기능')}
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeEditModal} />
          <form
            onSubmit={handleEditSubmit}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 md:p-8 space-y-5 text-left"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white">{tr('프로그램 상세 수정')}</h2>
              <button type="button" onClick={closeEditModal} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('제목')}</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder={tr('프로그램 제목')}
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('부제 / 한 줄 설명')}</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder={tr('모드·난이도 안내 등')}
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">YouTube URL</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="https://youtube.com/..."
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('신체 기능')}</label>
                <div className="flex flex-wrap gap-2">
                  {FUNCTION_TYPES.map((ft) => {
                    const selected = editForm.functionTypes.includes(ft);
                    return (
                      <button
                        key={ft}
                        type="button"
                        onClick={() =>
                          setEditForm((f) => {
                            const next = new Set(f.functionTypes);
                            if (next.has(ft)) next.delete(ft);
                            else next.add(ft);
                            return { ...f, functionTypes: Array.from(next) };
                          })
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-400/50'
                            : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {tr(ft)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {tr('복수 선택 가능')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동 테마')}</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={editForm.mainTheme}
                  onChange={(e) => setEditForm((f) => ({ ...f, mainTheme: e.target.value }))}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">{tr('선택')}</option>
                  {MAIN_THEMES.map((mt) => (
                    <option key={mt} value={mt}>{tr(mt)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('사전 체크리스트')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('진행 전 확인할 항목')}
                  value={editForm.checklist}
                  onChange={(e) => setEditForm((f) => ({ ...f, checklist: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('필요 교구리스트')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
                  placeholder={tr('준비할 교구')}
                  value={editForm.equipment}
                  onChange={(e) => setEditForm((f) => ({ ...f, equipment: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동방법')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('진행 방법')}
                  value={editForm.activityMethod}
                  onChange={(e) => setEditForm((f) => ({ ...f, activityMethod: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동 팁')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('활동 시 팁')}
                  value={editForm.activityTip}
                  onChange={(e) => setEditForm((f) => ({ ...f, activityTip: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-colors disabled:opacity-50"
            >
              {saving ? tr('저장 중…') : tr('저장')}
            </button>
          </form>
        </div>
      )}

      {lessonEditOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => !lessonSaving && setLessonEditOpen(false)}
          />
          <form
            onSubmit={handleLessonSubmit}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-cyan-700/40 shadow-2xl p-6 md:p-8 space-y-4 text-left"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white">{tr('수업 운영 팁 편집')}</h2>
              <button
                type="button"
                disabled={lessonSaving}
                onClick={() => setLessonEditOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-cyan-100 cursor-pointer">
              <input
                type="checkbox"
                checked={lessonForm.isFeaturedLesson}
                onChange={(e) => setLessonForm((f) => ({ ...f, isFeaturedLesson: e.target.checked }))}
                className="rounded border-slate-500"
              />
              {tr('대표 수업안')}
            </label>
            {[
              ['summary', tr('요약'), 'textarea'],
              ['recommendedAge', tr('추천 연령'), 'input'],
              ['recommendedPlayers', tr('권장 인원'), 'input'],
              ['duration', tr('수업 시간'), 'input'],
              ['space', tr('공간'), 'input'],
              ['objective', tr('수업 목표'), 'textarea'],
              ['developmentFocus', tr('발달 요소'), 'textarea'],
              ['coachScript', tr('강사 멘트'), 'textarea'],
              ['parentNote', tr('학부모 설명'), 'textarea'],
            ].map(([key, label, kind]) => (
              <div key={key as string}>
                <label className="block text-xs font-bold text-slate-400 mb-1">{label}</label>
                {kind === 'textarea' ? (
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm min-h-[72px]"
                    value={lessonForm[key as keyof typeof lessonForm] as string}
                    onChange={(e) => setLessonForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
                    value={lessonForm[key as keyof typeof lessonForm] as string}
                    onChange={(e) => setLessonForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            {(
              [
                ['stepsJson', tr('진행 순서 (JSON 배열)')],
                ['fieldTipsJson', tr('현장 팁 (JSON 배열)')],
                ['variationsJson', tr('변형 방법 (JSON 배열)')],
                ['safetyNotesJson', tr('안전 주의 (JSON 배열)')],
                ['relatedProgramIdsJson', tr('연계 프로그램 curriculum id (JSON 배열)')],
                ['relatedSpomoveIdsJson', tr('SPOMOVE 연계 ID (JSON 배열)')],
                ['packageKeysJson', tr('패키지 키 (JSON 배열)')],
              ] as const
            ).map(([k, lab]) => (
              <div key={k}>
                <label className="block text-xs font-bold text-slate-400 mb-1">{lab}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white font-mono text-xs min-h-[80px]"
                  value={lessonForm[k]}
                  onChange={(e) => setLessonForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={lessonSaving}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm disabled:opacity-50"
            >
              {lessonSaving ? tr('저장 중…') : tr('수업안 저장')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
