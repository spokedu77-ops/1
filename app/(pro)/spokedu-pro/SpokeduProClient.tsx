'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, X, Gamepad2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import './styles/spokedu-pro.css';
import { useSpokeduProUI, type ViewId } from './hooks/useSpokeduProUI';
import { useSpokeduProContent } from './hooks/useSpokeduProContent';
import { useSpokeduProAdminBlocks } from './hooks/useSpokeduProContent';
import type { ProgramDetail } from './types';
import SpokeduProAside from './components/SpokeduProAside';
import SubscriberWorkspaceBar from './components/SubscriberWorkspaceBar';
import RoadmapView from './views/RoadmapView';
import type { ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { SpokeduProErrorBoundary } from './components/SpokeduProErrorBoundary';
import { useProContext } from './hooks/useProContext';
import { trackSpokeduProEvent } from './utils/spokeduProAnalytics';
import { setTodayClassPhase } from './utils/todayClassStorage';
import {
  getSpomoveLaunchParams,
  mergeScreenplayProgramDetailForDrawer,
  screenplayDetailStorageKey,
  type ScreenplayMeta,
} from './utils/spomoveLaunch';
import { resolveScreenplayTagMappingV1, getScreenplayLevelTag } from './utils/screenplayTagMapping';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';
import type { ProgramLessonDetailInList, SpokeduProOpenDetailContext } from './programDrawerContext';

const SpokeduProToolkit = dynamic(() => import('./components/SpokeduProToolkit'), { ssr: false });
const SpokeduProDrawer = dynamic(() => import('./components/SpokeduProDrawer'), { ssr: false });
const DashboardCurationEditor = dynamic(() => import('./components/DashboardCurationEditor'), { ssr: false });
const LibraryView = dynamic(() => import('./views/LibraryView'), { ssr: false });
const ShopView = dynamic(() => import('./views/ShopView'), { ssr: false });
const DataCenterView = dynamic(() => import('./views/DataCenterView'), { ssr: false });
const AIReportView = dynamic(() => import('./views/AIReportView'), { ssr: false });
const AssistantToolsView = dynamic(() => import('./views/AssistantToolsView'), { ssr: false });
const SettingsView = dynamic(() => import('./views/SettingsView'), { ssr: false });
const LessonPlanView = dynamic(() => import('./views/LessonPlanView'), { ssr: false });
const OnboardingWizard = dynamic(() => import('./components/OnboardingWizard'), { ssr: false });
const PostClassModal = dynamic(() => import('./components/PostClassModal'), { ssr: false });

export default function SpokeduProClient({
  isEditMode = false,
  onViewChange,
}: {
  isEditMode?: boolean;
  onViewChange?: (viewId: ViewId) => void;
}) {
  const tr = useTranslator();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const { viewId, switchView } = useSpokeduProUI('roadmap');
  const { ctx, loading: ctxLoading, refresh } = useProContext();
  const loginSuccessTracked = useRef(false);
  const [mountedViews, setMountedViews] = useState<Record<ViewId, true>>(
    () => ({ roadmap: true } as Record<ViewId, true>)
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('onboardingDismissed')
  );
  const showOnboarding =
    !ctxLoading &&
    !ctx.contextLoadError &&
    ctx.dbReady !== false &&
    ctx.activeCenterId === null &&
    !onboardingDismissed;

  const switchViewWithMount = useCallback(
    (next: ViewId) => {
      setMountedViews((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
      switchView(next);
    },
    [switchView]
  );

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toast.success(tr('寃곗젣媛 ?꾨즺?섏뿀?듬땲?? 援щ룆 ?뺣낫瑜?媛깆떊?⑸땲??'));
      void refresh();
    } else if (checkout === 'cancel') {
      toast.message(tr('寃곗젣瑜?痍⑥냼?덉뒿?덈떎.'));
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.pathname + url.search);
    } catch {
      /* ignore */
    }
  }, [searchParams, tr, refresh]);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v !== 'settings') return;
    switchViewWithMount('settings');
    void refresh();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      const qs = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}`);
    } catch {
      /* ignore */
    }
  }, [searchParams, switchViewWithMount, refresh]);

  const [toolkitOpen, setToolkitOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (toolkitOpen) {
      document.documentElement.setAttribute('data-sp-toolkit-open', '1');
    } else {
      document.documentElement.removeAttribute('data-sp-toolkit-open');
    }
    return () => {
      document.documentElement.removeAttribute('data-sp-toolkit-open');
    };
  }, [toolkitOpen]);
  const [drawerProgramId, setDrawerProgramId] = useState<number | null>(null);
  const [drawerContext, setDrawerContext] = useState<SpokeduProOpenDetailContext | null>(null);
  /** ?쇱씠釉뚮윭由??꾨줈洹몃옩 諭낇겕) ???꾩슜 ?곸꽭 紐⑤떖 ??濡쒕뱶留??깃낵 遺꾨━ */
  const [libraryDrawerProgramId, setLibraryDrawerProgramId] = useState<number | null>(null);
  const [libraryDrawerContext, setLibraryDrawerContext] = useState<SpokeduProOpenDetailContext | null>(null);
  const [screenplayById, setScreenplayById] = useState<Record<number, ScreenplayMeta>>({});
  const [screenplaysRefreshToken, setScreenplaysRefreshToken] = useState(0);
  const [libraryPreset, setLibraryPreset] = useState<{ themeKey?: string; preset?: string } | null>(null);
  /** ?쇱씠釉뚮윭由?吏꾩엯 ??????⑦궎吏 鍮좊Ⅸ ?꾪꽣(??쒕낫???⑦궎吏 移대뱶 ?? */
  const [libraryLessonNav, setLibraryLessonNav] = useState<{
    featuredLesson?: boolean;
    packageKey?: string;
  } | null>(null);
  const [libraryMode, setLibraryMode] = useState<'program' | 'screenplay'>('program');
  const [showCurationDrawer, setShowCurationDrawer] = useState(false);
  const [postClassGroup, setPostClassGroup] = useState<string | null>(null);
  const [aiInitialStudentId, setAiInitialStudentId] = useState<string | null>(null);
  const [toolsFocusToken, setToolsFocusToken] = useState(0);
  const [memoryGameModal, setMemoryGameModal] = useState<{
    open: boolean;
    mode: string;
    level: number;
    headline?: string;
    subtitleLine?: string;
    body?: string;
    modeIdLabel?: string;
    /** ?쇱씠釉뚮윭由?移대뱶? ?숈씪: ?몄??곸뿭쨌怨쇱젣쨌?덈꺼 */
    tagChips?: string[];
  }>({
    open: false,
    mode: 'basic',
    level: 1,
  });

  const { data: contentData, fetchContent } = useSpokeduProContent('catalog', [
    'program_details',
    'screenplay_tag_mapping_v1',
  ]);
  const { content: adminContent, fetchBlocks, saveContentDraft } = useSpokeduProAdminBlocks();

  const scheduleIdle = useCallback((fn: () => void) => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(fn, { timeout: 1500 });
      return;
    }
    window.setTimeout(fn, 250);
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);
  useEffect(() => {
    if (isEditMode) {
      scheduleIdle(() => void fetchBlocks());
    }
  }, [isEditMode, fetchBlocks, scheduleIdle]);

  useEffect(() => {
    if (viewId !== 'library') {
      setLibraryPreset(null);
      setLibraryLessonNav(null);
      setLibraryMode('program');
      setLibraryDrawerProgramId(null);
      setLibraryDrawerContext(null);
    }
  }, [viewId]);

  useEffect(() => {
    onViewChange?.(viewId);
  }, [viewId, onViewChange]);

  useEffect(() => {
    if (ctxLoading || ctx.contextLoadError) return;
    if (loginSuccessTracked.current) return;
    loginSuccessTracked.current = true;
    trackSpokeduProEvent('spokedu_pro_login_success', {
      hasCenter: Boolean(ctx.activeCenterId),
      plan: ctx.entitlement.plan,
    });
  }, [ctxLoading, ctx.contextLoadError, ctx.activeCenterId, ctx.entitlement.plan]);

  useEffect(() => {
    if (ctxLoading) return;
    const byView: Partial<Record<ViewId, string>> = {
      roadmap: 'spokedu_pro_dashboard_view',
      shop: 'spokedu_pro_shop_view',
      tools: 'spokedu_pro_assistant_open',
      settings: 'spokedu_pro_settings_view',
    };
    const name = byView[viewId];
    if (name) trackSpokeduProEvent(name, { viewId });
  }, [ctxLoading, viewId]);

  const [programsFromApi, setProgramsFromApi] = useState<
    Array<{
      id: number;
      title: string;
      video_url?: string | null;
      function_type?: string | null;
      main_theme?: string | null;
      group_size?: string | null;
      checklist?: string | null;
      equipment?: string | null;
      activity_method?: string | null;
      activity_tip?: string | null;
      lesson_detail?: ProgramLessonDetailInList;
    }>
  >([]);
  const [programsRefreshToken, setProgramsRefreshToken] = useState(0);
  const [programsListReady, setProgramsListReady] = useState(false);
  const refreshProgramsFromApi = useCallback(async () => {
    try {
      const res = await fetch('/api/spokedu-pro/programs?limit=200', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json?.data)) setProgramsFromApi(json.data);
      else setProgramsFromApi([]);
    } catch {
      setProgramsFromApi([]);
    } finally {
      setProgramsListReady(true);
    }
  }, []);

  const mergeProgramsFromResponse = useCallback(
    (rows: Array<(typeof programsFromApi)[number]>) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      setProgramsFromApi((prev) => {
        const map = new Map(prev.map((r) => [r.id, { ...r }]));
        for (const row of rows) {
          if (typeof row?.id !== 'number' || !Number.isFinite(row.id)) continue;
          const cur = map.get(row.id);
          map.set(row.id, { ...(cur ?? ({} as (typeof programsFromApi)[number])), ...row });
        }
        return Array.from(map.values());
      });
    },
    []
  );
  useEffect(() => {
    let cancelled = false;
    scheduleIdle(() => {
      if (cancelled) return;
      void refreshProgramsFromApi();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshProgramsFromApi, scheduleIdle]);

  useEffect(() => {
    let cancelled = false;
    scheduleIdle(() => {
      if (cancelled) return;
      (async () => {
        try {
          const res = await fetch('/api/spokedu-pro/screenplays', { credentials: 'include' });
          const json = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (!res.ok || !Array.isArray(json?.screenplays)) {
            setScreenplayById({});
            return;
          }
          const next: Record<number, ScreenplayMeta> = {};
          for (const s of json.screenplays as Array<{
            id: number;
            modeId?: string;
            title?: string;
            subtitle?: string;
            description?: string;
            presetRef?: string;
            thumbnailUrl?: string;
          }>) {
            const id = Number(s.id);
            if (!Number.isFinite(id)) continue;
            next[id] = {
              title: s.title ?? `Screenplay #${id}`,
              modeId: s.modeId,
              subtitle: s.subtitle,
              description: s.description,
              presetRef: s.presetRef,
              thumbnailUrl: s.thumbnailUrl,
            };
          }
          setScreenplayById(next);
        } catch {
          if (!cancelled) setScreenplayById({});
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [screenplaysRefreshToken, scheduleIdle]);

  useEffect(() => {
    const bump = () => setScreenplaysRefreshToken((t) => t + 1);
    window.addEventListener('spokedu-pro-screenplays-synced', bump);
    return () => window.removeEventListener('spokedu-pro-screenplays-synced', bump);
  }, []);

  useEffect(() => {
    if (!memoryGameModal.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMemoryGameModal((m) => ({ ...m, open: false }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [memoryGameModal.open]);

  const programDetailsFromApi = useMemo(() => {
    const out: Record<string, ProgramDetail> = {};
    programsFromApi.forEach((row) => {
      const functionTypes =
        Array.isArray((row as { function_types?: unknown }).function_types)
          ? ((row as { function_types?: string[] }).function_types ?? []).filter(
              (x): x is string => typeof x === 'string' && x.trim() !== ''
            )
          : (row.function_type ? [row.function_type] : []);
      out[String(row.id)] = {
        title: stripMonthWeekPrefix(row.title),
        videoUrl: row.video_url ?? undefined,
        functionTypes: functionTypes.length > 0 ? functionTypes : undefined,
        functionType: row.function_type ?? undefined,
        mainTheme: row.main_theme ?? undefined,
        checklist: row.checklist ?? undefined,
        equipment: row.equipment ?? undefined,
        activityMethod: row.activity_method ?? undefined,
        activityTip: row.activity_tip ?? undefined,
      };
    });
    return out;
  }, [programsFromApi]);

  const programDetails = (contentData?.program_details?.value ?? {}) as Record<string, ProgramDetail>;
  const adminProgramDetails = (adminContent?.program_details?.draft_value ?? {}) as Record<string, ProgramDetail>;
  const contentDetails = isEditMode ? adminProgramDetails : programDetails;
  /**
   * DB(?꾨줈洹몃옩 API)媛 理쒖떊 ?뚯뒪?대?濡? catalog content(program_details)??"蹂댁셿???쇰줈留??ъ슜.
   * - ?쇳꽣 而ㅻ━?섎읆 import ?깆쑝濡?DB媛 媛깆떊?섎㈃ 利됱떆 諛섏쁺?섏뼱????   * - 怨쇨굅??content濡???뼱??媛믪씠 ?⑥븘 ?낅뜲?댄듃媛 ????寃껋쿂??蹂댁씠??臾몄젣 諛⑹?
   */
  const programDetailsForDrawer = useMemo(
    () => ({ ...contentDetails, ...programDetailsFromApi }),
    [programDetailsFromApi, contentDetails]
  );
  const screenplayTagMappingForDrawer = useMemo(
    () => resolveScreenplayTagMappingV1(contentData?.screenplay_tag_mapping_v1?.value),
    [contentData?.screenplay_tag_mapping_v1?.value]
  );
  const libraryDrawerOpen = viewId === 'library' && libraryDrawerProgramId !== null;
  const globalDrawerOpen = drawerProgramId !== null;
  const globalScreenplayDrawer = drawerProgramId !== null && drawerContext?.screenplay === true;
  const resolvedDrawerProgramId = libraryDrawerOpen ? libraryDrawerProgramId : drawerProgramId;
  const resolvedDrawerContext = libraryDrawerOpen ? libraryDrawerContext : drawerContext;
  const drawerIsScreenplay =
    (libraryDrawerOpen && libraryDrawerContext?.screenplay === true) || globalScreenplayDrawer;
  const screenplayOverlayDetail =
    drawerIsScreenplay && resolvedDrawerProgramId != null
      ? programDetailsForDrawer[screenplayDetailStorageKey(resolvedDrawerProgramId)]
      : undefined;

  const computeScreenplayDisplayTags = useCallback(
    (
      sp: ScreenplayMeta | undefined,
      row?: {
        mode_id?: string | null;
        preset_ref?: string | null;
      } | null
    ) => {
      const modeId = String(sp?.modeId ?? row?.mode_id ?? '');
      const presetRef = sp?.presetRef ?? row?.preset_ref ?? null;
      const entry = screenplayTagMappingForDrawer.modeIdMap[modeId];
      const domainTag = entry?.domainLabel ?? tr('?몄??곸뿭');
      const taskTag = entry?.taskLabel ?? (modeId || tr('怨쇱젣?좏삎'));
      const levelTag = getScreenplayLevelTag(presetRef, screenplayTagMappingForDrawer.levelLabelTemplate);
      return [domainTag, taskTag, levelTag].filter(Boolean) as string[];
    },
    [screenplayTagMappingForDrawer, tr]
  );

  const screenplayDrawerTags = useMemo(() => {
    if (!drawerIsScreenplay || resolvedDrawerProgramId == null) {
      return undefined;
    }
    const sp = screenplayById[resolvedDrawerProgramId];
    const row = libraryDrawerOpen ? libraryDrawerContext?.row : drawerContext?.row;
    const chips = computeScreenplayDisplayTags(sp, row ?? undefined);
    return chips.length > 0 ? chips : undefined;
  }, [
    drawerIsScreenplay,
    libraryDrawerOpen,
    libraryDrawerContext?.row,
    drawerContext?.row,
    resolvedDrawerProgramId,
    screenplayById,
    computeScreenplayDisplayTags,
  ]);

  const drawerProgramDetail = useMemo(() => {
    if (resolvedDrawerProgramId == null) return null;
    if (drawerIsScreenplay) {
      const sp = screenplayById[resolvedDrawerProgramId];
      return mergeScreenplayProgramDetailForDrawer(sp, screenplayOverlayDetail);
    }
    const fromMap = programDetailsForDrawer[String(resolvedDrawerProgramId)] ?? null;
    if (fromMap) return fromMap;
    const snap = libraryDrawerContext?.row;
    if (!snap) return null;
    // 紐⑸줉?먯꽌 ?섍릿 row濡?理쒖냼?쒖쓽 ?곸꽭瑜?援ъ꽦??placeholder(?꾨줈洹몃옩 #id) 諛⑹?
    const fnTypes =
      Array.isArray(snap.function_types) && snap.function_types.length > 0
        ? snap.function_types.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        : (snap.function_type ? [snap.function_type] : []);
    return {
      title: snap.title ?? undefined,
      videoUrl: snap.video_url ?? undefined,
      functionTypes: fnTypes.length > 0 ? fnTypes : undefined,
      functionType: snap.function_type ?? undefined,
      mainTheme: snap.main_theme ?? undefined,
    };
  }, [
    resolvedDrawerProgramId,
    drawerIsScreenplay,
    libraryDrawerContext?.row,
    screenplayById,
    screenplayOverlayDetail,
    programDetailsForDrawer,
  ]);

  const handleSaveProgramDetail = useCallback(
    async (programId: number, detail: ProgramDetail, opts?: { screenplay?: boolean }) => {
      // ?ㅽ겕由고뵆?덉씠??content(釉붾줉)濡???? ?꾨줈洹몃옩(?묒뀛??臾대툕)? DB濡???ν븳??
      if (opts?.screenplay) {
        const entry = adminContent?.program_details;
        const current = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
        const key = screenplayDetailStorageKey(programId);
        const next = { ...current, [key]: detail };
        const version = entry?.version ?? 0;
        const result = await saveContentDraft('program_details', next, version);
        if (result.ok) {
          toast.success(tr('?섏젙?섏뿀?듬땲??'));
          await fetchContent();
          await fetchBlocks();
        } else {
          toast.error(tr(`????ㅽ뙣: ${result.error ?? '?????녿뒗 ?ㅻ쪟'}`));
        }
        return;
      }

      // DB ???(spokedu_pro_programs)
      const fnTypes = Array.isArray(detail.functionTypes)
        ? detail.functionTypes.map((x) => String(x).trim()).filter(Boolean)
        : [];
      const fallbackFnType = detail.functionType?.trim();
      const primaryFnType = fnTypes[0] ?? fallbackFnType;
      const payload = {
        title: detail.title,
        video_url: detail.videoUrl,
        function_types: fnTypes.length > 0 ? fnTypes : undefined,
        function_type: primaryFnType || undefined,
        main_theme: detail.mainTheme,
        checklist: detail.checklist,
        equipment: detail.equipment,
        activity_method: detail.activityMethod,
        activity_tip: detail.activityTip,
      };
      const res = await fetch(`/api/spokedu-pro/programs?id=${encodeURIComponent(String(programId))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(tr(`????ㅽ뙣: ${j.error ?? `HTTP ${res.status}`}`));
        return;
      }
      toast.success(tr('?섏젙?섏뿀?듬땲??'));
      // DB媛 怨㏓컮濡?理쒖떊 ?뚯뒪?대?濡? ?붾㈃ 諛섏쁺???꾪빐 ?ㅼ떆 fetch
      await fetchContent();
      await fetchBlocks();
      await refreshProgramsFromApi();
      setProgramsRefreshToken((t) => t + 1);
    },
    [adminContent?.program_details, saveContentDraft, fetchContent, fetchBlocks, tr, refreshProgramsFromApi]
  );

  const drawerLessonDetail = useMemo(() => {
    if (drawerIsScreenplay || resolvedDrawerProgramId == null) return null;
    const row = programsFromApi.find((r) => r.id === resolvedDrawerProgramId);
    return row?.lesson_detail ?? null;
  }, [drawerIsScreenplay, resolvedDrawerProgramId, programsFromApi]);

  const openDrawer = useCallback(
    (id: number, context?: SpokeduProOpenDetailContext) => {
      trackSpokeduProEvent('spokedu_pro_week_card_open', {
        programId: id,
        source: context?.screenplay ? 'dashboard_screenplay_drawer' : 'dashboard_drawer',
        role: context?.role,
        themeKey: context?.themeKey,
      });
      setDrawerProgramId(id);
      setDrawerContext(context ?? null);
      if (!context?.screenplay) {
        if (context?.row?.lesson_detail) {
          mergeProgramsFromResponse([
            {
              id,
              title: String(context.row.title ?? ''),
              video_url: context.row.video_url ?? null,
              function_type: context.row.function_type ?? null,
              function_types: context.row.function_types ?? undefined,
              main_theme: context.row.main_theme ?? null,
              group_size: context.row.group_size ?? null,
              lesson_detail: context.row.lesson_detail,
            } as (typeof programsFromApi)[number],
          ]);
        } else {
          void (async () => {
            try {
              const res = await fetch(
                `/api/spokedu-pro/programs?curriculumIds=${encodeURIComponent(String(id))}&limit=5`,
                { credentials: 'include' }
              );
              const json = (await res.json().catch(() => ({}))) as { data?: unknown };
              if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
                mergeProgramsFromResponse(json.data as (typeof programsFromApi)[number][]);
              }
            } catch {
              /* drawer??湲곗〈 ?곗씠?곕줈 ?대┝ */
            }
          })();
        }
      }
    },
    [mergeProgramsFromResponse]
  );
  const openLibraryProgramDetail = useCallback(
    (id: number, context?: SpokeduProOpenDetailContext) => {
      trackSpokeduProEvent('spokedu_pro_week_card_open', {
        programId: id,
        source: context?.screenplay ? 'library_screenplay_drawer' : 'library_program_drawer',
        role: context?.role,
        themeKey: context?.themeKey,
      });
      setLibraryDrawerProgramId(id);
      setLibraryDrawerContext(context ?? null);
      if (!context?.screenplay) {
        if (context?.row?.lesson_detail) {
          mergeProgramsFromResponse([
            {
              id,
              title: String(context.row.title ?? ''),
              video_url: context.row.video_url ?? null,
              function_type: context.row.function_type ?? null,
              function_types: context.row.function_types ?? undefined,
              main_theme: context.row.main_theme ?? null,
              group_size: context.row.group_size ?? null,
              lesson_detail: context.row.lesson_detail,
            } as (typeof programsFromApi)[number],
          ]);
        } else {
          void (async () => {
            try {
              const res = await fetch(
                `/api/spokedu-pro/programs?curriculumIds=${encodeURIComponent(String(id))}&limit=5`,
                { credentials: 'include' }
              );
              const json = (await res.json().catch(() => ({}))) as { data?: unknown };
              if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
                mergeProgramsFromResponse(json.data as (typeof programsFromApi)[number][]);
              }
            } catch {
              /* drawer??湲곗〈 ?곗씠?곕줈 ?대┝ */
            }
          })();
        }
      }
    },
    [mergeProgramsFromResponse]
  );
  const closeProgramDrawer = useCallback(() => {
    setDrawerProgramId(null);
    setDrawerContext(null);
  }, []);
  const closeLibraryProgramDrawer = useCallback(() => {
    setLibraryDrawerProgramId(null);
    setLibraryDrawerContext(null);
  }, []);
  const goToLibrary = useCallback(
    (
      themeKey?: string,
      preset?: string,
      extra?: { packageKey?: string; featuredLesson?: boolean }
    ) => {
      const hasLessonNav = Boolean(extra?.packageKey || extra?.featuredLesson);
      const effectiveTheme = themeKey ?? (hasLessonNav ? 'co-op' : undefined);
      setLibraryPreset(effectiveTheme != null || preset != null ? { themeKey: effectiveTheme, preset } : null);
      setLibraryLessonNav(
        hasLessonNav
          ? { packageKey: extra?.packageKey, featuredLesson: extra?.featuredLesson }
          : null
      );
      setLibraryMode((effectiveTheme ?? 'co-op') === 'cognitive' ? 'screenplay' : 'program');
      switchViewWithMount('library');
    },
    [switchViewWithMount]
  );
  const openLibraryAll = useCallback(() => {
    setLibraryPreset(null);
    setLibraryLessonNav(null);
    setLibraryMode('program');
    switchViewWithMount('library');
  }, [switchViewWithMount]);
  const goToLibraryTheme = useCallback(
    (themeKey: ThemeKey) => {
      setLibraryLessonNav(null);
      setLibraryPreset({ themeKey });
      setLibraryMode(themeKey === 'cognitive' ? 'screenplay' : 'program');
      switchViewWithMount('library');
    },
    [switchViewWithMount]
  );

  return (
    <div
      ref={rootRef}
      className="spokedu-pro relative flex flex-col h-full w-full overflow-hidden bg-[var(--sp-pro-bg)] text-[#F8FAFC]"
    >
      <div className="sp-pro-bg-mesh" aria-hidden />
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            if (typeof window !== 'undefined') localStorage.setItem('onboardingDismissed', '1');
            setOnboardingDismissed(true);
            refresh();
          }}
          onDismiss={() => {
            if (typeof window !== 'undefined') localStorage.setItem('onboardingDismissed', '1');
            setOnboardingDismissed(true);
          }}
          onSwitchView={switchViewWithMount}
        />
      )}
      <SpokeduProErrorBoundary>
      <div className="relative z-10 flex flex-1 min-h-0 w-full max-w-none">
      <SpokeduProAside
        viewId={viewId}
        onSwitchView={switchViewWithMount}
        onOpenLibraryAll={openLibraryAll}
        onGoToLibraryTheme={goToLibraryTheme}
        libraryActiveThemeKey={libraryPreset?.themeKey ?? null}
        libraryMode={libraryMode}
        onOpenSpomove={isEditMode ? undefined : () => goToLibraryTheme('cognitive')}
        isEditMode={isEditMode}
        onOpenCurationDrawer={isEditMode ? () => setShowCurationDrawer(true) : undefined}
      />
      <main className="flex-1 w-full max-w-full min-w-0 h-full overflow-y-auto overflow-x-hidden custom-scroll relative bg-transparent min-h-0 pr-0 mr-0">
        {!ctxLoading && !ctx.contextLoadError && ctx.entitlement.status === 'past_due' && (
          <div className="sticky top-0 z-[25] flex flex-wrap items-center gap-3 px-4 py-3 bg-rose-600 border-b-2 border-rose-400 border-l-4 border-l-rose-200 text-white text-sm shadow-lg shadow-rose-900/40">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-700/60 ring-1 ring-rose-300/40 text-base font-black">!</span>
            <p className="flex-1 min-w-[200px] font-semibold leading-snug">
              {tr('寃곗젣媛 吏?곕맂 ?곹깭?낅땲?? ?뚮옖 & 寃곗젣?먯꽌 移대뱶瑜?媛깆떊?섍굅??寃곗젣瑜??ㅼ떆 ?쒕룄??二쇱꽭??')}
            </p>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => switchView('settings')}
                className="inline-flex min-h-[40px] items-center px-3 py-2 rounded-lg bg-white text-rose-700 text-xs font-bold hover:bg-rose-50"
              >
                {tr('?뚮옖 & 寃곗젣濡??대룞')}
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-[40px] items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-800/70 hover:bg-rose-800 text-white text-xs font-bold ring-1 ring-rose-300/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {tr('상태 새로고침')}
              </button>
            </div>
          </div>
        )}
        {!ctxLoading && ctx.contextLoadError && (
          <div className="sticky top-0 z-[25] flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-500 border-b-2 border-amber-300 border-l-4 border-l-amber-100 text-amber-950 text-sm shadow-lg shadow-amber-900/30">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600/40 ring-1 ring-amber-700/30 text-base font-black">!</span>
            <p className="flex-1 min-w-[200px] font-semibold leading-snug">{tr(ctx.contextLoadError)}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-50 text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {tr('다시 시도')}
              </button>
              {(ctx.contextLoadError?.includes('로그인') ?? false) && (
                <Link
                  href="/login"
                  className="text-xs font-bold text-amber-950 underline underline-offset-2"
                >
                  {tr('로그인')}
                </Link>
              )}
            </div>
          </div>
        )}
        {!isEditMode && (
          <SubscriberWorkspaceBar
            activeView={viewId}
            plan={ctx.entitlement.plan}
            status={ctx.entitlement.status}
            programCount={programsFromApi.length}
            programLibraryReady={programsListReady}
            onGoToday={() => switchViewWithMount('roadmap')}
            onGoPlan={() => switchViewWithMount('lesson-plan')}
            onGoLibrary={openLibraryAll}
            onGoSpomove={() => goToLibraryTheme('cognitive')}
            onGoReport={() => switchViewWithMount('ai')}
            onGoBilling={() => switchViewWithMount('settings')}
          />
        )}
        <div className={`view-content ${viewId === 'roadmap' ? 'active' : ''}`}>
          <RoadmapView
            onOpenDetail={openDrawer}
            onGoToLibrary={goToLibrary}
            isEditMode={isEditMode}
            programDetails={programDetailsForDrawer}
            programLibraryCount={programsFromApi.length}
            programLibraryReady={programsListReady}
            onOpenPlanBilling={() => switchViewWithMount('settings')}
            onStartTodayClass={() => {
              setToolsFocusToken((t) => t + 1);
              switchViewWithMount('tools');
            }}
            onOpenPostClass={(name) => setPostClassGroup(name)}
            onGoToAIReportFromToday={() => switchViewWithMount('ai')}
            onAddClassFromToday={() => switchViewWithMount('data-center')}
            onGoToAssistantTools={() => {
              setToolsFocusToken((t) => t + 1);
              switchViewWithMount('tools');
            }}
          />
        </div>
        {mountedViews['lesson-plan'] && (
          <div className={`view-content ${viewId === 'lesson-plan' ? 'active' : ''}`}>
            <LessonPlanView programDetails={programDetailsForDrawer} />
          </div>
        )}
        {mountedViews['library'] && (
          <div className={`view-content ${viewId === 'library' ? 'active' : ''}`}>
            <LibraryView
              onOpenDetail={openLibraryProgramDetail}
              initialPreset={libraryPreset}
              libraryLessonNav={libraryLessonNav}
              onClearLibraryLessonNav={() => setLibraryLessonNav(null)}
              programDetails={programDetailsForDrawer}
              functionalCap={isEditMode ? 144 : undefined}
              libraryMode={libraryMode}
              refreshToken={programsRefreshToken}
              isEditMode={isEditMode}
              screenplaysRefreshToken={screenplaysRefreshToken}
            />
          </div>
        )}
        {mountedViews['shop'] && (
          <div className={`view-content ${viewId === 'shop' ? 'active' : ''}`}>
            <ShopView />
          </div>
        )}
        {mountedViews['data-center'] && (
          <div className={`view-content ${viewId === 'data-center' ? 'active' : ''}`}>
            <DataCenterView
              onOpenSettings={() => switchViewWithMount('settings')}
              onGoToAssistantTools={() => {
                setToolsFocusToken((t) => t + 1);
                switchViewWithMount('tools');
              }}
            />
          </div>
        )}
        {mountedViews['ai'] && (
          <div className={`view-content ${viewId === 'ai' ? 'active' : ''}`}>
            <AIReportView
              initialStudentId={aiInitialStudentId}
              onConsumeInitialStudent={() => setAiInitialStudentId(null)}
            />
          </div>
        )}
        {mountedViews['tools'] && (
          <div className={`view-content ${viewId === 'tools' ? 'active' : ''}`}>
            <AssistantToolsView
              focusStopwatchToken={toolsFocusToken}
              onGoToDataCenter={() => switchViewWithMount('data-center')}
            />
          </div>
        )}
        {mountedViews['settings'] && (
          <div className={`view-content ${viewId === 'settings' ? 'active' : ''}`}>
            <SettingsView />
          </div>
        )}
      </main>
      </div>

      <SpokeduProToolkit
        open={toolkitOpen}
        onToggle={() => setToolkitOpen((o) => !o)}
        onOpenToolsView={() => switchViewWithMount('tools')}
      />

      <SpokeduProDrawer
        open={(libraryDrawerOpen || globalDrawerOpen) && !showCurationDrawer}
        programId={resolvedDrawerProgramId}
        programDetail={drawerProgramDetail}
        role={resolvedDrawerContext?.role}
        themeKey={resolvedDrawerContext?.themeKey}
        isEditMode={isEditMode}
        onSaveProgramDetail={isEditMode ? handleSaveProgramDetail : undefined}
        lessonDetail={drawerLessonDetail}
        detailKind={drawerIsScreenplay ? 'screenplay' : 'program'}
        screenplayTags={screenplayDrawerTags}
        onLaunchMemoryGame={
          drawerIsScreenplay && resolvedDrawerProgramId != null && screenplayById[resolvedDrawerProgramId]
            ? () => {
                const id = resolvedDrawerProgramId;
                if (id == null) return;
                const sp = screenplayById[id];
                const { mode, level } = getSpomoveLaunchParams(sp.modeId, sp.presetRef);
                const rowSnap = libraryDrawerOpen ? libraryDrawerContext?.row : drawerContext?.row;
                const tagChips = computeScreenplayDisplayTags(sp, rowSnap ?? undefined);
                setMemoryGameModal({
                  open: true,
                  mode,
                  level,
                  headline: sp.title?.trim() || undefined,
                  subtitleLine: sp.subtitle?.trim() || undefined,
                  body: sp.description?.trim() || undefined,
                  modeIdLabel: tagChips.length > 0 ? undefined : sp.modeId?.trim() || undefined,
                  tagChips: tagChips.length > 0 ? tagChips : undefined,
                });
              }
            : undefined
        }
        onClose={() => {
          if (libraryDrawerOpen) closeLibraryProgramDrawer();
          else closeProgramDrawer();
        }}
      />

      <PostClassModal
        open={postClassGroup !== null}
        classGroupName={postClassGroup ?? ''}
        onClose={() => setPostClassGroup(null)}
        onGoToAI={(id) => {
          setTodayClassPhase('done');
          setAiInitialStudentId(id);
          setPostClassGroup(null);
          switchViewWithMount('ai');
        }}
        onDoneLater={() => {
          setTodayClassPhase('done');
          setPostClassGroup(null);
        }}
      />

      {memoryGameModal.open && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end md:justify-center md:py-6 pointer-events-none">
          <div
            role="presentation"
            aria-hidden
            className="pointer-events-auto fixed inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
          />
          <div className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 md:max-h-[min(96vh,920px)] md:flex-none md:px-4 md:pb-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="spomove-embed-title"
              className="flex max-h-[92dvh] min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.35rem] border border-orange-500/25 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 shadow-[0_28px_90px_-14px_rgba(0,0,0,0.75)] ring-1 ring-orange-400/10 md:max-h-none md:h-[min(96vh,920px)] md:rounded-3xl"
            >
              <header className="shrink-0 space-y-2 border-b border-slate-800/90 bg-slate-950/60 px-4 pb-3 pt-3 md:px-5 md:pb-3.5 md:pt-4">
                <div className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-slate-600/80 md:hidden" aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/35 bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-100">
                        <Sparkles className="h-3 w-3 text-amber-300" aria-hidden />
                        {tr('SPOMOVE 諛섏쓳?덈젴')}
                      </span>
                      <span className="rounded-md border border-slate-600/70 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                        {memoryGameModal.mode} 쨌 L{memoryGameModal.level}
                      </span>
                      {memoryGameModal.modeIdLabel ? (
                        <span className="rounded-md border border-slate-600/50 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          {memoryGameModal.modeIdLabel}
                        </span>
                      ) : null}
                      {memoryGameModal.tagChips?.map((chip, i) => (
                        <span
                          key={`${chip}-${i}`}
                          className="rounded-md border border-orange-400/25 bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-100/90"
                        >
                          {tr(chip)}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-start gap-2">
                      <Gamepad2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-400/90" aria-hidden />
                      <div className="min-w-0">
                        <h2
                          id="spomove-embed-title"
                          className="text-base font-black leading-snug tracking-tight text-white md:text-lg"
                        >
                          {memoryGameModal.headline?.trim()
                            ? memoryGameModal.headline.trim()
                            : tr('SPOMOVE 인터랙티브')}
                        </h2>
                        {memoryGameModal.subtitleLine?.trim() ? (
                          <p className="mt-1 text-xs font-medium text-slate-400 md:text-sm">
                            {memoryGameModal.subtitleLine.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {memoryGameModal.body?.trim() ? (
                      <div className="max-h-24 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs leading-relaxed text-slate-300 custom-scroll">
                        {memoryGameModal.body.trim()}
                      </div>
                    ) : null}
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {tr(
                        '전체 화면에서 진행합니다. 배경을 누르거나 ESC로 닫을 수 있어요. 수업 중에는 화면 전환을 최소화해 주세요.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
                    className="shrink-0 rounded-xl border border-slate-600/70 bg-slate-800/90 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    aria-label={tr('?リ린')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>
              <div className="relative min-h-0 flex-1 bg-black">
                <iframe
                  title={tr('SPOMOVE')}
                  className="absolute inset-0 h-full w-full border-0 bg-slate-950"
                  src={`/admin/iiwarmup/spomove/training/_player?mode=${encodeURIComponent(memoryGameModal.mode)}&level=${encodeURIComponent(String(memoryGameModal.level))}&embed=1`}
                  allow="autoplay; fullscreen"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCurationDrawer && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity cursor-pointer"
            onClick={() => setShowCurationDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[700px] lg:w-[850px] bg-slate-900 z-50 shadow-2xl flex flex-col border-l border-slate-800 overflow-hidden">
            <DashboardCurationEditor onClose={() => setShowCurationDrawer(false)} />
          </div>
        </>
      )}

      </SpokeduProErrorBoundary>
    </div>
  );
}


