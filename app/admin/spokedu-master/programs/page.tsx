'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  deleteFromStorage,
  getPublicUrl,
  uploadToStorage,
  withPublicUrlCacheBust,
} from '@/app/lib/admin/assets/storageClient';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveGuideVideoMap,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
  SPOMOVE_GUIDE_VIDEO_PACK_NAME,
  SPOMOVE_THUMBNAIL_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_NAME,
  type SpomoveGuideVideoAssetsJson,
  type SpomoveThumbnailAssetsJson,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { LESSON_THEME_OPTIONS, normalizeLessonTheme } from '@/app/spokedu-master/lib/lessonTheme';
import { mergeStrengthBodyFunctions } from '@/app/spokedu-master/lib/lessonDisplay';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  type OfficialSpomoveProgramGroup,
} from '@/app/spokedu-master/spomove/officialSpomovePresets';
import {
  buildAdminProgramSavePayload,
  replaceAdminProgramByCurriculumId,
  resolveAdminBriefingNotes,
  resolveAdminVariationMethod,
  type SavedAdminProgram,
} from '@/app/spokedu-master/lib/adminProgramEditorContract';
import { useMasterStore } from '@/app/spokedu-master/store';
import { toast } from 'sonner';
import {
  MASTER_PARTICIPANT_FORMATS,
  MASTER_SPACE_TAGS,
  MASTER_TARGET_TAGS,
  getMasterParticipantFormat,
  parseMasterSpaces,
  parseMasterTargets,
  serializeMasterTags,
  setMasterParticipantFormatTag,
} from '@/app/spokedu-master/lib/programDisplayTags';
import { ContentAuditPanel } from './ContentAuditPanel';
type MaterialStatus = 'incomplete' | 'needs-improvement' | 'ready' | 'home-ready';
type PublicationStatus = 'draft' | 'ready' | 'featured' | 'hidden';
type FilterKey = 'all' | 'home-ready' | 'image-needed';
type AdminTabKey = 'programs' | 'content-audit' | 'spomove-thumbnails' | 'spomove-guide-videos';

type SpomoveGuideVideoDraft = Record<string, string>;

type CurriculumRow = {
  id: number;
  title: string;
  url: string | null;
  month: number | null;
  week: number | null;
  displayOrder: number | null;
  equipment: string[];
  steps: string[];
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[];
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
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
  sm_briefing_notes: string | null;
  sm_variation_method: string | null;
};

type OverlayRow = {
  id: number | null;
  title: string | null;
  video_url: string | null;
  equipment: string | null;
  activity_method: string | null;
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
    equipment: string[];
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
  target: string;
  space: string;
  theme: string;
  tags: string;
  videoUrl: string;
  setupImageUrl: string;
  equipment: string;
  briefingNotes: string;
  steps: string;
  variations: string;
  publicationStatus: PublicationStatus;
};

type CreateProgramForm = {
  title: string;
  videoUrl: string;
  equipment: string;
  steps: string;
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
  { key: 'home-ready', label: '홈 노출 가능' },
  { key: 'image-needed', label: '이미지 필요' },
];

const SPACE_OPTIONS = [...MASTER_SPACE_TAGS];
const TARGET_OPTIONS = [...MASTER_TARGET_TAGS];
const THEME_OPTIONS = [...LESSON_THEME_OPTIONS];
const MAX_SETUP_IMAGE_BYTES = 10 * 1024 * 1024;
const ADMIN_TAB_OPTIONS: Array<{ key: AdminTabKey; label: string }> = [
  { key: 'programs', label: '수업 자료' },
  { key: 'content-audit', label: 'Phase E 감사' },
  { key: 'spomove-thumbnails', label: 'SPOMOVE 썸네일' },
  { key: 'spomove-guide-videos', label: 'SPOMOVE 가이드 영상' },
];
const SPOMOVE_GROUP_OPTIONS: Array<{
  key: OfficialSpomoveProgramGroup;
  label: string;
  expectedCount: number;
}> = [
  { key: 'visual-reaction', label: '시지각 반응', expectedCount: 17 },
  { key: 'reaction-cognition', label: '반응 인지', expectedCount: 40 },
  { key: 'simon', label: '사이먼 효과', expectedCount: 3 },
  { key: 'flanker', label: '플랭커', expectedCount: 6 },
  { key: 'stroop', label: '스트룹 과제', expectedCount: 5 },
  { key: 'sequential-memory', label: '순차 기억', expectedCount: 6 },
  { key: 'dive', label: '다이브', expectedCount: 5 },
  { key: 'bonus', label: '보너스', expectedCount: 1 },
];
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

function listToCsv(value: string[] | null | undefined) {
  return (value ?? []).filter(Boolean).join(', ');
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
    participant: boolean;
    equipment: boolean;
    steps: boolean;
    variations: boolean;
    homeExposure: boolean;
  };
  reasons: string[];
};

function resolveStatus(checks: QualityReport['checks']): MaterialStatus {
  const coreReady = checks.target && checks.space && checks.participant && checks.equipment && checks.steps;
  if (!coreReady) return 'incomplete';

  const operationReady = coreReady;
  if (!operationReady) return 'needs-improvement';

  const hasHomeMedia = checks.video || checks.setupImage;
  const homeReady = operationReady && hasHomeMedia;
  if (homeReady) return 'home-ready';

  const needsProductWork = operationReady && (!checks.variations || !checks.setupImage);
  if (needsProductWork) return 'needs-improvement';

  return 'ready';
}

function buildQualityReport(checks: QualityReport['checks'], displayOrder: number): QualityReport {
  const hasMedia = checks.video || checks.setupImage;
  const weightedChecks = [
    hasMedia,
    checks.target,
    checks.space,
    checks.participant,
    checks.equipment,
    checks.steps,
    checks.variations,
  ];
  const score = Math.round((weightedChecks.filter(Boolean).length / weightedChecks.length) * 100);
  const modalReady =
    (checks.video || checks.setupImage) &&
    checks.target &&
    checks.space &&
    checks.participant &&
    checks.equipment &&
    checks.setupImage &&
    checks.steps;
  const detailReady =
    checks.equipment &&
    checks.setupImage &&
    checks.steps &&
    checks.variations;
  const dashboardCandidates = [
    checks.homeExposure && displayOrder < 100 ? '홈 첫 row 후보' : '',
    checks.indoorSpace ? '실내/교실 row 후보' : '',
    checks.video ? '영상 수업 row 후보' : '',
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
  const hasMedia = checks.video || checks.setupImage;
  const items: Array<[string, boolean]> = [
    ['영상/세팅 이미지', hasMedia],
    ['대상', checks.target],
    ['공간', checks.space],
    ['인원', checks.participant],
    ['준비물', checks.equipment],
    ['진행 순서', checks.steps],
    ['변형 방법', checks.variations],
    ['홈 노출', checks.homeExposure],
  ];
  return items.map(([label, ok]) => `${label} ${ok ? '있음' : '없음'}`);
}

function missingQualityLabels(checks: QualityReport['checks']) {
  const hasMedia = checks.video || checks.setupImage;
  const items: Array<[string, boolean]> = [
    ['영상/세팅 이미지', hasMedia],
    ['대상', checks.target],
    ['공간', checks.space],
    ['인원', checks.participant],
    ['준비물', checks.equipment],
    ['활동 방법', checks.steps],
    ['변형 방법', checks.variations],
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
  const checks = {
    video: Boolean(item.effective.videoUrl),
    setupImage: Boolean(meta?.sm_setup_image_url),
    indoorSpace: parseMasterSpaces(item.effective.space).includes('교실'),
    target: Boolean(item.effective.target),
    space: Boolean(item.effective.space),
    participant: Boolean(getMasterParticipantFormat(meta?.sm_tags ?? [])),
    equipment: item.effective.equipment.length > 0,
    steps: item.effective.steps.length > 0,
    variations: Boolean(meta?.sm_variation_method?.trim()),
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
    participant: Boolean(getMasterParticipantFormat(csvToList(form.tags))),
    equipment: splitLines(form.equipment).length > 0,
    steps: splitLines(form.steps).length > 0,
    variations: Boolean(form.variations.trim()),
    homeExposure: form.publicationStatus === 'featured',
  };
  return buildQualityReport(checks, 999);
}

function matchesFilter(item: ProgramItem, filter: FilterKey) {
  const quality = getItemQuality(item);
  if (filter === 'all') return true;
  if (filter === 'home-ready') return quality.status === filter;
  if (filter === 'image-needed') return !quality.checks.setupImage;
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
  if (filter === 'image-needed') {
    return copy.sort((a, b) => qualityWeight(b) - qualityWeight(a) || displayOrderOf(a) - displayOrderOf(b));
  }
  return copy;
}

function toForm(item: ProgramItem): EditForm {
  const meta = item.meta;
  const overlay = item.overlay;
  return {
    title: overlay?.title || item.curriculum.title,
    coachScript: meta?.sm_coach_script || '',
    target: serializeMasterTags(parseMasterTargets(meta?.sm_grade || '')),
    space: serializeMasterTags(parseMasterSpaces(meta?.sm_space || '')),
    theme: normalizeLessonTheme(meta?.sm_theme || overlay?.main_theme || ''),
    tags: listToCsv(meta?.sm_tags),
    videoUrl: overlay?.video_url || '',
    setupImageUrl: meta?.sm_setup_image_url || '',
    equipment: overlay?.equipment || joinLines(item.curriculum.equipment),
    briefingNotes: resolveAdminBriefingNotes(meta?.sm_briefing_notes),
    steps: overlay?.activity_method || joinLines(item.curriculum.steps),
    variations: resolveAdminVariationMethod(meta?.sm_variation_method),
    publicationStatus: item.effective.publicationStatus,
  };
}

function mergeSavedProgram(
  current: ProgramItem,
  saved: SavedAdminProgram<Partial<OverlayRow>, MetaRow>,
): ProgramItem {
  const overlay = { ...current.overlay, ...saved.overlay } as OverlayRow;
  const meta = saved.meta;
  const target = serializeMasterTags(parseMasterTargets(meta.sm_grade || ''));
  const space = serializeMasterTags(parseMasterSpaces(meta.sm_space || ''));

  return {
    ...current,
    meta,
    overlay,
    effective: {
      ...current.effective,
      title: overlay.title?.trim() || current.curriculum.title,
      videoUrl: overlay.video_url?.trim() || current.curriculum.url,
      target,
      space,
      equipment: overlay.equipment ? splitLines(overlay.equipment) : current.curriculum.equipment,
      steps: overlay.activity_method ? splitLines(overlay.activity_method) : current.curriculum.steps,
      parentNote: meta.sm_parent_note?.trim() || '',
      relatedSpomoveIds: meta.sm_related_spomove_ids ?? [],
    },
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
  const cacheBust = Date.now();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return withPublicUrlCacheBust(trimmed, cacheBust);
  }
  try {
    return withPublicUrlCacheBust(getPublicUrl(trimmed), cacheBust);
  } catch {
    return trimmed;
  }
}

function storagePathFromPublicUrl(value: string) {
  const text = value.trim();
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) return text.split('?')[0] ?? '';
  try {
    const url = new URL(text);
    const marker = '/storage/v1/object/public/iiwarmup-files/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return '';
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return '';
  }
}

function SetupImageUpload({
  curriculumId,
  value,
  onChange,
  onRemove,
}: {
  curriculumId: number;
  value: string;
  onChange: (next: string) => void;
  onRemove?: () => void;
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
      const previousPath = storagePathFromPublicUrl(value);
      const path = `spokedu-master/programs/${curriculumId}/setup-${Date.now()}.${ext}`;
      await uploadToStorage(path, file, file.type || 'image/jpeg');
      onChange(withPublicUrlCacheBust(getPublicUrl(path), Date.now()));
      if (previousPath && previousPath !== path) {
        await deleteFromStorage(previousPath).catch(() => undefined);
      }
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
              onClick={onRemove ?? (() => {
                const path = storagePathFromPublicUrl(value);
                onChange('');
                if (path) void deleteFromStorage(path).catch(() => undefined);
              })}
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

function spomoveThumbnailPath(presetId: string, ext: string) {
  return `spokedu-master/spomove-thumbnails/${presetId}/thumbnail.${ext}`;
}

function resolveSpomoveThumbnailUrl(path: string | null | undefined, cacheBust?: number) {
  if (!path) return '';
  try {
    return withPublicUrlCacheBust(getPublicUrl(path), cacheBust);
  } catch {
    return '';
  }
}

function SpomoveThumbnailManager() {
  const [thumbnailPaths, setThumbnailPaths] = useState<Record<string, string>>({});
  const pathsRef = useRef(thumbnailPaths);
  pathsRef.current = thumbnailPaths;
  const [cacheBust, setCacheBust] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [savingPresetId, setSavingPresetId] = useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from('think_asset_packs')
        .select('assets_json, updated_at')
        .eq('id', SPOMOVE_THUMBNAIL_PACK_ID)
        .maybeSingle();

      if (loadError && loadError.code !== 'PGRST116') {
        throw loadError;
      }

      const next = normalizeSpomoveThumbnailMap(data?.assets_json);
      setThumbnailPaths(next);
      pathsRef.current = next;
      setCacheBust(resolveSpomovePackCacheBust(data?.updated_at as string | undefined, Object.values(next)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'SPOMOVE 썸네일을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async (next: Record<string, string>) => {
    const res = await fetch('/api/admin/think-asset-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: SPOMOVE_THUMBNAIL_PACK_ID,
        name: SPOMOVE_THUMBNAIL_PACK_NAME,
        theme: 'spomove',
        assets_json: { thumbnails: next } satisfies SpomoveThumbnailAssetsJson,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; updated_at?: string };
    if (!res.ok) throw new Error(body.error ?? 'SPOMOVE 썸네일 저장에 실패했습니다.');
    setThumbnailPaths(next);
    pathsRef.current = next;
    setCacheBust(resolveSpomovePackCacheBust(body.updated_at, Object.values(next)) ?? Date.now());
  }, []);

  const uploadThumbnail = useCallback(async (presetId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SETUP_IMAGE_BYTES) {
      toast.error('이미지는 10MB 이하만 업로드할 수 있습니다.');
      return;
    }

    setSavingPresetId(presetId);
    setError(null);
    try {
      const ext = safeImageExtension(file.name, file.type);
      const path = spomoveThumbnailPath(presetId, ext);
      await uploadToStorage(path, file, file.type || 'image/jpeg');

      const previousPath = pathsRef.current[presetId];
      const next = { ...pathsRef.current, [presetId]: path };

      if (previousPath && previousPath !== path) {
        try {
          await deleteFromStorage(previousPath);
        } catch {
          /* Previous thumbnail cleanup failure should not block the replacement. */
        }
      }

      await persist(next);
      toast.success('SPOMOVE 썸네일을 저장했습니다.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'SPOMOVE 썸네일 저장에 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingPresetId(null);
    }
  }, [persist]);

  const deleteThumbnail = useCallback(async (presetId: string) => {
    const previousPath = pathsRef.current[presetId];
    if (!previousPath) return;

    setDeletingPresetId(presetId);
    setError(null);
    try {
      try {
        await deleteFromStorage(previousPath);
      } catch {
        /* Storage cleanup can be retried later; keep DB state consistent for the admin UI. */
      }
      const next = { ...pathsRef.current };
      delete next[presetId];
      await persist(next);
      toast.success('SPOMOVE 썸네일을 삭제했습니다.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'SPOMOVE 썸네일 삭제에 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingPresetId(null);
    }
  }, [persist]);

  const savedCount = Object.keys(thumbnailPaths).length;

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">
                SPOMOVE thumbnails
              </p>
              <h2 className="mt-1 text-[18px] font-black text-slate-950">SPOMOVE 공식 프리셋 썸네일</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                공식 프리셋 {OFFICIAL_SPOMOVE_LIBRARY.length}개의 썸네일만 관리합니다. SPOMAT 2×2 패드와 맞추려면 1:1 정사각형으로 업로드하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-black text-slate-500">공식 프리셋</p>
              <p className="mt-1 text-[18px] font-black text-slate-950">{OFFICIAL_SPOMOVE_LIBRARY.length}개</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <p className="text-[10px] font-black text-indigo-600">저장된 썸네일</p>
              <p className="mt-1 text-[18px] font-black text-indigo-900">{savedCount}개</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-black text-emerald-700">저장 위치</p>
              <p className="mt-1 text-[12px] font-black text-emerald-900">think_asset_packs</p>
            </div>
          </div>
          {error ? (
            <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        {loading ? (
          <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          SPOMOVE_GROUP_OPTIONS.map((group) => {
            const presets = OFFICIAL_SPOMOVE_LIBRARY
              .filter((preset) => preset.programGroup === group.key)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <section key={group.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-black text-slate-950">{group.label}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {presets.length}개 / 기준 {group.expectedCount}개
                    </p>
                  </div>
                  {presets.length !== group.expectedCount ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                      기준 개수 확인 필요
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {presets.map((preset) => {
                    const path = thumbnailPaths[preset.id] ?? '';
                    const imageUrl = resolveSpomoveThumbnailUrl(path, cacheBust);
                    const savingThis = savingPresetId === preset.id;
                    const deletingThis = deletingPresetId === preset.id;

                    return (
                      <article key={preset.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <div className="relative aspect-square overflow-hidden border-b border-slate-200 bg-white">
                          {imageUrl ? (
                            <img src={imageUrl} alt={`${preset.title} 썸네일`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-2 text-[12px] font-black leading-4 text-slate-950">{preset.title}</p>
                          <p className="mt-1 truncate text-[10px] font-bold text-slate-500">{preset.id}</p>
                          {path ? (
                            <p className="mt-2 truncate text-[10px] font-semibold text-slate-400">{path}</p>
                          ) : (
                            <p className="mt-2 text-[10px] font-semibold text-slate-400">썸네일 없음</p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center rounded-lg bg-indigo-600 px-2 text-[11px] font-black text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                              {savingThis ? (
                                <Loader2 size={13} className="mr-1 animate-spin" />
                              ) : null}
                              {path ? '교체' : '업로드'}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={savingThis || deletingThis}
                                className="sr-only"
                                onChange={async (event) => {
                                  const file = event.target.files?.[0];
                                  if (file) await uploadThumbnail(preset.id, file);
                                  event.target.value = '';
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => void deleteThumbnail(preset.id)}
                              disabled={!path || savingThis || deletingThis}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-rose-600 disabled:opacity-40"
                              aria-label={`${preset.title} 썸네일 삭제`}
                            >
                              {deletingThis ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}

function SpomoveGuideVideoManager() {
  const [guideVideoUrls, setGuideVideoUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef(guideVideoUrls);
  urlsRef.current = guideVideoUrls;
  const [draftUrls, setDraftUrls] = useState<SpomoveGuideVideoDraft>({});
  const [loading, setLoading] = useState(true);
  const [savingPresetId, setSavingPresetId] = useState<string | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from('think_asset_packs')
        .select('assets_json')
        .eq('id', SPOMOVE_GUIDE_VIDEO_PACK_ID)
        .maybeSingle();

      if (loadError && loadError.code !== 'PGRST116') {
        throw loadError;
      }

      const next = normalizeSpomoveGuideVideoMap(data?.assets_json);
      setGuideVideoUrls(next);
      urlsRef.current = next;
      setDraftUrls(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'SPOMOVE 가이드 영상을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async (next: Record<string, string>) => {
    const res = await fetch('/api/admin/think-asset-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: SPOMOVE_GUIDE_VIDEO_PACK_ID,
        name: SPOMOVE_GUIDE_VIDEO_PACK_NAME,
        theme: 'spomove',
        assets_json: { guideVideos: next } satisfies SpomoveGuideVideoAssetsJson,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? 'SPOMOVE 가이드 영상 저장에 실패했습니다.');
    setGuideVideoUrls(next);
    urlsRef.current = next;
    setDraftUrls(next);
  }, []);

  const saveGuideVideo = useCallback(async (presetId: string) => {
    const nextUrl = (draftUrls[presetId] ?? '').trim();
    setSavingPresetId(presetId);
    setError(null);
    try {
      const next = { ...urlsRef.current };
      if (nextUrl) next[presetId] = nextUrl;
      else delete next[presetId];
      await persist(next);
      toast.success('SPOMOVE 가이드 영상 링크를 저장했습니다.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'SPOMOVE 가이드 영상 저장에 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingPresetId(null);
    }
  }, [draftUrls, persist]);

  const deleteGuideVideo = useCallback(async (presetId: string) => {
    if (!urlsRef.current[presetId]) return;
    setDeletingPresetId(presetId);
    setError(null);
    try {
      const next = { ...urlsRef.current };
      delete next[presetId];
      await persist(next);
      toast.success('SPOMOVE 가이드 영상 링크를 삭제했습니다.');
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'SPOMOVE 가이드 영상 삭제에 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingPresetId(null);
    }
  }, [persist]);

  const savedCount = Object.keys(guideVideoUrls).length;

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">
                SPOMOVE guide videos
              </p>
              <h2 className="mt-1 text-[18px] font-black text-slate-950">SPOMOVE 공식 가이드 영상</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                프리셋별 가이드라인 모달에 노출할 YouTube·Vimeo 링크를 등록합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-black text-slate-500">공식 프리셋</p>
              <p className="mt-1 text-[18px] font-black text-slate-950">{OFFICIAL_SPOMOVE_LIBRARY.length}개</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3">
              <p className="text-[10px] font-black text-indigo-600">등록된 영상</p>
              <p className="mt-1 text-[18px] font-black text-indigo-900">{savedCount}개</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-black text-emerald-700">저장 위치</p>
              <p className="mt-1 text-[12px] font-black text-emerald-900">think_asset_packs</p>
            </div>
          </div>
          {error ? (
            <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        {loading ? (
          <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          SPOMOVE_GROUP_OPTIONS.map((group) => {
            const presets = OFFICIAL_SPOMOVE_LIBRARY
              .filter((preset) => preset.programGroup === group.key)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            return (
              <section key={group.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-black text-slate-950">{group.label}</h3>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {presets.length}개 / 기준 {group.expectedCount}개
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {presets.map((preset) => {
                    const savedUrl = guideVideoUrls[preset.id] ?? '';
                    const draftUrl = draftUrls[preset.id] ?? savedUrl;
                    const savingThis = savingPresetId === preset.id;
                    const deletingThis = deletingPresetId === preset.id;
                    const dirty = draftUrl.trim() !== savedUrl;

                    return (
                      <article key={preset.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[13px] font-black text-slate-950">{preset.title}</p>
                        <p className="mt-1 truncate text-[10px] font-bold text-slate-500">{preset.id}</p>
                        <input
                          value={draftUrl}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDraftUrls((current) => ({ ...current, [preset.id]: value }));
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          disabled={savingThis || deletingThis}
                          className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold outline-none focus:border-indigo-400"
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void saveGuideVideo(preset.id)}
                            disabled={!dirty || savingThis || deletingThis}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 px-3 text-[11px] font-black text-white disabled:opacity-40"
                          >
                            {savingThis ? <Loader2 size={13} className="mr-1 animate-spin" /> : null}
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteGuideVideo(preset.id)}
                            disabled={!savedUrl || savingThis || deletingThis}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-rose-600 disabled:opacity-40"
                          >
                            {deletingThis ? <Loader2 size={13} className="mr-1 animate-spin" /> : null}
                            삭제
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
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

function CreateProgramModal({
  form,
  creating,
  onChange,
  onClose,
  onSubmit,
}: {
  form: CreateProgramForm;
  creating: boolean;
  onChange: <K extends keyof CreateProgramForm>(key: K, value: CreateProgramForm[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[calc(100dvh-48px)] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase text-indigo-600">MASTER program</p>
            <h2 className="mt-1 text-[20px] font-black text-slate-950">프로그램 직접 추가</h2>
            <p className="mt-1 text-[12px] font-semibold text-slate-500">
              생성 후 같은 편집 화면에서 분류, 이미지, 스크립트를 이어서 채울 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
            aria-label="닫기"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black">
              <Sparkles size={16} />
              기본
            </h3>
            <div className="grid gap-4">
              <Field label="제목">
                <TextInput
                  value={form.title}
                  placeholder="예: 밸런스 컬러 점프"
                  onChange={(event) => onChange('title', event.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="영상 첨부 링크 (URL)">
                <TextInput
                  value={form.videoUrl}
                  placeholder="https://..."
                  onChange={(event) => onChange('videoUrl', event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black">
              <ShieldAlert size={16} />
              사전 체크리스트
            </h3>
            <div className="grid gap-4">
              <Field label="준비물">
                <TextArea
                  rows={5}
                  value={form.equipment}
                  placeholder="한 줄에 하나씩 입력"
                  onChange={(event) => onChange('equipment', event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black">
              <CheckCircle2 size={16} />
              수업 운영
            </h3>
            <Field label="활동 방법">
              <TextArea
                rows={8}
                value={form.steps}
                placeholder="한 줄에 한 단계씩 입력"
                onChange={(event) => onChange('steps', event.target.value)}
              />
            </Field>
          </section>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-600 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={creating || !form.title.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-[12px] font-black text-white disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MaterialStatus }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE['needs-improvement'];
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className="inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-black" style={{ background: style.bg, color: style.color }}>
      {label}
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
  const hasMedia = report.checks.video || report.checks.setupImage;
  return (
    <div className="flex flex-wrap gap-1">
      <Flag ok={hasMedia} label="미디어" />
      <Flag ok={report.checks.setupImage} label="세팅" />
      <Flag ok={report.checks.variations} label="변형" />
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
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTabKey>('programs');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProgramForm>({
    title: '',
    videoUrl: '',
    equipment: '',
    steps: '',
  });
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
    needsImprovement: items.filter((item) => getItemQuality(item).status === 'needs-improvement').length,
    homeReady: items.filter((item) => getItemQuality(item).status === 'home-ready').length,
    imageNeeded: items.filter((item) => !getItemQuality(item).checks.setupImage).length,
  }), [items]);

  const selectItem = (item: ProgramItem) => {
    setSelectedId(item.curriculum.id);
    setForm(toForm(item));
  };

  const openProgramFromAudit = (curriculumId: number) => {
    const item = items.find((candidate) => candidate.curriculum.id === curriculumId);
    if (!item) {
      toast.error('편집기 목록에 해당 수업이 없습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    selectItem(item);
    setActiveTab('programs');
  };

  const updateForm = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateCreateForm = <K extends keyof CreateProgramForm>(key: K, value: CreateProgramForm[K]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const createProgram = async () => {
    const title = createForm.title.trim();
    if (!title) {
      toast.error('프로그램 제목을 입력해 주세요.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json() as { ok?: boolean; error?: string; program?: ProgramItem };
      if (!res.ok || json.ok !== true || !json.program) {
        throw new Error(json.error ?? '프로그램 추가에 실패했습니다.');
      }

      const next = json.program;
      setItems((current) => [next, ...current.filter((item) => item.curriculum.id !== next.curriculum.id)]);
      setSelectedId(next.curriculum.id);
      setForm(toForm(next));
      setActiveFilter('all');
      setQuery('');
      setCreateOpen(false);
      setCreateForm({ title: '', videoUrl: '', equipment: '', steps: '' });
      toast.success('프로그램을 추가했습니다. 이어서 상세 정보를 채워 주세요.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로그램 추가에 실패했습니다.');
    } finally {
      setCreating(false);
    }
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
      const res = await fetch(`/api/admin/spokedu-master/programs?id=${selected.curriculum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAdminProgramSavePayload({
          title: form.title,
          fallbackTitle: selected.curriculum.title,
          videoUrl: form.videoUrl,
          equipment: form.equipment,
          activityMethod: form.steps,
          publicationStatus: form.publicationStatus,
          theme: normalizeLessonTheme(form.theme),
          target: serializeMasterTags(parseMasterTargets(form.target)),
          tags: csvToList(form.tags),
          space: serializeMasterTags(parseMasterSpaces(form.space)),
          setupImageUrl: form.setupImageUrl,
          coachScript: form.coachScript,
          briefingNotes: form.briefingNotes,
          variationMethod: form.variations,
        })),
      });
      const json = await res.json() as {
        ok?: boolean;
        partialSave?: boolean;
        failedStage?: string;
        error?: string;
        program?: SavedAdminProgram<Partial<OverlayRow>, MetaRow>;
      };
      if (!res.ok || json.ok !== true) {
        const message = json.partialSave
          ? `일부 항목 저장 실패${json.failedStage ? ` (${json.failedStage})` : ''}. 다시 저장해 주세요.`
          : json.error ?? '저장에 실패했습니다.';
        throw new Error(message);
      }
      if (!json.program) throw new Error('저장된 프로그램 응답이 없습니다.');
      const next = mergeSavedProgram(selected, json.program);
      setItems((current) => replaceAdminProgramByCurriculumId(
        current,
        selected.curriculum.id,
        next,
        (item) => item.curriculum.id,
      ));
      setSelectedId(next.curriculum.id);
      setForm(toForm(next));
      toast.success('MASTER 편집 값이 저장되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const removeSetupImage = async () => {
    if (!selected || !form || !form.setupImageUrl.trim()) return;
    const previousForm = form;
    const previousImageUrl = form.setupImageUrl;
    const nextForm = { ...form, setupImageUrl: '' };

    setForm(nextForm);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/spokedu-master/programs?id=${selected.curriculum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAdminProgramSavePayload({
          title: nextForm.title,
          fallbackTitle: selected.curriculum.title,
          videoUrl: nextForm.videoUrl,
          equipment: nextForm.equipment,
          activityMethod: nextForm.steps,
          publicationStatus: nextForm.publicationStatus,
          theme: normalizeLessonTheme(nextForm.theme),
          target: serializeMasterTags(parseMasterTargets(nextForm.target)),
          tags: csvToList(nextForm.tags),
          space: serializeMasterTags(parseMasterSpaces(nextForm.space)),
          setupImageUrl: '',
          coachScript: nextForm.coachScript,
          briefingNotes: nextForm.briefingNotes,
          variationMethod: nextForm.variations,
        })),
      });
      const json = await res.json() as {
        ok?: boolean;
        partialSave?: boolean;
        failedStage?: string;
        error?: string;
        program?: SavedAdminProgram<Partial<OverlayRow>, MetaRow>;
      };
      if (!res.ok || json.ok !== true) {
        const message = json.partialSave
          ? `이미지 제거 저장 중 일부 단계가 실패했습니다${json.failedStage ? ` (${json.failedStage})` : ''}.`
          : json.error ?? '이미지 제거 저장에 실패했습니다.';
        throw new Error(message);
      }
      if (!json.program) throw new Error('저장된 프로그램 응답이 없습니다.');

      const next = mergeSavedProgram(selected, json.program);
      setItems((current) => replaceAdminProgramByCurriculumId(
        current,
        selected.curriculum.id,
        next,
        (item) => item.curriculum.id,
      ));
      setSelectedId(next.curriculum.id);
      setForm(toForm(next));

      const path = storagePathFromPublicUrl(previousImageUrl);
      if (path) await deleteFromStorage(path).catch(() => undefined);
      toast.success('도식화 이미지를 제거했습니다.');
    } catch (error) {
      setForm(previousForm);
      toast.error(error instanceof Error ? error.message : '이미지 제거에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedQuality = form ? getFormQuality(form) : null;
  const selectedQualitySummary = selectedQuality ? qualitySummary(selectedQuality) : '';

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/spokedu-master" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="이전">
            <ChevronLeft size={17} />
          </Link>
          <div>
            <h1 className="text-[18px] font-black">MASTER 수업 자료 편집기</h1>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">curriculum 원본은 보존하고 MASTER 메타와 운영 자료만 편집합니다.</p>
          </div>
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {ADMIN_TAB_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="h-8 rounded-md px-3 text-[12px] font-black transition-colors"
                style={{
                  background: activeTab === tab.key ? '#4f46e5' : 'transparent',
                  color: activeTab === tab.key ? '#ffffff' : '#475569',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'programs' ? (
            <>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={creating}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-[12px] font-black text-white disabled:opacity-50"
          >
            <Plus size={14} />
            프로그램 직접 추가
          </button>
          <button
            type="button"
            onClick={() => void syncFromCenter()}
            disabled={syncing || loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-800 disabled:opacity-50"
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
            </>
          ) : null}
        </div>
      </header>

      {activeTab === 'programs' ? <WeeklyRecommendationManager items={items} onSaved={load} /> : null}

      {createOpen ? (
        <CreateProgramModal
          form={createForm}
          creating={creating}
          onChange={updateCreateForm}
          onClose={closeCreateModal}
          onSubmit={() => void createProgram()}
        />
      ) : null}

      {activeTab === 'content-audit' ? (
        <ContentAuditPanel onOpenProgram={openProgramFromAudit} />
      ) : activeTab === 'spomove-thumbnails' ? (
        <SpomoveThumbnailManager />
      ) : activeTab === 'spomove-guide-videos' ? (
        <SpomoveGuideVideoManager />
      ) : (
      <main className="grid min-h-[calc(100dvh-73px)] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-[10px] font-black text-indigo-700">홈 가능</p>
                <p className="mt-1 text-[18px] font-black text-indigo-900">{summary.homeReady}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-[10px] font-black text-amber-700">보강 필요</p>
                <p className="mt-1 text-[18px] font-black text-amber-900">{summary.needsImprovement}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-[10px] font-black text-slate-600">이미지 필요</p>
                <p className="mt-1 text-[18px] font-black text-slate-900">{summary.imageNeeded}</p>
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

          <div className="max-h-[calc(100dvh-238px)] overflow-y-auto p-3">
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
                  <StatusPill status={getItemQuality(selected).status} />
                  <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-2.5 text-[11px] font-black text-slate-600">
                    {form.publicationStatus}
                    {selected.overlay?.is_published === true ? '' : ' · MASTER 미노출'}
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
                    <Field label="인원 구성">
                      <ChoiceChips
                        options={[...MASTER_PARTICIPANT_FORMATS]}
                        selected={getMasterParticipantFormat(csvToList(form.tags)) ? [getMasterParticipantFormat(csvToList(form.tags))] : []}
                        onChange={(next) => {
                          const selectedParticipant = next.at(-1) ?? '';
                          updateForm('tags', listToCsvValue(setMasterParticipantFormatTag(csvToList(form.tags), selectedParticipant)));
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
                        onRemove={() => void removeSetupImage()}
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
      )}
    </div>
  );
}
