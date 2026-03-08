'use client';

import { MonitorPlay, LayoutDashboard, Grid, ClipboardCheck, Bot, Wrench, Settings2 } from 'lucide-react';
import type { ViewId } from '../hooks/useSpokeduProUI';

const NAV: { id: ViewId; label: string; icon: React.ElementType; group?: string; iconClass?: string }[] = [
  { id: 'screenplay', label: '스크린 플레이 실행', icon: MonitorPlay, group: '수업 플레이어 (Live)', iconClass: 'text-orange-400' },
  { id: 'roadmap', label: '대시보드 (추천 로드맵)', icon: LayoutDashboard, group: '대시보드 및 커리큘럼' },
  { id: 'library', label: '100대 프로그램 뱅크', icon: Grid, group: '대시보드 및 커리큘럼' },
  { id: 'data-center', label: '원생 관리 및 평가', icon: ClipboardCheck, group: '데이터 및 운영', iconClass: 'text-emerald-400' },
  { id: 'ai', label: '에듀-에코 리포트', icon: Bot, group: '데이터 및 운영', iconClass: 'text-purple-400' },
  { id: 'tools', label: '수업 보조도구', icon: Wrench, group: '수업 보조도구', iconClass: 'text-amber-400' },
];

export default function SpokeduProAside({
  viewId,
  onSwitchView,
  isEditMode,
  onOpenCurationDrawer,
}: {
  viewId: ViewId;
  onSwitchView: (id: ViewId) => void;
  isEditMode?: boolean;
  onOpenCurationDrawer?: () => void;
}) {
  let lastGroup = '';
  return (
    <aside className="w-20 lg:w-64 bg-[#0B1120] border-r border-slate-800 flex flex-col justify-between z-40 shrink-0">
      <div>
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
              <span className="text-yellow-300">⚡</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">SPOKEDU</h1>
              <p className="text-xs text-blue-400 font-bold uppercase mt-0.5">Play Think Grow</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2 mt-4">
          {NAV.map(({ id, label, icon: Icon, group, iconClass }) => {
            const showGroup = group && group !== lastGroup;
            if (showGroup) lastGroup = group || '';
            return (
              <div key={id}>
                {showGroup && (
                  <div className="hidden lg:block px-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSwitchView(id)}
                  className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                    viewId === id ? 'nav-active' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${iconClass ?? 'text-slate-400'}`} />
                  <span className="hidden lg:block font-medium">{label}</span>
                </button>
              </div>
            );
          })}
          {isEditMode && onOpenCurationDrawer && (
            <div className="pt-2 mt-2 border-t border-slate-800">
              <div className="hidden lg:block px-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                편집
              </div>
              <button
                type="button"
                onClick={onOpenCurationDrawer}
                className="nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm"
              >
                <Settings2 className="w-5 h-5 shrink-0 text-amber-400" />
                <span className="hidden lg:block font-medium">대시보드 편집</span>
              </button>
            </div>
          )}
        </nav>
      </div>
      <div className="p-6 bg-slate-900/50 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
            <span className="text-white text-lg">👤</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-bold text-white">강사 계정</p>
            <p className="text-xs text-slate-400 font-medium">연세 체육교육 연구소</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
