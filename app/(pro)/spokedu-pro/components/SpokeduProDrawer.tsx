'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ClipboardList, Edit2, FileText, Gamepad2, Lightbulb, Package, X } from 'lucide-react';
import type { ProgramDetail } from '../types';
import { FUNCTION_TYPES, MAIN_THEMES, extractEquipmentDisplayTags } from '@/app/lib/spokedu-pro/programClassification';
import { getYouTubeId } from '@/app/(pro)/spokedu-pro/utils/youtube';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';
import type { ProgramLessonDetail, ProgramLessonDetailLite } from '@/app/lib/spokedu-pro/programLessonDetail';

type DrawerIcon = typeof BookOpen;

type LessonForm = {
  isFeaturedLesson: boolean;
  summary: string;
  recommendedAge: string;
  recommendedPlayers: string;
  duration: string;
  space: string;
  objective: string;
  developmentFocus: string;
  coachScript: string;
  parentNote: string;
  stepsJson: string;
  fieldTipsJson: string;
  variationsJson: string;
  safetyNotesJson: string;
  relatedProgramIdsJson: string;
  relatedSpomoveIdsJson: string;
  packageKeysJson: string;
};

type LessonTextKey =
  | 'summary'
  | 'recommendedAge'
  | 'recommendedPlayers'
  | 'duration'
  | 'space'
  | 'objective'
  | 'developmentFocus'
  | 'coachScript'
  | 'parentNote';

type LessonJsonKey =
  | 'stepsJson'
  | 'fieldTipsJson'
  | 'variationsJson'
  | 'safetyNotesJson'
  | 'relatedProgramIdsJson'
  | 'relatedSpomoveIdsJson'
  | 'packageKeysJson';

const EMPTY_LESSON_FORM: LessonForm = {
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
};

const LESSON_TEXT_FIELDS: Array<{ key: LessonTextKey; label: string; kind: 'input' | 'textarea' }> = [
  { key: 'summary', label: '요약', kind: 'textarea' },
  { key: 'recommendedAge', label: '추천 연령', kind: 'input' },
  { key: 'recommendedPlayers', label: '권장 인원', kind: 'input' },
  { key: 'duration', label: '수업 시간', kind: 'input' },
  { key: 'space', label: '공간', kind: 'input' },
  { key: 'objective', label: '수업 목표', kind: 'textarea' },
  { key: 'developmentFocus', label: '발달 요소', kind: 'textarea' },
  { key: 'coachScript', label: '강사 멘트', kind: 'textarea' },
  { key: 'parentNote', label: '학부모 안내 문구', kind: 'textarea' },
];

const LESSON_JSON_FIELDS: Array<{ key: LessonJsonKey; label: string }> = [
  { key: 'stepsJson', label: '진행 순서 (JSON 배열)' },
  { key: 'fieldTipsJson', label: '현장 팁 (JSON 배열)' },
  { key: 'variationsJson', label: '변형 방법 (JSON 배열)' },
  { key: 'safetyNotesJson', label: '안전 주의 (JSON 배열)' },
  { key: 'relatedProgramIdsJson', label: '연계 프로그램 curriculum id (JSON 배열)' },
  { key: 'relatedSpomoveIdsJson', label: 'SPOMOVE 연계 ID (JSON 배열)' },
  { key: 'packageKeysJson', label: '패키지 키 (JSON 배열)' },
];

function isProgramLessonDetailFull(
  detail: ProgramLessonDetail | ProgramLessonDetailLite | null | undefined
): detail is ProgramLessonDetail {
  return detail != null && typeof (detail as ProgramLessonDetail).curriculumId === 'number';
}

function stringifyJsonArray(arr: unknown[]): string {
  try {
    return JSON.stringify(arr, null, 2);
  } catch {
    return '[]';
  }
}

function parseJsonArrayField(raw: string, fallback: unknown[]): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function formatArrayForDisplay(items: unknown[]): string {
  if (!items.length) return '';

  return items
    .map((item, index) => {
      if (typeof item === 'string') return `${index + 1}. ${item}`;

      try {
        return `${index + 1}. ${JSON.stringify(item)}`;
      } catch {
        return `${index + 1}.`;
      }
    })
    .join('\n');
}

function FieldSection({
  icon: Icon,
  title,
  children,
  tone = 'slate',
}: {
  icon: DrawerIcon;
  title: string;
  children: ReactNode;
  tone?: 'slate' | 'blue' | 'violet' | 'amber' | 'rose';
}) {
  const toneClasses = {
    slate: 'text-slate-300 border-slate-700/80 bg-slate-800/60',
    blue: 'text-blue-300 border-slate-700/80 bg-slate-800/60',
    violet: 'text-violet-300 border-slate-700/80 bg-slate-800/60',
    amber: 'text-amber-200 border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-orange-950/30',
    rose: 'text-rose-200 border-rose-500/20 bg-rose-950/20',
  };

  return (
    <section className={`rounded-2xl border p-4 md:p-5 ${toneClasses[tone]}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={18} />
        <span className="text-xs font-black tracking-wide">{title}</span>
      </div>
      {children}
    </section>
  );
}

function DisplayText({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warm' | 'rose' }) {
  const color = tone === 'warm' ? 'text-amber-50/95' : tone === 'rose' ? 'text-rose-50/95' : 'text-slate-100';
  return <p className={`${color} whitespace-pre-wrap text-sm leading-relaxed`}>{children}</p>;
}

function ModalLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">{children}</label>;
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

function ModalTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
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
  detailKind?: 'program' | 'screenplay';
  onLaunchMemoryGame?: () => void;
  screenplayTags?: string[];
  lessonDetail?: ProgramLessonDetail | ProgramLessonDetailLite | null;
  onSaveLessonDetail?: (detail: ProgramLessonDetail) => Promise<void>;
}) {
  const tr = useTranslator();
  const checklistSectionRef = useRef<HTMLElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lessonEditOpen, setLessonEditOpen] = useState(false);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_LESSON_FORM);
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

  const detail = programDetail;

  useEffect(() => {
    if (!open || programId == null) return;

    setEditForm({
      title: detail?.title ?? `프로그램 #${programId}`,
      subtitle: detail?.subtitle ?? '',
      videoUrl: detail?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(detail?.functionTypes)
          ? detail?.functionTypes
          : detail?.functionType
            ? [detail.functionType]
            : []) ?? [],
      functionType: detail?.functionType ?? '',
      mainTheme: detail?.mainTheme ?? '',
      checklist: detail?.checklist ?? '',
      equipment: detail?.equipment ?? '',
      activityMethod: detail?.activityMethod ?? '',
      activityTip: detail?.activityTip ?? '',
    });
    setIsEditModalOpen(false);
  }, [
    open,
    programId,
    detail?.title,
    detail?.subtitle,
    detail?.videoUrl,
    detail?.functionTypes,
    detail?.functionType,
    detail?.mainTheme,
    detail?.checklist,
    detail?.equipment,
    detail?.activityMethod,
    detail?.activityTip,
  ]);

  const lessonSummary = lessonDetail && detailKind === 'program' ? lessonDetail : null;
  const lessonDetailFull = isProgramLessonDetailFull(lessonSummary) ? lessonSummary : null;
  const lessonPackageKeysArr = useMemo((): unknown[] => {
    if (!lessonSummary) return [];
    if (lessonDetailFull) return lessonDetailFull.packageKeys ?? [];
    return Array.isArray(lessonSummary.packageKeys) ? lessonSummary.packageKeys : [];
  }, [lessonSummary, lessonDetailFull]);

  if (!open) return null;

  const title = stripMonthWeekPrefix(detail?.title ?? editForm.title ?? `프로그램 #${programId ?? ''}`);
  const subtitle = detail?.subtitle ?? editForm.subtitle ?? '';
  const videoUrl = detail?.videoUrl ?? editForm.videoUrl ?? '';
  const functionTypes =
    detail?.functionTypes && detail.functionTypes.length > 0
      ? detail.functionTypes
      : editForm.functionTypes.length > 0
        ? editForm.functionTypes
        : detail?.functionType
          ? [detail.functionType]
          : editForm.functionType
            ? [editForm.functionType]
            : [];
  const functionType = detail?.functionType ?? editForm.functionType;
  const mainTheme = detail?.mainTheme ?? editForm.mainTheme;
  const checklist = detail?.checklist ?? editForm.checklist;
  const equipment = detail?.equipment ?? editForm.equipment;
  const activityMethod = detail?.activityMethod ?? editForm.activityMethod;
  const activityTip = detail?.activityTip ?? editForm.activityTip;
  const videoId = getYouTubeId(videoUrl);
  const isScreenplay = detailKind === 'screenplay';

  const baseTags = isScreenplay
    ? [...functionTypes, mainTheme].filter(Boolean).slice(0, 3)
    : extractEquipmentDisplayTags(equipment);
  const tagChips =
    isScreenplay && Array.isArray(screenplayTags) && screenplayTags.length > 0 ? screenplayTags.slice(0, 3) : baseTags;

  const openEditModal = (event: MouseEvent) => {
    event.stopPropagation();
    setEditForm({
      title: detail?.title ?? title,
      subtitle: detail?.subtitle ?? subtitle,
      videoUrl: detail?.videoUrl ?? videoUrl,
      functionTypes: Array.isArray(detail?.functionTypes)
        ? detail?.functionTypes ?? []
        : detail?.functionType
          ? [detail.functionType]
          : functionTypes,
      functionType: detail?.functionType ?? functionType ?? '',
      mainTheme: detail?.mainTheme ?? mainTheme ?? '',
      checklist: detail?.checklist ?? checklist ?? '',
      equipment: detail?.equipment ?? equipment ?? '',
      activityMethod: detail?.activityMethod ?? activityMethod ?? '',
      activityTip: detail?.activityTip ?? activityTip ?? '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm({
      title: detail?.title ?? '',
      subtitle: detail?.subtitle ?? '',
      videoUrl: detail?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(detail?.functionTypes)
          ? detail?.functionTypes
          : detail?.functionType
            ? [detail.functionType]
            : []) ?? [],
      functionType: detail?.functionType ?? '',
      mainTheme: detail?.mainTheme ?? '',
      checklist: detail?.checklist ?? '',
      equipment: detail?.equipment ?? '',
      activityMethod: detail?.activityMethod ?? '',
      activityTip: detail?.activityTip ?? '',
    });
  };

  const handleEditSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
        isScreenplay ? { screenplay: true } : undefined
      );
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openLessonEditModal = () => {
    if (programId == null) return;

    const full = lessonDetailFull;
    const snapshot = lessonSummary;
    setLessonForm({
      isFeaturedLesson: snapshot?.isFeaturedLesson ?? false,
      summary: snapshot?.summary ?? '',
      recommendedAge: full?.recommendedAge ?? '',
      recommendedPlayers: full?.recommendedPlayers ?? '',
      duration: full?.duration ?? '',
      space: full?.space ?? '',
      objective: full?.objective ?? '',
      developmentFocus: full?.developmentFocus ?? '',
      coachScript: full?.coachScript ?? '',
      parentNote: full?.parentNote ?? '',
      stepsJson: stringifyJsonArray(full?.steps ?? []),
      fieldTipsJson: stringifyJsonArray(full?.fieldTips ?? []),
      variationsJson: stringifyJsonArray(full?.variations ?? []),
      safetyNotesJson: stringifyJsonArray(full?.safetyNotes ?? []),
      relatedProgramIdsJson: stringifyJsonArray(full?.relatedProgramIds ?? []),
      relatedSpomoveIdsJson: stringifyJsonArray(full?.relatedSpomoveIds ?? []),
      packageKeysJson: stringifyJsonArray(lessonPackageKeysArr),
    });
    setLessonEditOpen(true);
  };

  const handleLessonSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (programId == null || !onSaveLessonDetail) return;

    setLessonSaving(true);
    try {
      const next: ProgramLessonDetail = {
        curriculumId: programId,
        status:
          isProgramLessonDetailFull(lessonDetail) && lessonDetail.status === 'reviewed' ? 'reviewed' : 'draft',
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

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl">
          <div className="relative aspect-video w-full bg-slate-950">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={tr('프로그램 영상')}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                  <FileText className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold">{tr('영상이 등록되지 않았습니다.')}</p>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="mt-4 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
                  >
                    {tr('상세 수정')}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label={tr('닫기')}
            >
              <X size={20} />
            </button>
            {isEditMode && videoId && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute right-16 top-4 flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black/70"
              >
                <Edit2 size={16} /> {tr('수정')}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-7">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">{title}</h2>
              {subtitle ? (
                isEditMode || subtitle.trim().length <= 160 ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{subtitle}</p>
                ) : (
                  <details className="mt-2 rounded-lg border border-slate-700/50 bg-slate-950/30">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                      {tr('부가 설명 보기')}
                    </summary>
                    <div className="border-t border-slate-800/80 px-3 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{subtitle}</p>
                    </div>
                  </details>
                )
              ) : null}

              {tagChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(isEditMode ? tagChips : tagChips.slice(0, 2)).map((tagValue, index) => (
                    <span
                      key={`${tagValue}-${index}`}
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        isScreenplay
                          ? 'border-orange-400/20 bg-orange-950/35 text-orange-100/90'
                          : 'border-white/10 bg-slate-900/35 text-slate-200/80'
                      }`}
                    >
                      {tr(String(tagValue))}
                    </span>
                  ))}
                </div>
              )}

              {isScreenplay ? (
                <div className="mt-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-950/40 via-slate-900/30 to-slate-950/40 p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2 text-orange-200">
                    <Gamepad2 className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {tr('SPOMOVE 반응훈련 안내')}
                    </span>
                  </div>
                  <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300 [&>li]:pl-1">
                    <li>{tr('아래 SPOMOVE 실행 버튼으로 전체 화면 훈련을 시작할 수 있습니다.')}</li>
                    <li>{tr('제목과 부제는 수업 도입 멘트와 활동 안내로 사용할 수 있습니다.')}</li>
                    <li>{tr('종료할 때는 우측 상단 X 또는 ESC를 사용합니다.')}</li>
                  </ol>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {isScreenplay && onLaunchMemoryGame && (
                  <button
                    type="button"
                    onClick={onLaunchMemoryGame}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    {tr('SPOMOVE 실행')}
                  </button>
                )}
              </div>
            </div>

            {equipment ? (
              <FieldSection icon={Package} title={tr('준비물')} tone="blue">
                <DisplayText>{equipment}</DisplayText>
              </FieldSection>
            ) : null}

            {activityMethod ? (
              <FieldSection icon={BookOpen} title={tr('진행 방법')} tone="violet">
                <DisplayText>{activityMethod}</DisplayText>
              </FieldSection>
            ) : null}

            {activityTip ? (
              <FieldSection icon={Lightbulb} title={tr('현장 팁')} tone="amber">
                <DisplayText tone="warm">{activityTip}</DisplayText>
              </FieldSection>
            ) : null}

            {checklist ? (
              isEditMode ? (
                <section ref={checklistSectionRef}>
                  <FieldSection icon={ClipboardList} title={tr('사전 체크리스트')} tone="slate">
                    <DisplayText>{checklist}</DisplayText>
                  </FieldSection>
                </section>
              ) : (
                <details className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-left text-xs font-black tracking-wide text-slate-200 hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2 text-amber-400/95">
                      <ClipboardList size={16} />
                      {tr('수업 전 체크')}
                    </span>
                    <span className="text-[10px] font-bold normal-case text-slate-500">{tr('펼치기')}</span>
                  </summary>
                  <div className="border-t border-slate-700/60 px-4 py-3">
                    <DisplayText>{checklist}</DisplayText>
                  </div>
                </details>
              )
            ) : null}

            {lessonSummary ? (
              <details
                className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/40"
                open={Boolean(isEditMode)}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-left text-xs font-black tracking-wide text-slate-200 hover:bg-slate-800/50 md:px-5 md:py-3.5 [&::-webkit-details-marker]:hidden">
                  <span>{isEditMode ? tr('수업 운영 상세') : tr('수업 상세 보기')}</span>
                  <span className="text-[10px] font-bold normal-case text-slate-500">{tr('펼치기')}</span>
                </summary>
                <div className="space-y-5 border-t border-slate-700/60 bg-gradient-to-b from-slate-900/50 to-slate-950/60 px-4 py-4 md:px-5 md:pb-5">
                  {isEditMode && lessonSummary.isFeaturedLesson ? (
                    <span className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                      {tr('대표 수업')}
                    </span>
                  ) : null}

                  {lessonSummary.summary ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('요약')}</h3>
                      <DisplayText>{lessonSummary.summary}</DisplayText>
                    </section>
                  ) : null}

                  {lessonDetailFull?.recommendedAge ||
                  lessonDetailFull?.recommendedPlayers ||
                  lessonDetailFull?.duration ||
                  lessonDetailFull?.space ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('기본 정보')}</h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-slate-200">
                        {lessonDetailFull?.recommendedAge ? (
                          <li>
                            {tr('추천 연령')}: {lessonDetailFull.recommendedAge}
                          </li>
                        ) : null}
                        {lessonDetailFull?.recommendedPlayers ? (
                          <li>
                            {tr('권장 인원')}: {lessonDetailFull.recommendedPlayers}
                          </li>
                        ) : null}
                        {lessonDetailFull?.duration ? (
                          <li>
                            {tr('수업 시간')}: {lessonDetailFull.duration}
                          </li>
                        ) : null}
                        {lessonDetailFull?.space ? (
                          <li>
                            {tr('공간')}: {lessonDetailFull.space}
                          </li>
                        ) : null}
                      </ul>
                    </section>
                  ) : null}

                  {lessonDetailFull?.objective ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('수업 목표')}</h3>
                      <DisplayText>{lessonDetailFull.objective}</DisplayText>
                    </section>
                  ) : null}
                  {lessonDetailFull?.developmentFocus ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('발달 요소')}</h3>
                      <DisplayText>{lessonDetailFull.developmentFocus}</DisplayText>
                    </section>
                  ) : null}
                  {(lessonDetailFull?.steps?.length ?? 0) > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('진행 순서')}</h3>
                      <DisplayText>{formatArrayForDisplay(lessonDetailFull?.steps ?? [])}</DisplayText>
                    </section>
                  ) : null}
                  {lessonDetailFull?.coachScript ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('강사 멘트')}</h3>
                      <DisplayText>{lessonDetailFull.coachScript}</DisplayText>
                    </section>
                  ) : null}
                  {(lessonDetailFull?.fieldTips?.length ?? 0) > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('현장 팁')}</h3>
                      <DisplayText>{formatArrayForDisplay(lessonDetailFull?.fieldTips ?? [])}</DisplayText>
                    </section>
                  ) : null}
                  {(lessonDetailFull?.variations?.length ?? 0) > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('변형 방법')}</h3>
                      <DisplayText>{formatArrayForDisplay(lessonDetailFull?.variations ?? [])}</DisplayText>
                    </section>
                  ) : null}
                  {(lessonDetailFull?.safetyNotes?.length ?? 0) > 0 ? (
                    <FieldSection icon={ClipboardList} title={tr('안전 주의')} tone="rose">
                      <DisplayText tone="rose">{formatArrayForDisplay(lessonDetailFull?.safetyNotes ?? [])}</DisplayText>
                    </FieldSection>
                  ) : null}
                  {(lessonDetailFull?.relatedProgramIds?.length ?? 0) > 0 ||
                  (lessonDetailFull?.relatedSpomoveIds?.length ?? 0) > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('연계 활동')}</h3>
                      <p className="break-all font-mono text-sm text-slate-200">
                        {(lessonDetailFull?.relatedProgramIds?.length ?? 0) > 0
                          ? `${tr('프로그램 ID')}: ${stringifyJsonArray(lessonDetailFull?.relatedProgramIds ?? [])}`
                          : null}
                        {(lessonDetailFull?.relatedProgramIds?.length ?? 0) > 0 &&
                        (lessonDetailFull?.relatedSpomoveIds?.length ?? 0) > 0
                          ? ' / '
                          : null}
                        {(lessonDetailFull?.relatedSpomoveIds?.length ?? 0) > 0
                          ? `${tr('SPOMOVE ID')}: ${stringifyJsonArray(lessonDetailFull?.relatedSpomoveIds ?? [])}`
                          : null}
                      </p>
                    </section>
                  ) : null}
                  {lessonDetailFull?.parentNote ? (
                    <details className="rounded-xl border border-slate-700/50 bg-slate-950/40">
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 [&::-webkit-details-marker]:hidden">
                        {tr('학부모 안내 문구')}
                      </summary>
                      <div className="border-t border-slate-800/80 px-3 py-3">
                        <DisplayText>{lessonDetailFull.parentNote}</DisplayText>
                      </div>
                    </details>
                  ) : null}
                  {isEditMode && lessonPackageKeysArr.length > 0 ? (
                    <section className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{tr('패키지 키')}</h3>
                      <p className="whitespace-pre-wrap font-mono text-xs text-slate-200">
                        {stringifyJsonArray(lessonPackageKeysArr)}
                      </p>
                    </section>
                  ) : null}
                </div>
              </details>
            ) : null}

            {!checklist && !equipment && !activityMethod && !activityTip && !subtitle && !lessonSummary ? (
              <p className="py-4 text-sm text-slate-500">
                {isScreenplay
                  ? tr('아직 안내 문구가 없습니다. 관리 화면에서 SPOMOVE 상세를 보강할 수 있습니다.')
                  : tr('등록된 상세가 없습니다.')}
              </p>
            ) : null}

            {isEditMode && detailKind === 'program' && onSaveLessonDetail ? (
              <div className="mt-2 flex justify-end border-t border-slate-700/60 pt-2">
                <button
                  type="button"
                  onClick={openLessonEditModal}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-900/60 px-6 py-3 text-sm font-bold text-cyan-50 transition-colors hover:bg-cyan-700"
                >
                  {tr('수업 운영 상세 편집')}
                </button>
              </div>
            ) : null}

            {isEditMode ? (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex items-center gap-2 rounded-xl bg-slate-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
                >
                  <Edit2 size={16} /> {tr('수정')}
                </button>
              </div>
            ) : null}
          </div>

          {!isEditMode && onFabClick ? (
            <div className="absolute bottom-6 right-6 z-10">
              <button
                type="button"
                onClick={onFabClick}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-white shadow-lg transition-colors hover:bg-emerald-600"
                aria-label={tr('추가 기능')}
              >
                <FileText className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeEditModal} />
          <form
            onSubmit={handleEditSubmit}
            className="relative max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 text-left shadow-2xl md:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">{tr('프로그램 상세 수정')}</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={tr('닫기')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <ModalLabel>{tr('제목')}</ModalLabel>
                <ModalInput
                  placeholder={tr('프로그램 제목')}
                  value={editForm.title}
                  onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>{tr('부제 / 한 줄 설명')}</ModalLabel>
                <ModalInput
                  placeholder={tr('모드와 수업 안내 문구')}
                  value={editForm.subtitle}
                  onChange={(event) => setEditForm((form) => ({ ...form, subtitle: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>YouTube URL</ModalLabel>
                <ModalInput
                  placeholder="https://youtube.com/..."
                  value={editForm.videoUrl}
                  onChange={(event) => setEditForm((form) => ({ ...form, videoUrl: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>{tr('신체 기능')}</ModalLabel>
                <div className="flex flex-wrap gap-2">
                  {FUNCTION_TYPES.map((functionTypeOption) => {
                    const selected = editForm.functionTypes.includes(functionTypeOption);
                    return (
                      <button
                        key={functionTypeOption}
                        type="button"
                        onClick={() =>
                          setEditForm((form) => {
                            const next = new Set(form.functionTypes);
                            if (next.has(functionTypeOption)) next.delete(functionTypeOption);
                            else next.add(functionTypeOption);
                            return { ...form, functionTypes: Array.from(next) };
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                          selected
                            ? 'border-emerald-400/50 bg-emerald-600 text-white'
                            : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {tr(functionTypeOption)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">{tr('여러 개를 선택할 수 있습니다.')}</p>
              </div>
              <div>
                <ModalLabel>{tr('활동 테마')}</ModalLabel>
                <select
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                  value={editForm.mainTheme}
                  onChange={(event) => setEditForm((form) => ({ ...form, mainTheme: event.target.value }))}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">{tr('선택')}</option>
                  {MAIN_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {tr(theme)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <ModalLabel>{tr('사전 체크리스트')}</ModalLabel>
                <ModalTextarea
                  className="h-24"
                  placeholder={tr('진행 전 확인할 항목')}
                  value={editForm.checklist}
                  onChange={(event) => setEditForm((form) => ({ ...form, checklist: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>{tr('필요 교구')}</ModalLabel>
                <ModalTextarea
                  className="h-20"
                  placeholder={tr('준비할 교구')}
                  value={editForm.equipment}
                  onChange={(event) => setEditForm((form) => ({ ...form, equipment: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>{tr('활동 방법')}</ModalLabel>
                <ModalTextarea
                  className="h-24"
                  placeholder={tr('진행 방법')}
                  value={editForm.activityMethod}
                  onChange={(event) => setEditForm((form) => ({ ...form, activityMethod: event.target.value }))}
                />
              </div>
              <div>
                <ModalLabel>{tr('활동 팁')}</ModalLabel>
                <ModalTextarea
                  className="h-24"
                  placeholder={tr('현장 팁')}
                  value={editForm.activityTip}
                  onChange={(event) => setEditForm((form) => ({ ...form, activityTip: event.target.value }))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-black text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? tr('저장 중...') : tr('저장')}
            </button>
          </form>
        </div>
      ) : null}

      {lessonEditOpen ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => !lessonSaving && setLessonEditOpen(false)}
          />
          <form
            onSubmit={handleLessonSubmit}
            className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-cyan-700/40 bg-slate-900 p-6 text-left shadow-2xl md:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{tr('수업 운영 상세 편집')}</h2>
              <button
                type="button"
                disabled={lessonSaving}
                onClick={() => setLessonEditOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label={tr('닫기')}
              >
                <X size={20} />
              </button>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-cyan-100">
              <input
                type="checkbox"
                checked={lessonForm.isFeaturedLesson}
                onChange={(event) =>
                  setLessonForm((form) => ({ ...form, isFeaturedLesson: event.target.checked }))
                }
                className="rounded border-slate-500"
              />
              {tr('대표 수업')}
            </label>

            {LESSON_TEXT_FIELDS.map(({ key, label, kind }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-bold text-slate-400">{tr(label)}</label>
                {kind === 'textarea' ? (
                  <textarea
                    className="min-h-[72px] w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={lessonForm[key]}
                    onChange={(event) => setLessonForm((form) => ({ ...form, [key]: event.target.value }))}
                  />
                ) : (
                  <input
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={lessonForm[key]}
                    onChange={(event) => setLessonForm((form) => ({ ...form, [key]: event.target.value }))}
                  />
                )}
              </div>
            ))}

            {LESSON_JSON_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-bold text-slate-400">{tr(label)}</label>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-white"
                  value={lessonForm[key]}
                  onChange={(event) => setLessonForm((form) => ({ ...form, [key]: event.target.value }))}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={lessonSaving}
              className="w-full rounded-xl bg-cyan-600 py-3 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {lessonSaving ? tr('저장 중...') : tr('수업 상세 저장')}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
