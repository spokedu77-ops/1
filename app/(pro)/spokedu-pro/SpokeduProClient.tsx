'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import './styles/spokedu-pro.css';
import { useSpokeduProUI, type ViewId } from './hooks/useSpokeduProUI';
import { useSpokeduProContent } from './hooks/useSpokeduProContent';
import { useSpokeduProAdminBlocks } from './hooks/useSpokeduProContent';
import type { ProgramDetail } from './types';
import SpokeduProAside from './components/SpokeduProAside';
import SpokeduProToolkit from './components/SpokeduProToolkit';
import SpokeduProDrawer from './components/SpokeduProDrawer';
import DashboardCurationEditor from './components/DashboardCurationEditor';
import RoadmapView from './views/RoadmapView';
import type { ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';
import LibraryView from './views/LibraryView';
import DataCenterView from './views/DataCenterView';
import AIReportView from './views/AIReportView';
import AssistantToolsView from './views/AssistantToolsView';
import SettingsView from './views/SettingsView';
import LessonPlanView from './views/LessonPlanView';
import OnboardingWizard from './components/OnboardingWizard';
import PostClassModal from './components/PostClassModal';
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
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('onboardingDismissed')
  );
  const showOnboarding =
    !ctxLoading &&
    !ctx.contextLoadError &&
    ctx.dbReady !== false &&
    ctx.activeCenterId === null &&
    !onboardingDismissed;

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toast.success(tr('결제가 완료되었습니다. 구독 정보를 갱신합니다.'));
      void refresh();
    } else if (checkout === 'cancel') {
      toast.message(tr('결제를 취소했습니다.'));
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
    switchView('settings');
    void refresh();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      const qs = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}`);
    } catch {
      /* ignore */
    }
  }, [searchParams, switchView, refresh]);

  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [drawerProgramId, setDrawerProgramId] = useState<number | null>(null);
  const [drawerContext, setDrawerContext] = useState<{ role?: string; themeKey?: string } | null>(null);
  /** 라이브러리(프로그램 뱅크) 탭 전용 상세 모달 — 로드맵 등과 분리 */
  const [libraryDrawerProgramId, setLibraryDrawerProgramId] = useState<number | null>(null);
  const [libraryDrawerContext, setLibraryDrawerContext] = useState<{
    role?: string;
    themeKey?: string;
    screenplay?: boolean;
  } | null>(null);
  const [screenplayById, setScreenplayById] = useState<Record<number, ScreenplayMeta>>({});
  const [libraryPreset, setLibraryPreset] = useState<{ themeKey?: string; preset?: string } | null>(null);
  const [libraryMode, setLibraryMode] = useState<'program' | 'screenplay'>('program');
  const [showCurationDrawer, setShowCurationDrawer] = useState(false);
  const [postClassGroup, setPostClassGroup] = useState<string | null>(null);
  const [aiInitialStudentId, setAiInitialStudentId] = useState<string | null>(null);
  const [toolsFocusToken, setToolsFocusToken] = useState(0);
  const [memoryGameModal, setMemoryGameModal] = useState<{ open: boolean; mode: string; level: number }>({
    open: false,
    mode: 'basic',
    level: 1,
  });

  const { data: contentData, fetchContent } = useSpokeduProContent('catalog', ['program_details']);
  const { content: adminContent, fetchBlocks, saveContentDraft } = useSpokeduProAdminBlocks();

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);
  useEffect(() => {
    if (isEditMode) fetchBlocks();
  }, [isEditMode, fetchBlocks]);

  useEffect(() => {
    if (viewId !== 'library') {
      setLibraryPreset(null);
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
      tools: 'spokedu_pro_assistant_open',
      settings: 'spokedu_pro_settings_view',
    };
    const name = byView[viewId];
    if (name) trackSpokeduProEvent(name, { viewId });
  }, [ctxLoading, viewId]);

  const [programsFromApi, setProgramsFromApi] = useState<Array<{
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
  }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/spokedu-pro/programs?limit=200');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(json?.data)) setProgramsFromApi(json.data);
        else setProgramsFromApi([]);
      } catch {
        if (!cancelled) setProgramsFromApi([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, []);

  const programDetailsFromApi = useMemo(() => {
    const out: Record<string, ProgramDetail> = {};
    programsFromApi.forEach((row) => {
      out[String(row.id)] = {
        title: row.title,
        videoUrl: row.video_url ?? undefined,
        functionType: row.function_type ?? undefined,
        mainTheme: row.main_theme ?? undefined,
        groupSize: row.group_size ?? undefined,
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
  const programDetailsForDrawer = useMemo(
    () => ({ ...programDetailsFromApi, ...contentDetails }),
    [programDetailsFromApi, contentDetails]
  );
  const libraryDrawerOpen = viewId === 'library' && libraryDrawerProgramId !== null;
  const globalDrawerOpen = drawerProgramId !== null;
  const resolvedDrawerProgramId = libraryDrawerOpen ? libraryDrawerProgramId : drawerProgramId;
  const resolvedDrawerContext = libraryDrawerOpen ? libraryDrawerContext : drawerContext;
  const libraryScreenplayDetail =
    libraryDrawerOpen && libraryDrawerContext?.screenplay && libraryDrawerProgramId != null
      ? programDetailsForDrawer[screenplayDetailStorageKey(libraryDrawerProgramId)]
      : undefined;

  const drawerProgramDetail = useMemo(() => {
    if (resolvedDrawerProgramId == null) return null;
    if (libraryDrawerOpen && libraryDrawerContext?.screenplay) {
      const sp = screenplayById[resolvedDrawerProgramId];
      return mergeScreenplayProgramDetailForDrawer(sp, libraryScreenplayDetail);
    }
    return programDetailsForDrawer[String(resolvedDrawerProgramId)] ?? null;
  }, [
    resolvedDrawerProgramId,
    libraryDrawerOpen,
    libraryDrawerContext?.screenplay,
    screenplayById,
    libraryScreenplayDetail,
    programDetailsForDrawer,
  ]);

  const handleSaveProgramDetail = useCallback(
    async (programId: number, detail: ProgramDetail, opts?: { screenplay?: boolean }) => {
      const entry = adminContent?.program_details;
      const current = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
      const key = opts?.screenplay ? screenplayDetailStorageKey(programId) : String(programId);
      const next = { ...current, [key]: detail };
      const version = entry?.version ?? 0;
      const result = await saveContentDraft('program_details', next, version);
      if (result.ok) {
        toast.success(tr('수정되었습니다.'));
        await fetchContent();
        await fetchBlocks();
      } else {
        toast.error(tr(`저장 실패: ${result.error ?? '알 수 없는 오류'}`));
      }
    },
    [adminContent?.program_details, saveContentDraft, fetchContent, fetchBlocks, tr]
  );

  const openDrawer = useCallback((id: number, context?: { role?: string; themeKey?: string }) => {
    trackSpokeduProEvent('spokedu_pro_week_card_open', {
      programId: id,
      source: 'dashboard_drawer',
      role: context?.role,
      themeKey: context?.themeKey,
    });
    setDrawerProgramId(id);
    setDrawerContext(context ?? null);
  }, []);
  const openLibraryProgramDetail = useCallback(
    (id: number, context?: { role?: string; themeKey?: string; screenplay?: boolean }) => {
      trackSpokeduProEvent('spokedu_pro_week_card_open', {
        programId: id,
        source: context?.screenplay ? 'library_screenplay_drawer' : 'library_program_drawer',
        role: context?.role,
        themeKey: context?.themeKey,
      });
      setLibraryDrawerProgramId(id);
      setLibraryDrawerContext(context ?? null);
    },
    []
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
    (themeKey?: string, preset?: string) => {
      setLibraryPreset(themeKey != null || preset != null ? { themeKey, preset } : null);
      setLibraryMode(themeKey === 'cognitive' ? 'screenplay' : 'program');
      switchView('library');
    },
    [switchView]
  );
  const openLibraryAll = useCallback(() => {
    setLibraryPreset(null);
    setLibraryMode('program');
    switchView('library');
  }, [switchView]);
  const goToLibraryTheme = useCallback(
    (themeKey: ThemeKey) => {
      setLibraryPreset({ themeKey });
      setLibraryMode(themeKey === 'cognitive' ? 'screenplay' : 'program');
      switchView('library');
    },
    [switchView]
  );

  return (
    <div ref={rootRef} className="spokedu-pro flex flex-col h-full w-full overflow-hidden bg-[#0F172A] text-[#F8FAFC]">
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
          onSwitchView={switchView}
        />
      )}
      <SpokeduProErrorBoundary>
      <div className="flex flex-1 min-h-0">
      <SpokeduProAside
        viewId={viewId}
        onSwitchView={switchView}
        onOpenLibraryAll={openLibraryAll}
        onGoToLibraryTheme={goToLibraryTheme}
        libraryActiveThemeKey={libraryPreset?.themeKey ?? null}
        isEditMode={isEditMode}
        onOpenCurationDrawer={isEditMode ? () => setShowCurationDrawer(true) : undefined}
      />
      <main className="flex-1 w-full max-w-full min-w-0 h-full overflow-y-auto overflow-x-hidden custom-scroll relative bg-[#0F172A] z-0 min-h-0 pr-0 mr-0">
        {!ctxLoading && !ctx.contextLoadError && ctx.entitlement.status === 'past_due' && (
          <div className="sticky top-0 z-[25] flex flex-wrap items-center gap-3 px-4 py-3 bg-rose-950/95 border-b border-rose-700/50 text-rose-50 text-sm">
            <p className="flex-1 min-w-[200px] font-medium">
              {tr('결제가 지연된 상태입니다. 플랜 & 결제에서 카드를 갱신하거나 결제를 다시 시도해 주세요.')}
            </p>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => switchView('settings')}
                className="inline-flex min-h-[44px] items-center px-3 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {tr('플랜 & 결제로 이동')}
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-900/80 hover:bg-rose-900 text-white text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {tr('상태 새로고침')}
              </button>
            </div>
          </div>
        )}
        {!ctxLoading && ctx.contextLoadError && (
          <div className="sticky top-0 z-[25] flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-950/95 border-b border-amber-700/50 text-amber-100 text-sm">
            <p className="flex-1 min-w-[200px] font-medium">{tr(ctx.contextLoadError)}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {tr('다시 시도')}
              </button>
              {(ctx.contextLoadError?.includes('로그인') ?? false) && (
                <Link
                  href="/login"
                  className="text-xs font-bold text-amber-200 underline underline-offset-2"
                >
                  {tr('로그인')}
                </Link>
              )}
            </div>
          </div>
        )}
        <div className={`view-content ${viewId === 'roadmap' ? 'active' : ''}`}>
          <RoadmapView
            onOpenDetail={openDrawer}
            onGoToLibrary={goToLibrary}
            programDetails={programDetailsForDrawer}
            onStartTodayClass={() => {
              setToolsFocusToken((t) => t + 1);
              switchView('tools');
            }}
            onOpenPostClass={(name) => setPostClassGroup(name)}
            onGoToAIReportFromToday={() => switchView('ai')}
            onAddClassFromToday={() => switchView('data-center')}
            onGoToAssistantTools={() => {
              setToolsFocusToken((t) => t + 1);
              switchView('tools');
            }}
          />
        </div>
        <div className={`view-content ${viewId === 'lesson-plan' ? 'active' : ''}`}>
          <LessonPlanView programDetails={programDetailsForDrawer} />
        </div>
        <div className={`view-content ${viewId === 'library' ? 'active' : ''}`}>
          <LibraryView
            onOpenDetail={openLibraryProgramDetail}
            initialPreset={libraryPreset}
            programDetails={programDetailsForDrawer}
            functionalCap={isEditMode ? 144 : undefined}
            libraryMode={libraryMode}
          />
        </div>
        <div className={`view-content ${viewId === 'data-center' ? 'active' : ''}`}>
          <DataCenterView
            onOpenSettings={() => switchView('settings')}
            onGoToAssistantTools={() => {
              setToolsFocusToken((t) => t + 1);
              switchView('tools');
            }}
          />
        </div>
        <div className={`view-content ${viewId === 'ai' ? 'active' : ''}`}>
          <AIReportView
            initialStudentId={aiInitialStudentId}
            onConsumeInitialStudent={() => setAiInitialStudentId(null)}
          />
        </div>
        <div className={`view-content ${viewId === 'tools' ? 'active' : ''}`}>
          <AssistantToolsView
            focusStopwatchToken={toolsFocusToken}
            onGoToDataCenter={() => switchView('data-center')}
          />
        </div>
        <div className={`view-content ${viewId === 'settings' ? 'active' : ''}`}>
          <SettingsView />
        </div>
      </main>

      <SpokeduProToolkit
        open={toolkitOpen}
        onToggle={() => setToolkitOpen((o) => !o)}
        onOpenToolsView={() => switchView('tools')}
      />

      <SpokeduProDrawer
        open={(libraryDrawerOpen || globalDrawerOpen) && !showCurationDrawer}
        programId={resolvedDrawerProgramId}
        programDetail={drawerProgramDetail}
        role={resolvedDrawerContext?.role}
        themeKey={resolvedDrawerContext?.themeKey}
        isEditMode={isEditMode}
        onSaveProgramDetail={isEditMode ? handleSaveProgramDetail : undefined}
        detailKind={libraryDrawerOpen && libraryDrawerContext?.screenplay ? 'screenplay' : 'program'}
        onLaunchMemoryGame={
          libraryDrawerOpen &&
          libraryDrawerContext?.screenplay &&
          resolvedDrawerProgramId != null &&
          screenplayById[resolvedDrawerProgramId]
            ? () => {
                const id = resolvedDrawerProgramId;
                if (id == null) return;
                const sp = screenplayById[id];
                const { mode, level } = getSpomoveLaunchParams(sp.modeId, sp.presetRef);
                setMemoryGameModal({ open: true, mode, level });
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
          switchView('ai');
        }}
        onDoneLater={() => {
          setTodayClassPhase('done');
          setPostClassGroup(null);
        }}
      />

      {memoryGameModal.open && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] transition-opacity cursor-pointer"
            onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
          />
          <div className="fixed inset-0 z-[80] p-2 md:p-4">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-950/80">
                <p className="text-sm font-bold text-slate-200">{tr('SPOMOVE 실행')}</p>
                <button
                  type="button"
                  onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  {tr('닫기')}
                </button>
              </div>
              <iframe
                title="SPOMOVE"
                className="w-full h-[calc(100%-3rem)] bg-slate-900"
                src={`/admin/memory-game?mode=${encodeURIComponent(memoryGameModal.mode)}&level=${encodeURIComponent(String(memoryGameModal.level))}&embed=1`}
              />
            </div>
          </div>
        </>
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

      </div>
      </SpokeduProErrorBoundary>
    </div>
  );
}
