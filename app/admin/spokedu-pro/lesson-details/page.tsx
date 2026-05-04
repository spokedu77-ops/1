'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LessonDetailStatus, ProgramLessonDetail } from '@/app/lib/spokedu-pro/programLessonDetail';
import {
  buildLessonDetailAutoTexts,
  getLessonDetailCompletion,
  LESSON_DETAIL_COMPLETION_KEYS,
  LESSON_DETAIL_DEVELOPMENT_FOCUS_OPTIONS,
  LESSON_DETAIL_DURATION_OPTIONS,
  LESSON_DETAIL_OBJECTIVE_OPTIONS,
  LESSON_DETAIL_RECOMMENDED_AGE_OPTIONS,
  LESSON_DETAIL_RECOMMENDED_PLAYERS_OPTIONS,
  LESSON_DETAIL_SPACE_OPTIONS,
  partitionKnownLessonDetailTokens,
  serializeLessonDetailMultiField,
  splitLessonDetailListField,
} from '@/app/lib/spokedu-pro/programLessonDetail';
import {
  LESSON_PACKAGE_KEY_OPTIONS,
  LESSON_PACKAGE_KEY_LABELS,
  LESSON_PACKAGE_DETAIL_TEMPLATES,
  LESSON_PACKAGE_DETAIL_TEMPLATE_FALLBACK,
  isLessonPackageKeyId,
  type LessonPackageKeyId,
} from '@/app/lib/spokedu-pro/lessonPackageKeys';
import { FUNCTION_TYPES, MAIN_THEMES, GROUP_SIZES } from '@/app/lib/spokedu-pro/programClassification';
import {
  mergeLessonDetailWithLegacyDraftFill,
  isFeaturedCandidateRow,
} from '@/app/lib/spokedu-pro/lessonDetailProductionHelpers';

type ProgramApiRow = {
  id: number;
  title: string;
  video_url?: string | null;
  function_type?: string | null;
  function_types?: string[] | null;
  main_theme?: string | null;
  group_size?: string | null;
  equipment?: string | null;
  activity_method?: string | null;
  activity_tip?: string | null;
  lesson_detail?: ProgramLessonDetail | null;
};

type PipelineStatusFilter = 'all' | 'none' | 'draft' | 'reviewed';
type TriFilter = 'all' | 'yes' | 'no';
type FeaturedFilter = 'all' | 'featured';
type PackageFilter = 'all' | LessonPackageKeyId;

function equipmentSummary(eq: string | null | undefined): string {
  const s = String(eq ?? '').trim();
  if (!s) return '—';
  const first = s.split(/\r?\n/).find((l) => l.trim()) ?? s;
  return first.length > 56 ? `${first.slice(0, 56)}…` : first;
}

function arrayToLines(arr: unknown[]): string {
  return arr
    .map((x) => {
      if (typeof x === 'string' || typeof x === 'number') return String(x);
      try {
        return JSON.stringify(x);
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

function linesToStringArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function linesToMixedIdArray(text: string): unknown[] {
  return linesToStringArray(text).map((line) => {
    const n = Number(line);
    if (Number.isFinite(n) && String(Math.trunc(n)) === line) return n;
    return line;
  });
}

async function fetchAllPrograms(): Promise<ProgramApiRow[]> {
  const out: ProgramApiRow[] = [];
  let offset = 0;
  const limit = 200;
  for (;;) {
    const res = await fetch(`/api/spokedu-pro/programs?limit=${limit}&offset=${offset}`, {
      credentials: 'include',
    });
    const j = (await res.json().catch(() => ({}))) as {
      data?: ProgramApiRow[];
      total?: number;
    };
    if (!res.ok || !Array.isArray(j.data)) break;
    out.push(...j.data);
    if (j.data.length < limit) break;
    offset += limit;
    if (typeof j.total === 'number' && offset >= j.total) break;
  }
  return out;
}

function packageKeysList(ld: ProgramLessonDetail | null | undefined): string[] {
  if (!ld?.packageKeys || !Array.isArray(ld.packageKeys)) return [];
  return ld.packageKeys
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((s) => s.trim());
}

function hasPackageKey(ld: ProgramLessonDetail | null | undefined, key: LessonPackageKeyId): boolean {
  return packageKeysList(ld).includes(key);
}

type LessonFormState = {
  curriculumId: number;
  status: LessonDetailStatus;
  isFeaturedLesson: boolean;
  summary: string;
  recommendedAge: string;
  recommendedPlayers: string;
  duration: string;
  space: string;
  objectiveSelections: string[];
  objectiveLegacy: string;
  developmentSelections: string[];
  developmentLegacy: string;
  coachScript: string;
  parentNote: string;
  stepsText: string;
  fieldTipsText: string;
  variationsText: string;
  safetyNotesText: string;
  relatedProgramIdsText: string;
  relatedSpomoveIdsText: string;
  packageKeysSelected: Set<LessonPackageKeyId>;
};

function toggleOrderedSelection(
  current: string[],
  item: string,
  ordered: readonly string[]
): string[] {
  const set = new Set(current);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  return ordered.filter((o) => set.has(o));
}

function emptyLessonForm(curriculumId: number, existing: ProgramLessonDetail | null): LessonFormState {
  const ld = existing;
  const objParts = splitLessonDetailListField(ld?.objective ?? null);
  const devParts = splitLessonDetailListField(ld?.developmentFocus ?? null);
  const objParted = partitionKnownLessonDetailTokens(objParts, LESSON_DETAIL_OBJECTIVE_OPTIONS);
  const devParted = partitionKnownLessonDetailTokens(devParts, LESSON_DETAIL_DEVELOPMENT_FOCUS_OPTIONS);
  return {
    curriculumId,
    status: ld?.status === 'reviewed' ? 'reviewed' : 'draft',
    isFeaturedLesson: ld?.isFeaturedLesson ?? false,
    summary: ld?.summary ?? '',
    recommendedAge: ld?.recommendedAge ?? '',
    recommendedPlayers: ld?.recommendedPlayers ?? '',
    duration: ld?.duration ?? '',
    space: ld?.space ?? '',
    objectiveSelections: objParted.knownOrdered,
    objectiveLegacy: objParted.legacy,
    developmentSelections: devParted.knownOrdered,
    developmentLegacy: devParted.legacy,
    coachScript: ld?.coachScript ?? '',
    parentNote: ld?.parentNote ?? '',
    stepsText: arrayToLines(ld?.steps ?? []),
    fieldTipsText: arrayToLines(ld?.fieldTips ?? []),
    variationsText: arrayToLines(ld?.variations ?? []),
    safetyNotesText: arrayToLines(ld?.safetyNotes ?? []),
    relatedProgramIdsText: arrayToLines(ld?.relatedProgramIds ?? []),
    relatedSpomoveIdsText: arrayToLines(ld?.relatedSpomoveIds ?? []),
    packageKeysSelected: new Set(packageKeysList(ld).filter((k) => isLessonPackageKeyId(k))),
  };
}

function formToLessonDetail(form: LessonFormState): ProgramLessonDetail {
  return {
    curriculumId: form.curriculumId,
    status: form.status,
    isFeaturedLesson: form.isFeaturedLesson,
    summary: form.summary.trim() || null,
    recommendedAge: form.recommendedAge.trim() || null,
    recommendedPlayers: form.recommendedPlayers.trim() || null,
    duration: form.duration.trim() || null,
    space: form.space.trim() || null,
    objective: serializeLessonDetailMultiField(form.objectiveSelections, form.objectiveLegacy),
    developmentFocus: serializeLessonDetailMultiField(
      form.developmentSelections,
      form.developmentLegacy
    ),
    coachScript: form.coachScript.trim() || null,
    parentNote: form.parentNote.trim() || null,
    steps: linesToStringArray(form.stepsText),
    fieldTips: linesToStringArray(form.fieldTipsText),
    variations: linesToStringArray(form.variationsText),
    safetyNotes: linesToStringArray(form.safetyNotesText),
    relatedProgramIds: linesToMixedIdArray(form.relatedProgramIdsText),
    relatedSpomoveIds: linesToMixedIdArray(form.relatedSpomoveIdsText),
    packageKeys: Array.from(form.packageKeysSelected),
  };
}

async function postLessonDetailJson(body: unknown): Promise<ProgramLessonDetail> {
  const res = await fetch('/api/admin/spokedu-pro/program-lesson-details', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; lessonDetail?: ProgramLessonDetail; error?: string };
  if (!res.ok || !j.ok || !j.lessonDetail) {
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return j.lessonDetail;
}

function applyPackageTemplateToForm(
  form: LessonFormState,
  packageKey: LessonPackageKeyId
): LessonFormState {
  const tpl =
    LESSON_PACKAGE_DETAIL_TEMPLATES[packageKey] ?? LESSON_PACKAGE_DETAIL_TEMPLATE_FALLBACK;
  const next = { ...form, packageKeysSelected: new Set(form.packageKeysSelected) };
  next.packageKeysSelected.add(packageKey);
  if (!next.parentNote.trim() && tpl.parentNote) next.parentNote = tpl.parentNote;
  if (!next.safetyNotesText.trim() && tpl.safetyNotes?.length) {
    next.safetyNotesText = tpl.safetyNotes.join('\n');
  }
  return next;
}

function LessonDetailSelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  const list = options as readonly string[];
  const showLegacy = Boolean(value && !list.includes(value));
  return (
    <label className="block max-w-md">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <select
        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">선택…</option>
        {list.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {showLegacy ? (
          <option value={value}>
            {value} (저장된 값, 목록 외)
          </option>
        ) : null}
      </select>
    </label>
  );
}

function MultiChipField({
  label,
  hint,
  orderedOptions,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  orderedOptions: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      {hint ? <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {orderedOptions.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                on
                  ? 'bg-cyan-700 text-white border-cyan-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminLessonDetailsPage() {
  const [rows, setRows] = useState<ProgramApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [videoFilter, setVideoFilter] = useState<TriFilter>('all');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusFilter>('all');
  const [featured, setFeatured] = useState<FeaturedFilter>('all');
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');
  const [functionTypeFilter, setFunctionTypeFilter] = useState('');
  const [mainThemeFilter, setMainThemeFilter] = useState('');
  const [groupSizeFilter, setGroupSizeFilter] = useState('');
  const [equipmentKeyword, setEquipmentKeyword] = useState('');
  const [methodFilter, setMethodFilter] = useState<TriFilter>('all');
  const [tipFilter, setTipFilter] = useState<TriFilter>('all');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<ProgramApiRow | null>(null);
  const [form, setForm] = useState<LessonFormState | null>(null);
  const [templatePackageKey, setTemplatePackageKey] = useState<LessonPackageKeyId>('kindergarten_focus');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllPrograms();
      setRows(data);
      setSelectedIds(new Set());
    } catch {
      toast.error('프로그램 목록을 불러오지 못했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const qt = q.trim().toLowerCase();
    const eqKw = equipmentKeyword.trim().toLowerCase();
    return rows.filter((r) => {
      const title = String(r.title ?? '').toLowerCase();
      if (qt && !title.includes(qt)) return false;

      const hasVideo = Boolean(String(r.video_url ?? '').trim());
      if (videoFilter === 'yes' && !hasVideo) return false;
      if (videoFilter === 'no' && hasVideo) return false;

      const ld = r.lesson_detail ?? null;
      const hasLesson = ld != null;
      const st = ld?.status ?? 'draft';

      if (pipelineStatus === 'none' && hasLesson) return false;
      if (pipelineStatus === 'draft' && (!hasLesson || st !== 'draft')) return false;
      if (pipelineStatus === 'reviewed' && (!hasLesson || st !== 'reviewed')) return false;

      if (featured === 'featured' && !ld?.isFeaturedLesson) return false;
      if (packageFilter !== 'all' && !hasPackageKey(ld, packageFilter)) return false;

      if (functionTypeFilter) {
        const fts = Array.isArray(r.function_types) ? r.function_types : [];
        const match = fts.includes(functionTypeFilter) || r.function_type === functionTypeFilter;
        if (!match) return false;
      }
      if (mainThemeFilter && r.main_theme !== mainThemeFilter) return false;
      if (groupSizeFilter && r.group_size !== groupSizeFilter) return false;

      if (eqKw) {
        const eq = String(r.equipment ?? '').toLowerCase();
        if (!eq.includes(eqKw)) return false;
      }

      const hasMethod = Boolean(String(r.activity_method ?? '').trim());
      if (methodFilter === 'yes' && !hasMethod) return false;
      if (methodFilter === 'no' && hasMethod) return false;

      const hasTip = Boolean(String(r.activity_tip ?? '').trim());
      if (tipFilter === 'yes' && !hasTip) return false;
      if (tipFilter === 'no' && hasTip) return false;

      return true;
    });
  }, [
    rows,
    q,
    videoFilter,
    pipelineStatus,
    featured,
    packageFilter,
    functionTypeFilter,
    mainThemeFilter,
    groupSizeFilter,
    equipmentKeyword,
    methodFilter,
    tipFilter,
  ]);

  const mergeRowLesson = useCallback((curriculumId: number, lessonDetail: ProgramLessonDetail) => {
    setRows((prev) => prev.map((r) => (r.id === curriculumId ? { ...r, lesson_detail: lessonDetail } : r)));
  }, []);

  const openEdit = (row: ProgramApiRow) => {
    setPreviewRow(null);
    setForm(emptyLessonForm(row.id, row.lesson_detail ?? null));
    setDrawerOpen(true);
  };

  const openPreview = (row: ProgramApiRow) => {
    setForm(null);
    setPreviewRow(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(null);
    setPreviewRow(null);
  };

  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const payload = formToLessonDetail(form);
      const lessonDetail = await postLessonDetailJson(payload);
      toast.success('수업안이 저장되었습니다.');
      mergeRowLesson(form.curriculumId, lessonDetail);
      closeDrawer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulkForSelected = async (
    label: string,
    fn: (id: number, row: ProgramApiRow) => Promise<void>
  ) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.message('선택된 행이 없습니다.');
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        try {
          await fn(id, row);
          ok++;
        } catch {
          fail++;
        }
      }
      await reload();
      toast.success(`${label} 완료: 성공 ${ok}건${fail ? `, 실패 ${fail}건` : ''}`);
    } finally {
      setBulkBusy(false);
    }
  };

  const COL_COUNT = 12;

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-slate-50 text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/admin/spokedu-pro"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> 스포키듀 구독
            </Link>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">수업안 고도화 관리</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              대표 수업안과 상황별 패키지를 관리합니다. 기존 센터 커리큘럼 원본과 영상은 수정하지 않습니다. (콘텐츠 생산
              라인)
            </p>
            <p className="text-sm text-slate-800 mt-3 max-w-2xl leading-relaxed rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              수업안 고도화는 모든 항목을 새로 작성하는 작업이 아닙니다. 기본 정보는 선택하고, 문구는 자동 생성한 뒤,
              현장 팁과 변형 방법만 전문가가 다듬어 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="shrink-0 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
          >
            새로고침
          </button>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">검색 (제목)</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="제목…"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">영상</span>
              <select
                value={videoFilter}
                onChange={(e) => setVideoFilter(e.target.value as TriFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                <option value="yes">영상 있음</option>
                <option value="no">영상 없음</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">고도화 상태</span>
              <select
                value={pipelineStatus}
                onChange={(e) => setPipelineStatus(e.target.value as PipelineStatusFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                <option value="none">미작성</option>
                <option value="draft">작성 중</option>
                <option value="reviewed">검수 완료</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">대표 수업안</span>
              <select
                value={featured}
                onChange={(e) => setFeatured(e.target.value as FeaturedFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                <option value="featured">대표만</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">패키지</span>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value as PackageFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                {LESSON_PACKAGE_KEY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">신체 기능</span>
              <select
                value={functionTypeFilter}
                onChange={(e) => setFunctionTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="">전체</option>
                {FUNCTION_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">활동 테마</span>
              <select
                value={mainThemeFilter}
                onChange={(e) => setMainThemeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="">전체</option>
                {MAIN_THEMES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">인원</span>
              <select
                value={groupSizeFilter}
                onChange={(e) => setGroupSizeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="">전체</option>
                {GROUP_SIZES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">준비물 키워드</span>
              <input
                value={equipmentKeyword}
                onChange={(e) => setEquipmentKeyword(e.target.value)}
                placeholder="교구 텍스트 포함…"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">기존 진행법</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as TriFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                <option value="yes">있음</option>
                <option value="no">없음</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs font-bold text-slate-500">기존 팁</span>
              <select
                value={tipFilter}
                onChange={(e) => setTipFilter(e.target.value as TriFilter)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="all">전체</option>
                <option value="yes">있음</option>
                <option value="no">없음</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-xs font-bold text-slate-500">선택 {selectedIds.size}건</span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={selectAllFiltered}
            className="text-xs font-bold text-cyan-700 hover:underline disabled:opacity-50"
          >
            목록 전체 선택
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={clearSelection}
            className="text-xs font-bold text-slate-500 hover:underline disabled:opacity-50"
          >
            선택 해제
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              void runBulkForSelected('대표 지정', async (id) => {
                await postLessonDetailJson({ curriculumId: id, isFeaturedLesson: true });
              })
            }
            className="px-2 py-1 rounded-md bg-violet-700 text-white text-xs font-bold hover:bg-violet-600 disabled:opacity-50"
          >
            대표로 지정
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              void runBulkForSelected('대표 해제', async (id) => {
                await postLessonDetailJson({ curriculumId: id, isFeaturedLesson: false });
              })
            }
            className="px-2 py-1 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            대표 해제
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => {
              const key = window.prompt('추가할 패키지 키 (영문 id, 예: warmup)')?.trim();
              if (!key || !isLessonPackageKeyId(key)) {
                toast.error('유효한 패키지 키를 입력하세요.');
                return;
              }
              void runBulkForSelected('패키지 추가', async (id, row) => {
                const prev = row.lesson_detail;
                const set = new Set(packageKeysList(prev));
                set.add(key);
                await postLessonDetailJson({ curriculumId: id, packageKeys: Array.from(set) });
              });
            }}
            className="px-2 py-1 rounded-md bg-sky-700 text-white text-xs font-bold hover:bg-sky-600 disabled:opacity-50"
          >
            패키지 추가…
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => {
              const key = window.prompt('제거할 패키지 키 (영문 id)')?.trim();
              if (!key || !isLessonPackageKeyId(key)) {
                toast.error('유효한 패키지 키를 입력하세요.');
                return;
              }
              void runBulkForSelected('패키지 제거', async (id, row) => {
                const prev = row.lesson_detail;
                const set = new Set(packageKeysList(prev));
                set.delete(key);
                await postLessonDetailJson({ curriculumId: id, packageKeys: Array.from(set) });
              });
            }}
            className="px-2 py-1 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            패키지 제거…
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              void runBulkForSelected('작성 중', async (id) => {
                await postLessonDetailJson({ curriculumId: id, status: 'draft' });
              })
            }
            className="px-2 py-1 rounded-md bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 disabled:opacity-50"
          >
            상태 → 작성 중
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              void runBulkForSelected('검수 완료', async (id) => {
                await postLessonDetailJson({ curriculumId: id, status: 'reviewed' });
              })
            }
            className="px-2 py-1 rounded-md bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50"
          >
            상태 → 검수 완료
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              void runBulkForSelected('기존 데이터로 초안 채우기', async (id, row) => {
                const merged = mergeLessonDetailWithLegacyDraftFill(
                  {
                    id: row.id,
                    title: row.title,
                    activity_method: row.activity_method,
                    activity_tip: row.activity_tip,
                  },
                  row.lesson_detail ?? null
                );
                await postLessonDetailJson(merged);
              })
            }
            className="px-2 py-1 rounded-md bg-indigo-700 text-white text-xs font-bold hover:bg-indigo-600 disabled:opacity-50"
          >
            선택 행 · 기존 데이터로 초안 채우기
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-2 py-2 w-10">
                  <input
                    type="checkbox"
                    aria-label="현재 목록 전체"
                    checked={filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) selectAllFiltered();
                      else clearSelection();
                    }}
                  />
                </th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">ID</th>
                <th className="px-3 py-2 font-bold min-w-[160px]">제목</th>
                <th className="px-3 py-2 font-bold">영상</th>
                <th className="px-3 py-2 font-bold min-w-[140px]">분류</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">완성도</th>
                <th className="px-3 py-2 font-bold">상태</th>
                <th className="px-3 py-2 font-bold">대표</th>
                <th className="px-3 py-2 font-bold min-w-[100px]">패키지</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">교구 요약</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">수정</th>
                <th className="px-3 py-2 font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3 py-10 text-center text-slate-400 font-medium">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3 py-10 text-center text-slate-400">
                    조건에 맞는 행이 없습니다.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => {
                  const ld = r.lesson_detail;
                  const hasLesson = ld != null;
                  const fn =
                    Array.isArray(r.function_types) && r.function_types.length
                      ? r.function_types.join('·')
                      : (r.function_type ?? '—');
                  const cls = `${fn} · ${r.main_theme ?? '—'} · ${r.group_size ?? '—'}`;
                  const pk = packageKeysList(ld ?? null);
                  const pkShort = pk.length
                    ? pk.map((k) => LESSON_PACKAGE_KEY_LABELS[k as LessonPackageKeyId] ?? k).join(', ')
                    : '—';
                  const { filled, total, percent } = getLessonDetailCompletion(ld ?? null);
                  const candidate = isFeaturedCandidateRow(r);
                  const stLabel = !hasLesson ? '미작성' : ld!.status === 'reviewed' ? '검수 완료' : '작성 중';
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          aria-label={`선택 ${r.id}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.id}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 max-w-[220px]">
                        <div className="truncate" title={r.title}>
                          {r.title}
                        </div>
                        {candidate ? (
                          <span className="mt-0.5 inline-flex rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-900">
                            대표 후보
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{r.video_url ? '있음' : '없음'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px]" title={cls}>
                        {cls}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {hasLesson ? (
                          <span className="font-bold text-slate-800">
                            {filled}/{total} · {percent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0/{LESSON_DETAIL_COMPLETION_KEYS.length}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            !hasLesson
                              ? 'bg-amber-100 text-amber-900'
                              : ld!.status === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {stLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {ld?.isFeaturedLesson ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-900 border border-violet-200">
                            대표
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 max-w-[160px] truncate" title={pkShort}>
                        {pkShort}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 max-w-[120px] truncate" title={String(r.equipment ?? '')}>
                        {equipmentSummary(r.equipment)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {ld?.updatedAt ? new Date(ld.updatedAt).toLocaleString('ko-KR') : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                          >
                            <Pencil className="w-3 h-3" /> 편집
                          </button>
                          <button
                            type="button"
                            onClick={() => openPreview(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="w-3 h-3" /> 미리보기
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && (
            <p className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100">
              표시 {filtered.length}건 / 전체 로드 {rows.length}건
            </p>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[240] flex justify-end">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="닫기" onClick={closeDrawer} />
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-black text-slate-900">
                {form ? '수업안 편집' : previewRow ? '미리보기' : ''}
              </h2>
              <button type="button" onClick={closeDrawer} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {previewRow && !form && <PreviewPanel row={previewRow} />}
              {form && (
                <form onSubmit={saveLesson} className="space-y-4 pb-8">
                  <p className="text-xs text-slate-500 font-mono">curriculum_id: {form.curriculumId}</p>

                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100"
                      onClick={() => {
                        const row = rows.find((x) => x.id === form.curriculumId);
                        if (!row) return;
                        const merged = mergeLessonDetailWithLegacyDraftFill(
                          {
                            id: row.id,
                            title: row.title,
                            activity_method: row.activity_method,
                            activity_tip: row.activity_tip,
                          },
                          row.lesson_detail ?? null
                        );
                        setForm(emptyLessonForm(row.id, merged));
                        toast.success('비어 있는 필드만 기존 데이터로 채웠습니다. 저장 시 반영됩니다.');
                      }}
                    >
                      기존 데이터로 초안 채우기
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={templatePackageKey}
                        onChange={(e) =>
                          setTemplatePackageKey(e.target.value as LessonPackageKeyId)
                        }
                        className="text-xs border border-slate-300 rounded-lg px-2 py-2"
                      >
                        {LESSON_PACKAGE_KEY_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-cyan-700 text-white text-xs font-bold hover:bg-cyan-600"
                        onClick={() =>
                          setForm((f) =>
                            f ? applyPackageTemplateToForm(f, templatePackageKey) : f
                          )
                        }
                      >
                        패키지 템플릿 적용
                      </button>
                    </div>
                  </div>

                  <label className="flex flex-col gap-1 max-w-xs">
                    <span className="text-xs font-bold text-slate-500">검수 상태</span>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                status: e.target.value === 'reviewed' ? 'reviewed' : 'draft',
                              }
                            : f
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    >
                      <option value="draft">작성 중 (draft)</option>
                      <option value="reviewed">검수 완료 (reviewed)</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeaturedLesson}
                      onChange={(e) => setForm((f) => (f ? { ...f, isFeaturedLesson: e.target.checked } : f))}
                    />
                    대표 수업안
                  </label>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">패키지 키</p>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {LESSON_PACKAGE_KEY_OPTIONS.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.packageKeysSelected.has(o.id)}
                            onChange={() =>
                              setForm((f) => {
                                if (!f) return f;
                                const next = new Set(f.packageKeysSelected);
                                if (next.has(o.id)) next.delete(o.id);
                                else next.add(o.id);
                                return { ...f, packageKeysSelected: next };
                              })
                            }
                          />
                          <span>{o.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({o.id})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3 space-y-3">
                    <h3 className="text-sm font-black text-slate-900">수기 입력 (우선 다듬기)</h3>
                    <p className="text-xs text-slate-600">
                      요약 · 현장 팁 · 변형 방법을 중심으로 작성해 주세요.
                    </p>
                    <label className="block">
                      <span className="text-xs font-bold text-cyan-900">요약 summary</span>
                      <textarea
                        className="mt-1 w-full border border-cyan-300 rounded-lg px-3 py-2 text-sm min-h-[88px]"
                        value={form.summary}
                        onChange={(e) => setForm((f) => (f ? { ...f, summary: e.target.value } : f))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-cyan-900">현장 팁 fieldTips (줄바꿈 = 항목)</span>
                      <textarea
                        className="mt-1 w-full border border-cyan-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
                        value={form.fieldTipsText}
                        onChange={(e) => setForm((f) => (f ? { ...f, fieldTipsText: e.target.value } : f))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-cyan-900">변형 방법 variations (줄바꿈 = 항목)</span>
                      <textarea
                        className="mt-1 w-full border border-cyan-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
                        value={form.variationsText}
                        onChange={(e) => setForm((f) => (f ? { ...f, variationsText: e.target.value } : f))}
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 space-y-4">
                    <h3 className="text-sm font-black text-slate-800">선택 항목</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LessonDetailSelectField
                        label="추천 연령"
                        value={form.recommendedAge}
                        onChange={(v) => setForm((f) => (f ? { ...f, recommendedAge: v } : f))}
                        options={LESSON_DETAIL_RECOMMENDED_AGE_OPTIONS}
                      />
                      <LessonDetailSelectField
                        label="권장 인원"
                        value={form.recommendedPlayers}
                        onChange={(v) => setForm((f) => (f ? { ...f, recommendedPlayers: v } : f))}
                        options={LESSON_DETAIL_RECOMMENDED_PLAYERS_OPTIONS}
                      />
                      <LessonDetailSelectField
                        label="수업 시간"
                        value={form.duration}
                        onChange={(v) => setForm((f) => (f ? { ...f, duration: v } : f))}
                        options={LESSON_DETAIL_DURATION_OPTIONS}
                      />
                      <LessonDetailSelectField
                        label="공간"
                        value={form.space}
                        onChange={(v) => setForm((f) => (f ? { ...f, space: v } : f))}
                        options={LESSON_DETAIL_SPACE_OPTIONS}
                      />
                    </div>
                    <MultiChipField
                      label="수업 목표 (복수 선택)"
                      hint="저장 시 쉼표로 이어 저장됩니다."
                      orderedOptions={LESSON_DETAIL_OBJECTIVE_OPTIONS}
                      selected={form.objectiveSelections}
                      onToggle={(item) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                objectiveSelections: toggleOrderedSelection(
                                  f.objectiveSelections,
                                  item,
                                  LESSON_DETAIL_OBJECTIVE_OPTIONS
                                ),
                              }
                            : f
                        )
                      }
                    />
                    {form.objectiveLegacy.trim() ? (
                      <label className="block">
                        <span className="text-xs font-bold text-amber-700">
                          수업 목표 — 선택지에 없던 기존 DB 문구 (비우면 다음 저장 시 제거)
                        </span>
                        <textarea
                          className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-xs min-h-[56px]"
                          value={form.objectiveLegacy}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, objectiveLegacy: e.target.value } : f))
                          }
                        />
                      </label>
                    ) : null}
                    <MultiChipField
                      label="발달 요소 (복수 선택)"
                      hint="저장 시 쉼표로 이어 저장됩니다."
                      orderedOptions={LESSON_DETAIL_DEVELOPMENT_FOCUS_OPTIONS}
                      selected={form.developmentSelections}
                      onToggle={(item) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                developmentSelections: toggleOrderedSelection(
                                  f.developmentSelections,
                                  item,
                                  LESSON_DETAIL_DEVELOPMENT_FOCUS_OPTIONS
                                ),
                              }
                            : f
                        )
                      }
                    />
                    {form.developmentLegacy.trim() ? (
                      <label className="block">
                        <span className="text-xs font-bold text-amber-700">
                          발달 요소 — 선택지에 없던 기존 DB 문구 (비우면 다음 저장 시 제거)
                        </span>
                        <textarea
                          className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-xs min-h-[56px]"
                          value={form.developmentLegacy}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, developmentLegacy: e.target.value } : f))
                          }
                        />
                      </label>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-800">자동 생성 영역</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          선택한 수업 목표·발달 요소·패키지 키를 반영합니다. 이미 적힌 칸은 덮어쓰지 않습니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-black hover:bg-slate-700"
                        onClick={() => {
                          setForm((f) => {
                            if (!f) return f;
                            const auto = buildLessonDetailAutoTexts({
                              objectiveSelections: f.objectiveSelections,
                              developmentSelections: f.developmentSelections,
                              packageKeys: Array.from(f.packageKeysSelected),
                              space: f.space,
                            });
                            const next = { ...f };
                            if (!f.parentNote.trim() && auto.parentNote) next.parentNote = auto.parentNote;
                            if (!f.safetyNotesText.trim() && auto.safetyNotesLines?.length) {
                              next.safetyNotesText = auto.safetyNotesLines.join('\n');
                            }
                            if (!f.coachScript.trim() && auto.coachScript) next.coachScript = auto.coachScript;
                            return next;
                          });
                          toast.success('비어 있는 항목만 채웠습니다.');
                        }}
                      >
                        기본 문구 생성
                      </button>
                    </div>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">강사 멘트 coachScript</span>
                      <textarea
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[72px] bg-white"
                        value={form.coachScript}
                        onChange={(e) => setForm((f) => (f ? { ...f, coachScript: e.target.value } : f))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">학부모 설명 parentNote</span>
                      <textarea
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[88px] bg-white"
                        value={form.parentNote}
                        onChange={(e) => setForm((f) => (f ? { ...f, parentNote: e.target.value } : f))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">안전 주의 safetyNotes (줄바꿈 = 항목)</span>
                      <textarea
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[88px] bg-white"
                        value={form.safetyNotesText}
                        onChange={(e) => setForm((f) => (f ? { ...f, safetyNotesText: e.target.value } : f))}
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-100 p-3 space-y-3 bg-white">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wide">
                      추가 정보 (선택)
                    </h3>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">진행 순서 steps (줄바꿈 = 항목)</span>
                      <textarea
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-xs min-h-[80px]"
                        value={form.stepsText}
                        onChange={(e) => setForm((f) => (f ? { ...f, stepsText: e.target.value } : f))}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">
                        연계 프로그램 curriculum id (한 줄에 하나)
                      </span>
                      <textarea
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-xs min-h-[56px]"
                        value={form.relatedProgramIdsText}
                        onChange={(e) =>
                          setForm((f) => (f ? { ...f, relatedProgramIdsText: e.target.value } : f))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">연계 SPOMOVE id (한 줄에 하나)</span>
                      <textarea
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-xs min-h-[56px]"
                        value={form.relatedSpomoveIdsText}
                        onChange={(e) =>
                          setForm((f) => (f ? { ...f, relatedSpomoveIdsText: e.target.value } : f))
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm disabled:opacity-50"
                  >
                    {saving ? '저장 중…' : '수업안 저장'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PreviewPanel({ row }: { row: ProgramApiRow }) {
  const ld = row.lesson_detail;
  if (!ld) {
    return <p className="text-sm text-slate-500">작성된 수업안이 없습니다.</p>;
  }
  const pk = packageKeysList(ld);
  const st = ld.status === 'reviewed' ? '검수 완료' : '작성 중';
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase">제목</h3>
        <p className="font-bold text-slate-900">{row.title}</p>
      </div>
      <p className="text-xs">
        상태: <span className="font-bold">{st}</span>
      </p>
      {ld.isFeaturedLesson && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-900">
          대표 수업안
        </span>
      )}
      {pk.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase">패키지</h3>
          <p className="text-slate-700">{pk.map((k) => LESSON_PACKAGE_KEY_LABELS[k as LessonPackageKeyId] ?? k).join(', ')}</p>
        </div>
      )}
      {ld.summary && (
        <div>
          <h3 className="text-xs font-black text-slate-400">요약</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{ld.summary}</p>
        </div>
      )}
      {(ld.recommendedAge || ld.recommendedPlayers || ld.duration || ld.space) && (
        <div>
          <h3 className="text-xs font-black text-slate-400">기본 정보</h3>
          <ul className="list-disc list-inside text-slate-700">
            {ld.recommendedAge && <li>추천 연령: {ld.recommendedAge}</li>}
            {ld.recommendedPlayers && <li>권장 인원: {ld.recommendedPlayers}</li>}
            {ld.duration && <li>수업 시간: {ld.duration}</li>}
            {ld.space && <li>공간: {ld.space}</li>}
          </ul>
        </div>
      )}
      {ld.objective && (
        <div>
          <h3 className="text-xs font-black text-slate-400">수업 목표</h3>
          <ul className="list-disc list-inside text-slate-700 text-xs">
            {splitLessonDetailListField(ld.objective).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {ld.developmentFocus && (
        <div>
          <h3 className="text-xs font-black text-slate-400">발달 요소</h3>
          <ul className="list-disc list-inside text-slate-700 text-xs">
            {splitLessonDetailListField(ld.developmentFocus).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {ld.steps.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-400">진행 방법</h3>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{arrayToLines(ld.steps)}</pre>
        </div>
      )}
      {ld.coachScript && (
        <div>
          <h3 className="text-xs font-black text-slate-400">강사 멘트</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{ld.coachScript}</p>
        </div>
      )}
      {ld.fieldTips.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-400">현장 팁</h3>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{arrayToLines(ld.fieldTips)}</pre>
        </div>
      )}
      {ld.variations.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-400">변형 방법</h3>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{arrayToLines(ld.variations)}</pre>
        </div>
      )}
      {ld.safetyNotes.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-slate-400">안전 주의</h3>
          <pre className="text-xs text-rose-800 whitespace-pre-wrap font-sans">{arrayToLines(ld.safetyNotes)}</pre>
        </div>
      )}
      {(ld.relatedProgramIds.length > 0 || ld.relatedSpomoveIds.length > 0) && (
        <div>
          <h3 className="text-xs font-black text-slate-400">연계</h3>
          <p className="text-xs font-mono text-slate-600 break-all">
            프로그램: {arrayToLines(ld.relatedProgramIds)} / SPOMOVE: {arrayToLines(ld.relatedSpomoveIds)}
          </p>
        </div>
      )}
      {ld.parentNote && (
        <div>
          <h3 className="text-xs font-black text-slate-400">학부모 설명</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{ld.parentNote}</p>
        </div>
      )}
    </div>
  );
}
