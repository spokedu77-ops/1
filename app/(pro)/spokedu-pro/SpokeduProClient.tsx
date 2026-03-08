'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import './styles/spokedu-pro.css';
import { useSpokeduProUI } from './hooks/useSpokeduProUI';
import { useSpokeduProContent } from './hooks/useSpokeduProContent';
import { useSpokeduProAdminBlocks } from './hooks/useSpokeduProContent';
import type { ProgramDetail } from './types';
import SpokeduProAside from './components/SpokeduProAside';
import SpokeduProToolkit from './components/SpokeduProToolkit';
import SpokeduProDrawer from './components/SpokeduProDrawer';
import DashboardCurationEditor from './components/DashboardCurationEditor';
import SpokeduProInteractiveScreen from './components/SpokeduProInteractiveScreen';
import ScreenplayView from './views/ScreenplayView';
import RoadmapView from './views/RoadmapView';
import LibraryView from './views/LibraryView';
import DataCenterView from './views/DataCenterView';
import AIReportView from './views/AIReportView';
import AssistantToolsView from './views/AssistantToolsView';
import SettingsView from './views/SettingsView';

export default function SpokeduProClient({ isEditMode = false }: { isEditMode?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { viewId, switchView, drawerOpen, closeDrawer, showToast } = useSpokeduProUI('roadmap');
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [drawerProgramId, setDrawerProgramId] = useState<number | null>(null);
  const [drawerContext, setDrawerContext] = useState<{ role?: string; themeKey?: string } | null>(null);
  const [interactiveMode, setInteractiveMode] = useState<string | null>(null);
  const [libraryPreset, setLibraryPreset] = useState<{ themeKey?: string; preset?: string } | null>(null);
  const [showCurationDrawer, setShowCurationDrawer] = useState(false);

  const { data: contentData, fetchContent } = useSpokeduProContent('catalog', ['program_details']);
  const { content: adminContent, fetchBlocks, saveContentDraft } = useSpokeduProAdminBlocks();

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);
  useEffect(() => {
    if (isEditMode) fetchBlocks();
  }, [isEditMode, fetchBlocks]);

  useEffect(() => {
    if (viewId !== 'library') setLibraryPreset(null);
  }, [viewId]);

  const programDetails = (contentData?.program_details?.value ?? {}) as Record<string, ProgramDetail>;
  const adminProgramDetails = (adminContent?.program_details?.draft_value ?? {}) as Record<string, ProgramDetail>;
  const programDetailsForDrawer = isEditMode ? adminProgramDetails : programDetails;
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
      switchView('library');
    },
    [switchView]
  );
  const openInteractive = useCallback((mode: string) => {
    setInteractiveMode(mode);
  }, []);

  return (
    <div ref={rootRef} className="spokedu-pro flex flex-col h-full w-full overflow-hidden bg-[#0F172A] text-[#F8FAFC]">
      <div className="flex flex-1 min-h-0">
      <SpokeduProAside
        viewId={viewId}
        onSwitchView={switchView}
        isEditMode={isEditMode}
        onOpenCurationDrawer={isEditMode ? () => setShowCurationDrawer(true) : undefined}
      />
      <main className="flex-1 h-full overflow-y-auto custom-scroll relative bg-[#0F172A]">
        <div className={`view-content ${viewId === 'screenplay' ? 'active' : ''}`}>
          <ScreenplayView onOpenInteractive={openInteractive} onToast={showToast} />
        </div>
        <div className={`view-content ${viewId === 'roadmap' ? 'active' : ''}`}>
          <RoadmapView onOpenDetail={openDrawer} onGoToLibrary={goToLibrary} programDetails={programDetailsForDrawer} />
        </div>
        <div className={`view-content ${viewId === 'library' ? 'active' : ''}`}>
          <LibraryView onOpenDetail={openDrawer} initialPreset={libraryPreset} programDetails={programDetailsForDrawer} />
        </div>
        <div className={`view-content ${viewId === 'data-center' ? 'active' : ''}`}>
          <DataCenterView />
        </div>
        <div className={`view-content ${viewId === 'ai' ? 'active' : ''}`}>
          <AIReportView />
        </div>
        <div className={`view-content ${viewId === 'tools' ? 'active' : ''}`}>
          <AssistantToolsView />
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
        onFabClick={() => showToast('기능 연결 예정')}
      />

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

      <SpokeduProInteractiveScreen
        mode={interactiveMode ?? '대기중'}
        open={interactiveMode !== null}
        onClose={() => setInteractiveMode(null)}
        onToast={showToast}
      />
      </div>
    </div>
  );
}
