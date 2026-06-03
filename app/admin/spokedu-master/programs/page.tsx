'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  Eye,
  Home,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

type MaterialStatus = 'incomplete' | 'needs-improvement' | 'ready' | 'home-ready';
type PublicationStatus = 'draft' | 'ready' | 'featured' | 'hidden';
type FilterKey = 'all' | 'incomplete' | 'ready' | 'home-ready' | 'image-needed' | 'safety-needed' | 'spomove-needed';

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
    safetyNotes: string[];
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
  setupNotes: string;
  briefingNotes: string;
  safetyNotes: string;
  steps: string;
  operationTips: string;
  easier: string;
  harder: string;
  variations: string;
  parentNote: string;
  relatedSpomoveIds: string;
  showHome: boolean;
  isHot: boolean;
  isNew: boolean;
  displayOrder: number;
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

const PUBLICATION_OPTIONS: PublicationStatus[] = ['draft', 'ready', 'featured', 'hidden'];
const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'incomplete', label: '미완성' },
  { key: 'ready', label: '운영 가능' },
  { key: 'home-ready', label: '홈 노출 가능' },
  { key: 'image-needed', label: '이미지 필요' },
  { key: 'safety-needed', label: '안전 포인트 필요' },
  { key: 'spomove-needed', label: 'SPOMOVE 연결 필요' },
];

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

function plainSectionFallback(source: string | null | undefined) {
  return (source ?? '')
    .split('\n')
    .filter((line) => !/^\[[^\]]+\]$/.test(line.trim()))
    .join('\n')
    .trim();
}

type QualityReport = {
  status: MaterialStatus;
  checks: {
    video: boolean;
    thumbnail: boolean;
    heroImage: boolean;
    setupImage: boolean;
    target: boolean;
    space: boolean;
    duration: boolean;
    equipment: boolean;
    setupNotes: boolean;
    steps: boolean;
    safety: boolean;
    variations: boolean;
    operationTips: boolean;
    parentNote: boolean;
    spomove: boolean;
    homeExposure: boolean;
  };
  reasons: string[];
};

function resolveStatus(checks: QualityReport['checks']): MaterialStatus {
  const coreReady = checks.target && checks.space && checks.equipment && checks.steps;
  if (!coreReady) return 'incomplete';

  const operationReady = checks.duration && coreReady;
  const hasHomeMedia = checks.video || checks.heroImage || checks.thumbnail;
  const homeReady = operationReady && hasHomeMedia && checks.safety && (checks.homeExposure || checks.duration);
  if (homeReady) return 'home-ready';

  const needsProductWork = checks.video && (!checks.heroImage || !checks.setupImage || !checks.safety || !checks.variations);
  if (needsProductWork) return 'needs-improvement';

  return 'ready';
}

function qualityReasons(checks: QualityReport['checks']) {
  const items: Array<[string, boolean]> = [
    ['영상', checks.video],
    ['썸네일', checks.thumbnail],
    ['대표 이미지', checks.heroImage],
    ['세팅 이미지', checks.setupImage],
    ['대상', checks.target],
    ['공간', checks.space],
    ['시간', checks.duration],
    ['준비물', checks.equipment],
    ['세팅 방법', checks.setupNotes],
    ['진행 순서', checks.steps],
    ['안전 포인트', checks.safety],
    ['난이도 조절', checks.variations],
    ['운영 팁', checks.operationTips],
    ['학부모 문구', checks.parentNote],
    ['SPOMOVE', checks.spomove],
    ['홈 노출', checks.homeExposure],
  ];
  return items.map(([label, ok]) => `${label} ${ok ? '있음' : '없음'}`);
}

function getItemQuality(item: ProgramItem): QualityReport {
  const meta = item.meta;
  const overlay = item.overlay;
  const checklist = overlay?.checklist ?? joinLines(item.curriculum.checklist);
  const activityTip = overlay?.activity_tip ?? '';
  const checks = {
    video: Boolean(item.effective.videoUrl),
    thumbnail: Boolean(meta?.sm_thumbnail_url),
    heroImage: Boolean(meta?.sm_hero_image_url),
    setupImage: Boolean(meta?.sm_setup_image_url),
    target: Boolean(item.effective.target),
    space: Boolean(item.effective.space),
    duration: Boolean(item.effective.duration),
    equipment: item.effective.equipment.length > 0,
    setupNotes: Boolean(extractSection(checklist, '세팅 방법')),
    steps: item.effective.steps.length > 0,
    safety: item.effective.safetyNotes.length > 0,
    variations: Boolean(extractSection(activityTip, '난이도 낮추기') || extractSection(activityTip, '난이도 높이기') || extractSection(activityTip, '응용 방법')),
    operationTips: Boolean(extractSection(activityTip, '운영 팁') || activityTip.trim()),
    parentNote: Boolean(item.effective.parentNote),
    spomove: item.effective.relatedSpomoveIds.length > 0,
    homeExposure: item.effective.publicationStatus === 'featured' || Boolean(meta?.sm_is_hot),
  };
  return { status: resolveStatus(checks), checks, reasons: qualityReasons(checks) };
}

function getFormQuality(form: EditForm): QualityReport {
  const checks = {
    video: Boolean(form.videoUrl.trim()),
    thumbnail: Boolean(form.thumbnailUrl.trim()),
    heroImage: Boolean(form.heroImageUrl.trim()),
    setupImage: Boolean(form.setupImageUrl.trim()),
    target: Boolean(form.target.trim()),
    space: Boolean(form.space.trim()),
    duration: Boolean(form.duration.trim()),
    equipment: splitLines(form.equipment).length > 0,
    setupNotes: Boolean(form.setupNotes.trim()),
    steps: splitLines(form.steps).length > 0,
    safety: Boolean(form.safetyNotes.trim()),
    variations: Boolean(form.easier.trim() || form.harder.trim() || form.variations.trim()),
    operationTips: Boolean(form.operationTips.trim()),
    parentNote: Boolean(form.parentNote.trim()),
    spomove: csvToList(form.relatedSpomoveIds).length > 0,
    homeExposure: form.showHome || form.publicationStatus === 'featured',
  };
  return { status: resolveStatus(checks), checks, reasons: qualityReasons(checks) };
}

function matchesFilter(item: ProgramItem, filter: FilterKey) {
  const quality = getItemQuality(item);
  if (filter === 'all') return true;
  if (filter === 'incomplete' || filter === 'ready' || filter === 'home-ready') return quality.status === filter;
  if (filter === 'image-needed') return !quality.checks.thumbnail || !quality.checks.heroImage || !quality.checks.setupImage;
  if (filter === 'safety-needed') return !quality.checks.safety;
  if (filter === 'spomove-needed') return !quality.checks.spomove;
  return true;
}

function toForm(item: ProgramItem): EditForm {
  const meta = item.meta;
  const overlay = item.overlay;
  const checklist = overlay?.checklist ?? joinLines(item.curriculum.checklist);
  const activityTip = overlay?.activity_tip ?? '';

  return {
    title: overlay?.title || item.curriculum.title,
    description: meta?.sm_coach_script || activityTip || '',
    objective: meta?.sm_objective || '',
    target: meta?.sm_grade || '',
    space: meta?.sm_space || '',
    duration: meta?.sm_duration ? String(meta.sm_duration) : '',
    theme: meta?.sm_theme || overlay?.main_theme || '',
    tags: listToCsv(meta?.sm_tags),
    videoUrl: overlay?.video_url || '',
    thumbnailUrl: meta?.sm_thumbnail_url || '',
    heroImageUrl: meta?.sm_hero_image_url || '',
    setupImageUrl: meta?.sm_setup_image_url || '',
    galleryImageUrls: (meta?.sm_gallery_image_urls ?? []).join('\n'),
    equipment: overlay?.equipment || joinLines(item.curriculum.equipment),
    setupNotes: extractSection(checklist, '세팅 방법'),
    briefingNotes: extractSection(checklist, '사전 교육'),
    safetyNotes: extractSection(checklist, '안전 포인트') || plainSectionFallback(checklist),
    steps: overlay?.activity_method || joinLines(item.curriculum.steps),
    operationTips: extractSection(activityTip, '운영 팁') || activityTip,
    easier: extractSection(activityTip, '난이도 낮추기'),
    harder: extractSection(activityTip, '난이도 높이기'),
    variations: extractSection(activityTip, '응용 방법'),
    parentNote: meta?.sm_parent_note || '',
    relatedSpomoveIds: listToCsv(meta?.sm_related_spomove_ids),
    showHome: Boolean(meta?.sm_is_hot && (meta.sm_display_order ?? 9999) < 100),
    isHot: Boolean(meta?.sm_is_hot),
    isNew: Boolean(meta?.sm_is_new),
    displayOrder: meta?.sm_display_order ?? item.curriculum.displayOrder ?? 999,
    publicationStatus: item.effective.publicationStatus,
    dashboardVisible: meta?.sm_is_pro ?? true,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      {children}
    </label>
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

function PreviewPane({ item, form }: { item: ProgramItem; form: EditForm }) {
  const title = form.title.trim() || item.curriculum.title;
  const tags = csvToList(form.tags).slice(0, 4);
  const equipment = splitLines(form.equipment).slice(0, 4);
  const steps = splitLines(form.steps).slice(0, 4);
  const safety = splitLines(form.safetyNotes).slice(0, 3);
  const mediaLabel = form.heroImageUrl || form.thumbnailUrl || form.videoUrl || item.curriculum.url || '미디어 URL 없음';

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-black text-slate-500">
          <Home size={14} />
          카드 미리보기
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="flex aspect-video items-center justify-center bg-slate-100 px-4 text-center text-[11px] font-bold text-slate-500">
            {mediaLabel}
          </div>
          <div className="p-3">
            <p className="line-clamp-2 text-[15px] font-black text-slate-950">{title}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-500">{form.target || '대상 미입력'} · {form.duration || '시간 미입력'}분</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">{tag}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-black text-slate-500">
          <Eye size={14} />
          모달 미리보기
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-[16px] font-black text-slate-950">{title}</p>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-600">{form.objective || form.description || '수업 목표 또는 설명이 필요합니다.'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
            <span>공간: {form.space || '미입력'}</span>
            <span>SPOMOVE: {form.relatedSpomoveIds || '없음'}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-black text-slate-500">
          <Settings size={14} />
          상세 페이지 미리보기
        </div>
        <div className="space-y-3 text-[12px] text-slate-700">
          <div>
            <p className="font-black text-slate-900">준비물</p>
            <p className="mt-1 font-semibold">{equipment.join(', ') || '미입력'}</p>
          </div>
          <div>
            <p className="font-black text-slate-900">진행 순서</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 font-semibold">
              {(steps.length ? steps : ['진행 순서 미입력']).map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
          <div>
            <p className="font-black text-slate-900">안전 포인트</p>
            <p className="mt-1 font-semibold">{safety.join(' / ') || '미입력'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminSmProgramsPage() {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/programs', { cache: 'no-store' });
      const json = (await res.json()) as ProgramsResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? '프로그램 목록을 불러오지 못했습니다.');
      setItems(json.data ?? []);
      if (json.data?.length && selectedId == null) {
        setSelectedId(json.data[0].curriculum.id);
        setForm(toForm(json.data[0]));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로그램 목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => items.find((item) => item.curriculum.id === selectedId) ?? null, [items, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesFilter(item, activeFilter)) return false;
      if (!q) return true;
      const haystack = `${item.effective.title} ${item.curriculum.id} ${item.effective.target} ${item.effective.space}`.toLowerCase();
      return haystack.includes(q);
    });
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

  const save = async () => {
    if (!selected || !form) return;
    setSaving(true);
    try {
      const checklist = [
        sectionText('세팅 방법', form.setupNotes),
        sectionText('사전 교육', form.briefingNotes),
        sectionText('안전 포인트', form.safetyNotes),
      ].filter(Boolean).join('\n');
      const activityTip = [
        sectionText('운영 팁', form.operationTips),
        sectionText('난이도 낮추기', form.easier),
        sectionText('난이도 높이기', form.harder),
        sectionText('응용 방법', form.variations),
      ].filter(Boolean).join('\n');

      const res = await fetch(`/api/admin/spokedu-master/programs?id=${selected.curriculum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: {
            sm_tags: csvToList(form.tags),
            sm_theme: form.theme.trim() || null,
            sm_grade: form.target.trim() || null,
            sm_space: form.space.trim() || null,
            sm_duration: form.duration.trim() ? Number(form.duration) : null,
            sm_is_pro: form.dashboardVisible,
            sm_is_new: form.isNew,
            sm_is_hot: form.showHome || form.isHot || form.publicationStatus === 'featured',
            sm_display_order: Number.isFinite(form.displayOrder) ? form.displayOrder : 999,
            sm_objective: form.objective.trim() || null,
            sm_development_focus: form.description.trim() || null,
            sm_coach_script: form.description.trim() || null,
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
            activity_tip: activityTip || form.operationTips.trim() || null,
            function_types: csvToList(form.tags),
            main_theme: form.theme.trim() || null,
            group_size: form.target.trim() || null,
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
      toast.success('MASTER 편집 값이 저장되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedQuality = form ? getFormQuality(form) : null;

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
            onClick={() => void load()}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-600"
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

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
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
              return (
                <button
                  key={item.curriculum.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  className="mb-2 block w-full rounded-lg border p-3 text-left transition-colors"
                  style={{ borderColor: selectedNow ? '#6366f1' : '#e2e8f0', background: selectedNow ? '#eef2ff' : '#ffffff' }}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-slate-950">{item.effective.title}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">curriculumId {item.curriculum.id}</p>
                    </div>
                    <StatusPill status={quality.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Flag ok={quality.checks.video} label="영상" />
                    <Flag ok={quality.checks.thumbnail} label="썸네일" />
                    <Flag ok={quality.checks.heroImage} label="대표" />
                    <Flag ok={quality.checks.setupImage} label="세팅 이미지" />
                    <Flag ok={quality.checks.target} label="대상" />
                    <Flag ok={quality.checks.space} label="공간" />
                    <Flag ok={quality.checks.duration} label="시간" />
                    <Flag ok={quality.checks.equipment} label="준비물" />
                    <Flag ok={quality.checks.setupNotes} label="세팅" />
                    <Flag ok={quality.checks.steps} label="순서" />
                    <Flag ok={quality.checks.safety} label="안전" />
                    <Flag ok={quality.checks.variations} label="난이도" />
                    <Flag ok={quality.checks.operationTips} label="운영 팁" />
                    <Flag ok={quality.checks.parentNote} label="학부모" />
                    <Flag ok={quality.checks.spomove} label="SPOMOVE" />
                    <Flag ok={quality.checks.homeExposure} label="홈" />
                  </div>
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
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">홈 노출 가능 조건</p>
                      <p className="mt-1 text-[12px] font-semibold text-slate-500">부족한 항목만 빠르게 확인합니다.</p>
                    </div>
                    <StatusPill status={selectedQuality.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedQuality.reasons.map((reason) => {
                      const ok = reason.endsWith('있음');
                      return <Flag key={reason} ok={ok} label={reason} />;
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><Sparkles size={16} />기본 정보</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="수업명"><TextInput value={form.title} onChange={(e) => updateForm('title', e.target.value)} /></Field>
                    <Field label="주제/테마"><TextInput value={form.theme} onChange={(e) => updateForm('theme', e.target.value)} /></Field>
                    <Field label="대상"><TextInput value={form.target} onChange={(e) => updateForm('target', e.target.value)} /></Field>
                    <Field label="공간"><TextInput value={form.space} onChange={(e) => updateForm('space', e.target.value)} /></Field>
                    <Field label="시간(분)"><TextInput type="number" min={0} value={form.duration} onChange={(e) => updateForm('duration', e.target.value)} /></Field>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <Field label="한 줄 설명"><TextArea rows={4} value={form.description} onChange={(e) => updateForm('description', e.target.value)} /></Field>
                    <Field label="수업 목표"><TextArea rows={5} value={form.objective} onChange={(e) => updateForm('objective', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><Video size={16} />미디어</h3>
                  <div className="grid gap-3">
                    <Field label="참고 영상 URL"><TextInput value={form.videoUrl} placeholder={selected.curriculum.url ?? 'curriculum.url fallback 없음'} onChange={(e) => updateForm('videoUrl', e.target.value)} /></Field>
                    <Field label="대표 이미지 URL"><TextInput value={form.heroImageUrl} onChange={(e) => updateForm('heroImageUrl', e.target.value)} placeholder="/images/spokedu-master/programs/.../hero.jpeg" /></Field>
                    <Field label="세팅 이미지 URL"><TextInput value={form.setupImageUrl} onChange={(e) => updateForm('setupImageUrl', e.target.value)} placeholder="/images/spokedu-master/programs/.../setup.jpeg" /></Field>
                  </div>
                  <p className="mt-3 text-[12px] font-semibold text-slate-500">썸네일을 따로 입력하지 않으면 대표 이미지, 영상 썸네일, 기존 fallback 순서로 사용됩니다.</p>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><ShieldAlert size={16} />수업 준비</h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="준비물"><TextArea rows={7} value={form.equipment} onChange={(e) => updateForm('equipment', e.target.value)} /></Field>
                    <Field label="세팅 방법"><TextArea rows={7} value={form.setupNotes} onChange={(e) => updateForm('setupNotes', e.target.value)} /></Field>
                    <Field label="활동 전 사전 교육"><TextArea rows={6} value={form.briefingNotes} onChange={(e) => updateForm('briefingNotes', e.target.value)} /></Field>
                    <Field label="안전 포인트"><TextArea rows={6} value={form.safetyNotes} onChange={(e) => updateForm('safetyNotes', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><CheckCircle2 size={16} />수업 운영</h3>
                  <div className="grid gap-4">
                    <Field label="활동 방법"><TextArea rows={12} value={form.steps} onChange={(e) => updateForm('steps', e.target.value)} /></Field>
                    <Field label="응용 방법"><TextArea rows={9} value={form.variations} onChange={(e) => updateForm('variations', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-black"><Home size={16} />학부모 문구와 노출 설정</h3>
                  <Field label="학부모 설명 문구"><TextArea rows={7} value={form.parentNote} onChange={(e) => updateForm('parentNote', e.target.value)} /></Field>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="자료 상태">
                      <select value={form.publicationStatus} onChange={(e) => updateForm('publicationStatus', e.target.value as PublicationStatus)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-black">
                        {PUBLICATION_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </Field>
                    <Field label="display order"><TextInput type="number" value={form.displayOrder} onChange={(e) => updateForm('displayOrder', Number(e.target.value))} /></Field>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      ['showHome', '홈 노출'],
                      ['isHot', 'HOT'],
                      ['isNew', 'NEW'],
                      ['dashboardVisible', 'Dashboard 노출'],
                    ].map(([key, label]) => (
                      <label key={key} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] font-black text-slate-700">
                        <input type="checkbox" checked={Boolean(form[key as keyof EditForm])} onChange={(e) => updateForm(key as keyof EditForm, e.target.checked as never)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </section>

                <details className="rounded-lg border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer text-[15px] font-black text-slate-900">고급 설정</summary>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <Field label="썸네일 이미지 URL"><TextInput value={form.thumbnailUrl} onChange={(e) => updateForm('thumbnailUrl', e.target.value)} placeholder="/images/spokedu-master/programs/.../thumb.jpeg" /></Field>
                    <Field label="갤러리 이미지 URL(줄바꿈 또는 쉼표 구분)"><TextArea rows={5} value={form.galleryImageUrls} onChange={(e) => updateForm('galleryImageUrls', e.target.value)} placeholder="/images/.../scene-1.jpeg&#10;/images/.../scene-2.jpeg" /></Field>
                    <Field label="관련 SPOMOVE preset/drill"><TextArea rows={5} value={form.relatedSpomoveIds} onChange={(e) => updateForm('relatedSpomoveIds', e.target.value)} placeholder="reactTrain, simon" /></Field>
                    <Field label="운영 팁"><TextArea rows={5} value={form.operationTips} onChange={(e) => updateForm('operationTips', e.target.value)} /></Field>
                    <Field label="난이도 낮추기"><TextArea rows={5} value={form.easier} onChange={(e) => updateForm('easier', e.target.value)} /></Field>
                    <Field label="난이도 높이기"><TextArea rows={5} value={form.harder} onChange={(e) => updateForm('harder', e.target.value)} /></Field>
                    <Field label="세부 태그(쉼표 구분)"><TextInput value={form.tags} onChange={(e) => updateForm('tags', e.target.value)} /></Field>
                  </div>
                </details>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-[12px] font-black text-amber-900"><ImageIcon size={15} />저장 메모</p>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-amber-800">
                      영상은 `spokedu_pro_programs.video_url`에 저장됩니다. 비워두면 `/api/spokedu-master/programs`가 `curriculum.url`을 fallback으로 사용합니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-[12px] font-black text-slate-500">원본 보존</p>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-600">
                      이 화면은 `curriculum`을 update하지 않습니다. 저장은 MASTER 메타와 PRO 운영 overlay에만 반영됩니다.
                    </p>
                  </div>
                </div>

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
