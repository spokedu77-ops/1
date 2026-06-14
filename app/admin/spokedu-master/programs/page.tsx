'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getPublicUrl, uploadToStorage } from '@/app/lib/admin/assets/storageClient';
import { LESSON_THEME_OPTIONS, normalizeLessonTheme } from '@/app/spokedu-master/lib/lessonTheme';
import { mergeStrengthBodyFunctions } from '@/app/spokedu-master/lib/lessonDisplay';
import {
  parseVariationMethod,
  serializeVariationMethod,
} from '@/app/spokedu-master/lib/lessonContentContract';
import { useMasterStore } from '@/app/spokedu-master/store';
import { toast } from 'sonner';
import {
  MASTER_DURATION_TAGS,
  MASTER_SPACE_TAGS,
  MASTER_TARGET_TAGS,
  displayMasterDuration,
  normalizeMasterDuration,
  parseMasterSpaces,
  parseMasterTargets,
  serializeMasterTags,
} from '@/app/spokedu-master/lib/programDisplayTags';
type MaterialStatus = 'incomplete' | 'needs-improvement' | 'ready' | 'home-ready';
type PublicationStatus = 'draft' | 'ready' | 'featured' | 'hidden';
type FilterKey = 'all' | 'incomplete' | 'ready' | 'home-ready' | 'image-needed' | 'spomove-needed';

type CurriculumRow = {
  id: number;
  title: string;
  url: string | null;
  month: number | null;
  week: number | null;
  displayOrder: number | null;
  equipment: string[];
  checklist: string[];
  steps: string[];
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[];
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
  sm_duration: number | null;
  sm_is_pro: boolean;
  sm_is_new: boolean;
  sm_is_hot: boolean;
  sm_display_order: number;
  sm_objective: string | null;
  sm_development_focus: string | null;
  sm_coach_script: string | null;
  sm_parent_note: string | null;
  sm_related_spomove_ids: string[] | null;
  sm_thumbnail_url: string | null;
  sm_hero_image_url: string | null;
  sm_setup_image_url: string | null;
  sm_gallery_image_urls: string[] | null;
};

type OverlayRow = {
  id: number | null;
  title: string | null;
  video_url: string | null;
  equipment: string | null;
  checklist: string | null;
  activity_method: string | null;
  activity_tip: string | null;
  function_types: string[] | null;
  main_theme: string | null;
  group_size: string | null;
  is_published: boolean | null;
  updated_at: string | null;
};

type ProgramItem = {
  curriculum: CurriculumRow;
  meta: MetaRow | null;
  overlay: OverlayRow | null;
  effective: {
    title: string;
    videoUrl: string | null;
    target: string;
    space: string;
    duration: string;
    equipment: string[];
    checklist: string[];
    steps: string[];
    parentNote: string;
    relatedSpomoveIds: string[];
    status: MaterialStatus;
    publicationStatus: PublicationStatus;
  };
};

type ProgramsResponse = {
  data: ProgramItem[];
  total: number;
};

type EditForm = {
  title: string;
  coachScript: string;
  description: string;
  objective: string;
  target: string;
  space: string;
  duration: string;
  theme: string;
  tags: string;
  videoUrl: string;
  thumbnailUrl: string;
  heroImageUrl: string;
  setupImageUrl: string;
  galleryImageUrls: string;
  equipment: string;
  briefingNotes: string;
  steps: string;
  variations: string;
  parentNote: string;
  relatedSpomoveIds: string;
  isNew: boolean;
  publicationStatus: PublicationStatus;
  dashboardVisible: boolean;
};

const STATUS_LABEL: Record<MaterialStatus, string> = {
  incomplete: '미완성',
  'needs-improvement': '보강 필요',
  ready: '운영 가능',
  'home-ready': '홈 노출 가능',
};

const STATUS_STYLE: Record<MaterialStatus, { bg: string; color: string }> = {
  incomplete: { bg: '#fff1f2', color: '#be123c' },
  'needs-improvement': { bg: '#fffbeb', color: '#b45309' },
  ready: { bg: '#ecfdf5', color: '#047857' },
  'home-ready': { bg: '#eef2ff', color: '#4338ca' },
};

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'incomplete', label: '미완성' },
  { key: 'ready', label: '운영 가능' },
  { key: 'home-ready', label: '홈 노출 가능' },
  { key: 'image-needed', label: '이미지 필요' },
  { key: 'spomove-needed', label: 'SPOMOVE 연결 필요' },
];

const SPACE_OPTIONS = [...MASTER_SPACE_TAGS];
const TARGET_OPTIONS = [...MASTER_TARGET_TAGS];
const THEME_OPTIONS = [...LESSON_THEME_OPTIONS];
const MAX_SETUP_IMAGE_BYTES = 10 * 1024 * 1024;
const MOVEMENT_OPTIONS = ['동적', '정적'];
const BODY_FUNCTION_OPTIONS = ['유연성', '민첩성', '순발력', '협응력', '근력·근지구력', '심폐지구력', '리듬감', '평형성'];
const TAG_PREFIX = {
  movement: '움직임:',
  bodyFunction: '신체 기능:',
  groupSize: '인원:',
} as const;
const koreanTitleCollator = new Intl.Collator('ko-KR', {
  sensitivity: 'base',
  numeric: true,
});

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[] | null | undefined) {
  return (value ?? []).filter(Boolean).join('\n');
}

function csvToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToCsvValue(value: string[]) {
  return value.filter(Boolean).join(', ');
}

function toggleOption(list: string[], option: string) {
  const hasOption = list.includes(option);
  if (option === 'ALL') return hasOption ? [] : ['ALL'];
  const withoutAll = list.filter((item) => item !== 'ALL');
  return hasOption ? withoutAll.filter((item) => item !== option) : [...withoutAll, option];
}

function taggedValue(prefix: string, option: string) {
  return `${prefix}${option}`;
}

function selectedTaggedOptions(tags: string, prefix: string) {
  return csvToList(tags)
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length));
}

function updateTaggedOptions(tags: string, prefix: string, nextOptions: string[]) {
  const otherTags = csvToList(tags).filter((tag) => !tag.startsWith(prefix));
  return listToCsvValue([...otherTags, ...nextOptions.map((option) => taggedValue(prefix, option))]);
}

function imageUrlList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToCsv(value: string[] | null | undefined) {
  return (value ?? []).filter(Boolean).join(', ');
}

function sectionText(label: string, value: string) {
  const lines = splitLines(value);
  return lines.length ? [`[${label}]`, ...lines].join('\n') : '';
}

function extractSection(source: string | null | undefined, label: string) {
  const lines = (source ?? '').split('\n');
  const start = lines.findIndex((line) => line.trim() === `[${label}]`);
  if (start < 0) return '';
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^\[[^\]]+\]$/.test(line)) break;
    if (line) collected.push(line);
  }
  return collected.join('\n');
}

type QualityReport = {
  status: MaterialStatus;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  thumbnailSource: '세팅 이미지' | '영상 썸네일' | '없음';
  modalReady: boolean;
  detailReady: boolean;
  dashboardCandidates: string[];
  checks: {
    video: boolean;
    setupImage: boolean;
    indoorSpace: boolean;
    target: boolean;
    space: boolean;
    duration: boolean;
    equipment: boolean;
    steps: boolean;
    variations: boolean;
    parentNote: boolean;
    spomove: boolean;
    homeExposure: boolean;
  };
  reasons: string[];
};

function resolveStatus(checks: QualityReport['checks']): MaterialStatus {
  const coreReady = checks.target && checks.space && checks.duration && checks.equipment && checks.steps;
  if (!coreReady) return 'incomplete';

  const operationReady = coreReady;
  if (!operationReady) return 'needs-improvement';

  const hasHomeMedia = checks.video || checks.setupImage;
  const homeReady = operationReady && hasHomeMedia;
  if (homeReady) return 'home-ready';

  const needsProductWork = operationReady && (hasHomeMedia || !checks.variations || !checks.setupImage || !checks.parentNote);
  if (needsProductWork) return 'needs-improvement';

  return 'ready';
}

function buildQualityReport(checks: QualityReport['checks'], displayOrder: number): QualityReport {
  const weightedChecks = [
    checks.video,
    checks.setupImage,
    checks.target,
    checks.space,
    checks.duration,
    checks.equipment,
    checks.steps,
    checks.variations,
    checks.parentNote,
  ];
  const score = Math.round((weightedChecks.filter(Boolean).length / weightedChecks.length) * 100);
  const modalReady =
    (checks.video || checks.setupImage) &&
    checks.target &&
    checks.space &&
    checks.duration &&
    checks.equipment &&
    checks.setupImage &&
    checks.steps;
  const detailReady =
    checks.equipment &&
    checks.setupImage &&
    checks.steps &&
    checks.variations &&
    checks.parentNote;
  const dashboardCandidates = [
    checks.homeExposure && displayOrder < 100 ? '홈 첫 row 후보' : '',
    checks.indoorSpace ? '실내/교실 row 후보' : '',
    checks.video ? '영상 수업 row 후보' : '',
    checks.spomove ? 'SPOMOVE 연결 후보' : '',
  ].filter(Boolean);
  const grade: QualityReport['grade'] =
    score >= 90 && modalReady && detailReady && checks.homeExposure
      ? 'A'
      : score >= 75 && checks.steps && checks.equipment
        ? 'B'
        : score >= 55
          ? 'C'
          : 'D';
  return {
    status: resolveStatus(checks),
    score,
    grade,
    thumbnailSource: checks.setupImage ? '세팅 이미지' : checks.video ? '영상 썸네일' : '없음',
    modalReady,
    detailReady,
    dashboardCandidates,
    checks,
    reasons: qualityReasons(checks),
  };
}

function qualityReasons(checks: QualityReport['checks']) {
  const items: Array<[string, boolean]> = [
    ['영상', checks.video],
    ['세팅 이미지', checks.setupImage],
    ['대상', checks.target],
    ['공간', checks.space],
    ['시간', checks.duration],
    ['준비물', checks.equipment],
    ['세팅 이미지', checks.setupImage],
    ['진행 순서', checks.steps],
    ['변형 방법', checks.variations],
    ['학부모 문구', checks.parentNote],
    ['SPOMOVE', checks.spomove],
    ['홈 노출', checks.homeExposure],
  ];
  return items.map(([label, ok]) => `${label} ${ok ? '있음' : '없음'}`);
}

function missingQualityLabels(checks: QualityReport['checks']) {
  const items: Array<[string, boolean]> = [
    ['대상', checks.target],
    ['공간', checks.space],
    ['시간', checks.duration],
    ['준비물', checks.equipment],
    ['세팅 이미지', checks.setupImage],
    ['활동 방법', checks.steps],
    ['변형 방법', checks.variations],
    ['학부모 문구', checks.parentNote],
    ['세팅 이미지', checks.setupImage],
    ['SPOMOVE', checks.spomove],
    ['홈 노출', checks.homeExposure],
  ];
  return items.filter(([, ok]) => !ok).map(([label]) => label);
}

function qualitySummary(report: QualityReport) {
  const missing = missingQualityLabels(report.checks);
  if (report.status === 'home-ready') {
    return report.checks.homeExposure ? '홈 노출 조건 충족' : '홈 노출 가능, 노출 설정만 확인';
  }
  if (report.status === 'ready') return '운영 자료로 사용 가능';
  if (report.status === 'needs-improvement') {
    return missing.length ? `보강 필요: ${missing.slice(0, 3).join(', ')}` : '홈 노출 전 상품성 확인 필요';
  }
  return missing.length ? `부족: ${missing.slice(0, 4).join(', ')}` : '핵심 정보 확인 필요';
}

function getItemQuality(item: ProgramItem): QualityReport {
  const meta = item.meta;
  const overlay = item.overlay;
  const checks = {
    video: Boolean(item.effective.videoUrl),
    setupImage: Boolean(meta?.sm_setup_image_url),
    indoorSpace: parseMasterSpaces(item.effective.space).includes('교실'),
    target: Boolean(item.effective.target),
    space: Boolean(item.effective.space),
    duration: Boolean(item.effective.duration),
    equipment: item.effective.equipment.length > 0,
    steps: item.effective.steps.length > 0,
    variations: parseVariationMethod(overlay?.activity_tip).length > 0,
    parentNote: Boolean(item.effective.parentNote),
    spomove: item.effective.relatedSpomoveIds.length > 0,
    homeExposure: item.effective.publicationStatus === 'featured' || Boolean(meta?.sm_is_hot),
  };
  return buildQualityReport(checks, meta?.sm_display_order ?? item.curriculum.displayOrder ?? 9999);
}

function getFormQuality(form: EditForm): QualityReport {
  const checks = {
    video: Boolean(form.videoUrl.trim()),
    setupImage: Boolean(form.setupImageUrl.trim()),
    indoorSpace: parseMasterSpaces(form.space).includes('교실'),
    target: Boolean(form.target.trim()),
    space: Boolean(form.space.trim()),
    duration: Boolean(form.duration.trim()),
    equipment: splitLines(form.equipment).length > 0,
    steps: splitLines(form.steps).length > 0,
    variations: Boolean(form.variations.trim()),
    parentNote: Boolean(form.parentNote.trim()),
    spomove: csvToList(form.relatedSpomoveIds).length > 0,
    homeExposure: form.publicationStatus === 'featured',
  };
  return buildQualityReport(checks, 999);
}

function matchesFilter(item: ProgramItem, filter: FilterKey) {
  const quality = getItemQuality(item);
  if (filter === 'all') return true;
  if (filter === 'incomplete' || filter === 'ready' || filter === 'home-ready') return quality.status === filter;
  if (filter === 'image-needed') return !quality.checks.setupImage;
  if (filter === 'spomove-needed') return !quality.checks.spomove;
  return true;
}

function displayOrderOf(item: ProgramItem) {
  return item.meta?.sm_display_order ?? item.curriculum.displayOrder ?? 9999;
}

function sortForFilter(items: ProgramItem[], filter: FilterKey) {
  const qualityWeight = (item: ProgramItem) => missingQualityLabels(getItemQuality(item).checks).length;
  const copy = [...items];
  if (filter === 'home-ready') {
    return copy.sort((a, b) => displayOrderOf(a) - displayOrderOf(b));
  }
  if (filter === 'image-needed' || filter === 'spomove-needed' || filter === 'incomplete') {
    return copy.sort((a, b) => qualityWeight(b) - qualityWeight(a) || displayOrderOf(a) - displayOrderOf(b));
  }
  return copy;
}

function toForm(item: ProgramItem): EditForm {
  const meta = item.meta;
  const overlay = item.overlay;
  const checklist = overlay?.checklist ?? joinLines(item.curriculum.checklist);
  const activityTip = overlay?.activity_tip ?? '';

  return {
    title: overlay?.title || item.curriculum.title,
    coachScript: meta?.sm_coach_script || activityTip || '',
    description: meta?.sm_development_focus || '',
    objective: meta?.sm_objective || '',
    target: serializeMasterTags(parseMasterTargets(meta?.sm_grade || '')),
    space: serializeMasterTags(parseMasterSpaces(meta?.sm_space || '')),
    duration: normalizeMasterDuration(meta?.sm_duration) ? String(normalizeMasterDuration(meta?.sm_duration)) : '',
    theme: normalizeLessonTheme(meta?.sm_theme || overlay?.main_theme || ''),
    tags: listToCsv(meta?.sm_tags),
    videoUrl: overlay?.video_url || '',
    thumbnailUrl: meta?.sm_thumbnail_url || '',
    heroImageUrl: meta?.sm_hero_image_url || '',
    setupImageUrl: meta?.sm_setup_image_url || '',
    galleryImageUrls: (meta?.sm_gallery_image_urls ?? []).join('\n'),
    equipment: overlay?.equipment || joinLines(item.curriculum.equipment),
    briefingNotes: extractSection(checklist, '사전 교육'),
    steps: overlay?.activity_method || joinLines(item.curriculum.steps),
    variations: parseVariationMethod(activityTip).join('\n'),
    parentNote: meta?.sm_parent_note || '',
    relatedSpomoveIds: listToCsv(meta?.sm_related_spomove_ids),
    isNew: Boolean(meta?.sm_is_new),
    publicationStatus: item.effective.publicationStatus,
    dashboardVisible: meta?.sm_is_pro ?? true,
  };
}

function safeImageExtension(fileName: string, contentType: string) {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 8) return fromName;
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/gif') return 'gif';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

function resolveSetupImageSrc(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    return getPublicUrl(trimmed);
  } catch {
    return trimmed;
  }
}

function SetupImageUpload({
  curriculumId,
  value,
  onChange,
}: {
  curriculumId: number;
  value: string;
  onChange: (next: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const previewSrc = resolveSetupImageSrc(value);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SETUP_IMAGE_BYTES) {
      toast.error('이미지는 10MB 이하만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    try {
      const ext = safeImageExtension(file.name, file.type);
      const path = `spokedu-master/programs/${curriculumId}/setup.${ext}`;
      await uploadToStorage(path, file, file.type || 'image/jpeg');
      onChange(getPublicUrl(path));
      toast.success('세팅 이미지를 업로드했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        className="block w-full text-[12px] font-semibold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-[12px] file:font-black file:text-indigo-700 hover:file:bg-indigo-100"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) await handleFile(file);
          event.target.value = '';
        }}
      />
      {uploading ? (
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          업로드 중…
        </div>
      ) : null}
      {previewSrc ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <img src={previewSrc} alt="초기 교구 세팅 미리보기" className="max-h-64 w-full object-contain" />
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
            <p className="truncate text-[11px] font-semibold text-slate-500">{value}</p>
            <button
              type="button"
              className="shrink-0 text-[11px] font-black text-rose-600"
              onClick={() => onChange('')}
            >
              제거
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-slate-400">이미지를 선택하면 자동 업로드됩니다.</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function ChoiceChips({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex min-h-10 flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggleOption(selected, option))}
            className="h-8 rounded-full border px-3 text-[12px] font-black transition-colors"
            style={{
              borderColor: active ? '#4f46e5' : '#e2e8f0',
              background: active ? '#eef2ff' : '#f8fafc',
              color: active ? '#4338ca' : '#64748b',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:border-indigo-400"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-36 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-[14px] font-semibold leading-6 text-slate-900 outline-none focus:border-indigo-400"
    />
  );
}

function StatusPill({ status }: { status: MaterialStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className="inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-black" style={{ background: style.bg, color: style.color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex h-7 items-center rounded-full px-2 text-[10px] font-black"
      style={{ background: ok ? '#ecfdf5' : '#f8fafc', color: ok ? '#047857' : '#94a3b8', border: '1px solid #e2e8f0' }}
    >
      {label}
    </span>
  );
}

function QualityFlags({ report }: { report: QualityReport }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Flag ok={report.checks.video} label="영상" />
      <Flag ok={report.checks.setupImage} label="세팅 이미지" />
      <Flag ok={report.checks.spomove} label="SPOMOVE" />
      <Flag ok={report.checks.homeExposure} label="홈" />
    </div>
  );
}

function PreviewPane({ item, form }: { item: ProgramItem; form: EditForm }) {
  const title = form.title.trim() || item.curriculum.title;
  const equipment = splitLines(form.equipment).slice(0, 4);
  const steps = splitLines(form.steps).slice(0, 4);
  const functionLabel = mergeStrengthBodyFunctions(selectedTaggedOptions(form.tags, TAG_PREFIX.bodyFunction)).join(', ');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
        <p className="font-black text-slate-950">{title}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <span>테마: {normalizeLessonTheme(form.theme) || '—'}</span>
          <span>대상: {form.target || '—'}</span>
          <span>기능: {functionLabel || '—'}</span>
          <span>공간: {form.space || '—'}</span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
        <p className="font-black text-slate-900">준비물 / 수업 스크립트</p>
        <p className="mt-1 font-semibold text-slate-600">{equipment.join(', ') || '—'}</p>
        <p className="mt-2 line-clamp-3 font-semibold text-slate-600">{form.coachScript || '—'}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] sm:col-span-2">
        <p className="font-black text-slate-900">활동 방법</p>
        <ol className="mt-1 list-decimal space-y-1 pl-4 font-semibold text-slate-600">
          {(steps.length ? steps : ['미입력']).map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </div>
  );
}

function WeeklyRecommendationManager({
  items,
  onSaved,
}: {
  items: ProgramItem[];
  onSaved: () => Promise<void>;
}) {
  const [slots, setSlots] = useState<Array<number | null>>([null, null, null, null]);
  const [queries, setQueries] = useState(['', '', '', '']);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSlots = async () => {
      try {
        const res = await fetch('/api/admin/spokedu-master/programs/home-featured', {
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          slots?: Array<number | null>;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? '추천 슬롯을 불러오지 못했습니다.');
        if (active) {
          setSlots(
            Array.from({ length: 4 }, (_, index) => json.slots?.[index] ?? null),
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : '추천 슬롯을 불러오지 못했습니다.',
        );
      } finally {
        if (active) setLoadingSlots(false);
      }
    };
    void loadSlots();
    return () => {
      active = false;
    };
  }, []);

  const updateSlot = (index: number, curriculumId: number | null) => {
    setSlots((current) => {
      if (
        curriculumId != null &&
        current.some((id, slotIndex) => slotIndex !== index && id === curriculumId)
      ) {
        toast.error('같은 프로그램을 여러 추천 슬롯에 선택할 수 없습니다.');
        return current;
      }
      return current.map((id, slotIndex) => (slotIndex === index ? curriculumId : id));
    });
  };

  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/programs/home-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const json = (await res.json()) as {
        slots?: Array<number | null>;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? '추천 슬롯 저장에 실패했습니다.');
      setSlots(Array.from({ length: 4 }, (_, index) => json.slots?.[index] ?? null));
      await useMasterStore.getState().reloadPrograms();
      await onSaved();
      toast.success(json.message ?? '이번주 추천 프로그램을 저장했습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '추천 슬롯 저장에 실패했습니다.');
    } finally {
      setSavingSlots(false);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">
              Weekly recommendation
            </p>
            <h2 className="mt-1 text-[17px] font-black text-slate-950">
              이번주 추천 프로그램 관리
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
              선택한 프로그램은 슬롯 순서대로 홈에 반영되며, 빈 슬롯은 자동 추천으로 보완됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSlots()}
            disabled={loadingSlots || savingSlots}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-[12px] font-black text-white disabled:opacity-50"
          >
            <Save size={14} />
            {savingSlots ? '추천 저장 중' : '추천 슬롯 저장'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {slots.map((selectedId, index) => {
            const query = queries[index].trim().toLowerCase();
            const selectedElsewhere = new Set(
              slots.filter((id, slotIndex) => slotIndex !== index && id != null),
            );
            const options = items
              .filter((item) => {
                if (item.curriculum.id === selectedId) return true;
                if (!query) return true;
                const text =
                  `${item.effective.title} ${item.curriculum.title} ${item.curriculum.id}`.toLowerCase();
                return text.includes(query);
              })
              .sort((a, b) => {
                const titleCompare = koreanTitleCollator.compare(
                  a.effective.title.trim(),
                  b.effective.title.trim(),
                );
                return titleCompare || a.curriculum.id - b.curriculum.id;
              });

            return (
              <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-black text-slate-900">
                    {index + 1}번 추천 슬롯
                  </p>
                  {selectedId != null ? (
                    <button
                      type="button"
                      onClick={() => updateSlot(index, null)}
                      className="text-[11px] font-black text-slate-400 hover:text-rose-600"
                    >
                      비우기
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    value={queries[index]}
                    onChange={(event) =>
                      setQueries((current) =>
                        current.map((value, queryIndex) =>
                          queryIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder="프로그램 검색"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[12px] font-semibold outline-none focus:border-indigo-400"
                  />
                </div>
                <select
                  value={selectedId ?? ''}
                  disabled={loadingSlots}
                  onChange={(event) =>
                    updateSlot(index, event.target.value ? Number(event.target.value) : null)
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="">빈 슬롯</option>
                  {options.map((item) => (
                    <option
                      key={item.curriculum.id}
                      value={item.curriculum.id}
                      disabled={selectedElsewhere.has(item.curriculum.id)}
                    >
                      {item.effective.title} · #{item.curriculum.id}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function AdminSmProgramsPage() {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const selectedIdRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/programs', { cache: 'no-store' });
      const json = (await res.json()) as ProgramsResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? '프로그램 목록을 불러오지 못했습니다.');
      const nextItems = json.data ?? [];
      setItems(nextItems);
      const nextSelected =
        nextItems.find((item) => item.curriculum.id === selectedIdRef.current) ??
        nextItems[0] ??
        null;
      if (nextSelected) {
        setSelectedId(nextSelected.curriculum.id);
        setForm(toForm(nextSelected));
      } else {
        setSelectedId(null);
        setForm(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로그램 목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = useMemo(() => items.find((item) => item.curriculum.id === selectedId) ?? null, [items, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = items.filter((item) => {
      if (!matchesFilter(item, activeFilter)) return false;
      if (!q) return true;
      const haystack = `${item.effective.title} ${item.curriculum.id} ${item.effective.target} ${item.effective.space}`.toLowerCase();
      return haystack.includes(q);
    });
    return sortForFilter(next, activeFilter);
  }, [activeFilter, items, query]);

  const summary = useMemo(() => ({
    incomplete: items.filter((item) => getItemQuality(item).status === 'incomplete').length,
    needsImprovement: items.filter((item) => getItemQuality(item).status === 'needs-improvement').length,
    ready: items.filter((item) => getItemQuality(item).status === 'ready').length,
    homeReady: items.filter((item) => getItemQuality(item).status === 'home-ready').length,
  }), [items]);

  const selectItem = (item: ProgramItem) => {
    setSelectedId(item.curriculum.id);
    setForm(toForm(item));
  };

  const updateForm = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const syncFromCenter = async () => {
    setSyncing(true);
    try {
      const previewRes = await fetch('/api/admin/spokedu-master/programs/sync-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });
      const preview = await previewRes.json() as {
        error?: string;
        summary?: { toInsert: number; toUpdate: number };
        changes?: Array<{ title: string; fields: string[] }>;
        message?: string;
      };
      if (!previewRes.ok) throw new Error(preview.error ?? '동기화 미리보기에 실패했습니다.');

      const total = (preview.summary?.toInsert ?? 0) + (preview.summary?.toUpdate ?? 0);
      if (total === 0) {
        toast.success(preview.message ?? '커리큘럼과 overlay가 이미 일치합니다.');
        return;
      }

      const sample = (preview.changes ?? [])
        .slice(0, 5)
        .map((item) => `• ${item.title} (${item.fields.join(', ')})`)
        .join('\n');
      const confirmed = window.confirm(
        `커리큘럼 본문을 overlay에 반영합니다.\n\n신규 ${preview.summary?.toInsert ?? 0}개 · 갱신 ${preview.summary?.toUpdate ?? 0}개\n\n${sample}${total > 5 ? `\n…외 ${total - 5}개` : ''}\n\n제목·태그·MASTER 메타는 그대로 두고, 영상 URL·체크리스트·교구·활동 단계·전문가 팁만 덮어씁니다.`,
      );
      if (!confirmed) return;

      const applyRes = await fetch('/api/admin/spokedu-master/programs/sync-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      const applied = await applyRes.json() as { error?: string; message?: string; applied?: number };
      if (!applyRes.ok) throw new Error(applied.error ?? '동기화 적용에 실패했습니다.');

      await load();
      toast.success(applied.message ?? `커리큘럼 동기화 ${applied.applied ?? 0}건 완료`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '커리큘럼 동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  const save = async () => {
    if (!selected || !form) return;
    setSaving(true);
    try {
      const checklist = sectionText('사전 교육', form.briefingNotes);
      const activityTip = serializeVariationMethod(form.variations);

      const res = await fetch(`/api/admin/spokedu-master/programs?id=${selected.curriculum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: {
            sm_tags: csvToList(form.tags),
            sm_theme: normalizeLessonTheme(form.theme) || null,
            sm_grade: serializeMasterTags(parseMasterTargets(form.target)) || null,
            sm_space: serializeMasterTags(parseMasterSpaces(form.space)) || null,
            sm_duration: normalizeMasterDuration(form.duration),
            sm_is_pro: form.dashboardVisible,
            sm_is_new: form.isNew,
            sm_objective: form.objective.trim() || null,
            sm_development_focus: normalizeLessonTheme(form.theme) || null,
            sm_coach_script: form.coachScript.trim() || null,
            sm_parent_note: form.parentNote.trim() || null,
            sm_related_spomove_ids: csvToList(form.relatedSpomoveIds),
            sm_thumbnail_url: form.thumbnailUrl.trim() || null,
            sm_hero_image_url: form.heroImageUrl.trim() || null,
            sm_setup_image_url: form.setupImageUrl.trim() || null,
            sm_gallery_image_urls: imageUrlList(form.galleryImageUrls),
          },
          overlay: {
            title: form.title.trim() || selected.curriculum.title,
            video_url: form.videoUrl.trim() || null,
            equipment: form.equipment.trim() || null,
            checklist: checklist || null,
            activity_method: form.steps.trim() || null,
            activity_tip: activityTip || null,
            function_types: csvToList(form.tags),
            main_theme: normalizeLessonTheme(form.theme) || null,
            group_size: serializeMasterTags(parseMasterTargets(form.target)) || null,
            is_published: form.publicationStatus !== 'hidden',
          },
          publicationStatus: form.publicationStatus,
        }),
      });
      const json = await res.json() as ProgramsResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? '저장에 실패했습니다.');
      setItems(json.data ?? []);
      const next = (json.data ?? []).find((item) => item.curriculum.id === selected.curriculum.id);
      if (next) {
        setSelectedId(next.curriculum.id);
        setForm(toForm(next));
      }
      await useMasterStore.getState().reloadPrograms();
      toast.success('MASTER 편집 값이 저장되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedQuality = form ? getFormQuality(form) : null;
  const selectedQualitySummary = selectedQuality ? qualitySummary(selectedQuality) : '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/spokedu-master" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="이전">
            <ChevronLeft size={17} />
          </Link>
          <div>
            <h1 className="text-[18px] font-black">MASTER 수업 자료 편집기</h1>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">curriculum 원본은 보존하고 MASTER 메타와 운영 자료만 편집합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => void syncFromCenter()}
            disabled={syncing || loading}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '동기화 확인 중' : '커리큘럼 동기화'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-600"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!selected || !form || saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-[12px] font-black text-white disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? '저장 중' : '저장'}
          </button>
        </div>
      </header>

      <WeeklyRecommendationManager items={items} onSaved={load} />

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-[10px] font-black text-rose-700">미완성</p>
                <p className="mt-1 text-[18px] font-black text-rose-900">{summary.incomplete}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-[10px] font-black text-amber-700">보강 필요</p>
                <p className="mt-1 text-[18px] font-black text-amber-900">{summary.needsImprovement}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-[10px] font-black text-emerald-700">운영 가능</p>
                <p className="mt-1 text-[18px] font-black text-emerald-900">{summary.ready}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-[10px] font-black text-indigo-700">홈 가능</p>
                <p className="mt-1 text-[18px] font-black text-indigo-900">{summary.homeReady}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className="h-8 rounded-full border px-3 text-[11px] font-black"
                  style={{
                    borderColor: activeFilter === filter.key ? '#4f46e5' : '#e2e8f0',
                    background: activeFilter === filter.key ? '#eef2ff' : '#ffffff',
                    color: activeFilter === filter.key ? '#4338ca' : '#64748b',
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="프로그램명 또는 curriculumId 검색"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-semibold outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-238px)] overflow-y-auto p-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : filtered.map((item) => {
              const selectedNow = item.curriculum.id === selectedId;
              const quality = getItemQuality(item);
              const summaryText = qualitySummary(quality);
              const missingText = missingQualityLabels(quality.checks).join(', ');
              return (
                <button
                  key={item.curriculum.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  className="mb-2 block w-full rounded-lg border p-3 text-left transition-colors"
                  style={{ borderColor: selectedNow ? '#6366f1' : '#e2e8f0', background: selectedNow ? '#eef2ff' : '#ffffff' }}
                  title={missingText ? `부족한 항목: ${missingText}` : summaryText}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-slate-950">{item.effective.title}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">curriculumId {item.curriculum.id}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill status={quality.status} />
                      <p className="mt-1 text-[10px] font-black text-slate-400">{quality.score}점 · {quality.grade}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <QualityFlags report={quality} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">{summaryText}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 overflow-y-auto p-4 sm:p-6">
          {selected && form ? (
            <div className="mx-auto max-w-[1500px] space-y-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase text-slate-400">curriculum 원본 제목</p>
                    <h2 className="mt-1 text-[20px] font-black text-slate-950">{selected.curriculum.title}</h2>
                    <p className="mt-1 text-[12px] font-bold text-slate-500">MASTER 노출 제목: {form.title || selected.curriculum.title}</p>
                  </div>
                  <StatusPill status={selected.effective.status} />
                  <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-2.5 text-[11px] font-black text-slate-600">
                    {form.publicationStatus}
                  </span>
                </div>
              </div>

              {selectedQuality ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-[12px] font-semibold text-slate-600">
                  완성도 {selectedQuality.score}점 · {selectedQualitySummary}
                </p>
              ) : null}

              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">
                커리큘럼 연동(동기화): 제목 · 준비물 · 활동 방법 — 원본 제목 <strong>{selected.curriculum.title}</strong>
              </p>

              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><Sparkles size={16} />기본</h3>
                  <div className="grid gap-4">
                    <Field label="제목"><TextInput value={form.title} onChange={(e) => updateForm('title', e.target.value)} /></Field>
                    <Field label="영상 첨부 링크 (URL)"><TextInput value={form.videoUrl} placeholder={selected.curriculum.url ?? 'curriculum.url fallback 없음'} onChange={(e) => updateForm('videoUrl', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 text-[15px] font-black">분류</h3>
                  <div className="grid gap-4">
                    <Field label="테마">
                      <ChoiceChips options={THEME_OPTIONS} selected={csvToList(form.theme)} onChange={(next) => updateForm('theme', listToCsvValue(next))} />
                    </Field>
                    <Field label="대상">
                      <ChoiceChips options={TARGET_OPTIONS} selected={parseMasterTargets(form.target)} onChange={(next) => updateForm('target', serializeMasterTags(next))} />
                    </Field>
                    <Field label="기능">
                      <ChoiceChips
                        options={BODY_FUNCTION_OPTIONS}
                        selected={mergeStrengthBodyFunctions(selectedTaggedOptions(form.tags, TAG_PREFIX.bodyFunction))}
                        onChange={(next) => updateForm('tags', updateTaggedOptions(form.tags, TAG_PREFIX.bodyFunction, next))}
                      />
                    </Field>
                    <Field label="움직임">
                      <ChoiceChips
                        options={MOVEMENT_OPTIONS}
                        selected={selectedTaggedOptions(form.tags, TAG_PREFIX.movement)}
                        onChange={(next) => updateForm('tags', updateTaggedOptions(form.tags, TAG_PREFIX.movement, next))}
                      />
                    </Field>
                    <Field label="공간">
                      <ChoiceChips options={SPACE_OPTIONS} selected={parseMasterSpaces(form.space)} onChange={(next) => updateForm('space', serializeMasterTags(next))} />
                    </Field>
                    <Field label="시간">
                      <ChoiceChips
                        options={MASTER_DURATION_TAGS.map((item) => item.label)}
                        selected={displayMasterDuration(form.duration) ? [displayMasterDuration(form.duration)] : []}
                        onChange={(next) => {
                          const selectedDuration = next.at(-1) ?? '';
                          const option = MASTER_DURATION_TAGS.find((item) => item.label === selectedDuration);
                          updateForm('duration', option ? String(option.value) : '');
                        }}
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><ShieldAlert size={16} />사전 체크리스트</h3>
                  <div className="grid gap-4">
                    <Field label="준비물"><TextArea rows={6} value={form.equipment} onChange={(e) => updateForm('equipment', e.target.value)} /></Field>
                    <Field label="초기 교구 세팅 (이미지)">
                      <SetupImageUpload
                        curriculumId={selected.curriculum.id}
                        value={form.setupImageUrl}
                        onChange={(next) => updateForm('setupImageUrl', next)}
                      />
                    </Field>
                    <Field label="수업 스크립트"><TextArea rows={6} value={form.coachScript} onChange={(e) => updateForm('coachScript', e.target.value)} /></Field>
                    <Field label="사전 교육"><TextArea rows={5} value={form.briefingNotes} onChange={(e) => updateForm('briefingNotes', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><CheckCircle2 size={16} />수업 운영</h3>
                  <div className="grid gap-4">
                    <Field label="활동 방법"><TextArea rows={12} value={form.steps} onChange={(e) => updateForm('steps', e.target.value)} /></Field>
                    <Field label="변형 방법"><TextArea rows={8} value={form.variations} onChange={(e) => updateForm('variations', e.target.value)} /></Field>
                  </div>
                </section>

                <details className="rounded-lg border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer text-[15px] font-black text-slate-900">미리보기</summary>
                  <div className="mt-4">
                    <PreviewPane item={selected} form={form} />
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] font-bold text-slate-400">
              편집할 프로그램을 선택하세요.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
