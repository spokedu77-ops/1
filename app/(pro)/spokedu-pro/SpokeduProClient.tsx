'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { setTodayClassPhase } from './utils/todayClassStorage';

export default function SpokeduProClient({
  isEditMode = false,
  onViewChange,
}: {
  isEditMode?: boolean;
  onViewChange?: (viewId: ViewId) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { viewId, switchView } = useSpokeduProUI('roadmap');
  const { ctx, loading: ctxLoading, refresh } = useProContext();
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('onboardingDismissed')
  );
  const showOnboarding = !ctxLoading && ctx.activeCenterId === null && !onboardingDismissed;

  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [drawerProgramId, setDrawerProgramId] = useState<number | null>(null);
  const [drawerContext, setDrawerContext] = useState<{ role?: string; themeKey?: string } | null>(null);
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
    }
  }, [viewId]);

  useEffect(() => {
    onViewChange?.(viewId);
  }, [viewId, onViewChange]);

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
    fetch('/api/spokedu-pro/programs?limit=200')
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setProgramsFromApi(json.data);
      })
      .catch(() => setProgramsFromApi([]));
  }, []);

  const programDetailsFromApi: Record<string, ProgramDetail> = {};
  programsFromApi.forEach((row) => {
    programDetailsFromApi[String(row.id)] = {
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

  const programDetails = (contentData?.program_details?.value ?? {}) as Record<string, ProgramDetail>;
  const adminProgramDetails = (adminContent?.program_details?.draft_value ?? {}) as Record<string, ProgramDetail>;
  const contentDetails = isEditMode ? adminProgramDetails : programDetails;
  const programDetailsForDrawer: Record<string, ProgramDetail> = { ...programDetailsFromApi, ...contentDetails };
  const drawerProgramDetail = drawerProgramId != null ? programDetailsForDrawer[String(drawerProgramId)] ?? null : null;

  const handleSaveProgramDetail = useCallback(
    async (programId: number, detail: ProgramDetail) => {
      const entry = adminContent?.program_details;
      const current = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
      const next = { ...current, [String(programId)]: detail };
      const version = entry?.version ?? 0;
      const result = await saveContentDraft('program_details', next, version);
      if (result.ok) {
        toast.success('수정되었습니다.');
        await fetchContent();
        await fetchBlocks();
      } else {
        toast.error('저장 실패: ' + (result.error ?? '알 수 없는 오류'));
      }
    },
    [adminContent?.program_details, saveContentDraft, fetchContent, fetchBlocks]
  );

  const openDrawer = useCallback((id: number, context?: { role?: string; themeKey?: string }) => {
    setDrawerProgramId(id);
    setDrawerContext(context ?? null);
  }, []);
  const closeProgramDrawer = useCallback(() => {
    setDrawerProgramId(null);
    setDrawerContext(null);
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
          />
        </div>
        <div className={`view-content ${viewId === 'lesson-plan' ? 'active' : ''}`}>
          <LessonPlanView programDetails={programDetailsForDrawer} />
        </div>
        <div className={`view-content ${viewId === 'library' ? 'active' : ''}`}>
          <LibraryView
            onOpenDetail={openDrawer}
            onOpenMemoryGame={(mode, level) => setMemoryGameModal({ open: true, mode, level })}
            initialPreset={libraryPreset}
            programDetails={programDetailsForDrawer}
            functionalCap={isEditMode ? 144 : undefined}
            libraryMode={libraryMode}
          />
        </div>
        <div className={`view-content ${viewId === 'data-center' ? 'active' : ''}`}>
          <DataCenterView onOpenSettings={() => switchView('settings')} />
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
        open={drawerProgramId !== null && !showCurationDrawer}
        programId={drawerProgramId}
        programDetail={drawerProgramDetail}
        role={drawerContext?.role}
        themeKey={drawerContext?.themeKey}
        isEditMode={isEditMode}
        onSaveProgramDetail={isEditMode ? handleSaveProgramDetail : undefined}
        onClose={closeProgramDrawer}
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity cursor-pointer"
            onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
          />
          <div className="fixed inset-0 z-50 p-2 md:p-4">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-950/80">
                <p className="text-sm font-bold text-slate-200">SPOMOVE 실행</p>
                <button
                  type="button"
                  onClick={() => setMemoryGameModal((m) => ({ ...m, open: false }))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  닫기
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
