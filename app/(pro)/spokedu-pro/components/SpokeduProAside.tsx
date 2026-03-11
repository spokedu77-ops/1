'use client';

import { MonitorPlay, LayoutDashboard, Grid, ClipboardCheck, Bot, Wrench, CreditCard, Building2, Settings2 } from 'lucide-react';
import type { ViewId } from '../hooks/useSpokeduProUI';

const NAV: { id: ViewId; label: string; icon: React.ElementType; group?: string; iconClass?: string }[] = [
  { id: 'screenplay', label: '스크린 플레이 실행', icon: MonitorPlay, group: '수업 플레이어 (Live)', iconClass: 'text-orange-400' },
  { id: 'roadmap', label: '대시보드 (추천 로드맵)', icon: LayoutDashboard, group: '대시보드 및 커리큘럼' },
  { id: 'library', label: '100대 프로그램 뱅크', icon: Grid, group: '대시보드 및 커리큘럼' },
  { id: 'data-center', label: '원생 & 출결 관리', icon: ClipboardCheck, group: '데이터 및 운영', iconClass: 'text-emerald-400' },
  { id: 'ai', label: '에듀-에코 리포트', icon: Bot, group: '데이터 및 운영', iconClass: 'text-purple-400' },
  { id: 'tools', label: '수업 보조도구', icon: Wrench, group: '수업 보조도구', iconClass: 'text-amber-400' },
  { id: 'center', label: '센터 & 멤버 관리', icon: Building2, group: '계정', iconClass: 'text-blue-400' },
  { id: 'settings', label: '플랜 & 결제', icon: CreditCard, group: '계정' },
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
    <>
      {/* ── 데스크탑 사이드바 (md 이상) ── */}
      <aside className="hidden md:flex w-20 lg:w-64 bg-[#0B1120] border-r border-slate-800 flex-col justify-between z-40 shrink-0">
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
                    aria-label={label}
                    aria-current={viewId === id ? 'page' : undefined}
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
                  aria-label="대시보드 편집"
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
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600 shrink-0">
              <span className="text-white text-lg">👤</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-white">강사 계정</p>
              <p className="text-xs text-slate-400 font-medium">연세 체육교육 연구소</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── 모바일 하단 탭 바 (md 미만) ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B1120] border-t border-slate-800 flex items-center justify-around px-2 py-2 safe-area-bottom"
        role="navigation"
        aria-label="하단 탐색"
      >
        {NAV.map(({ id, label, icon: Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSwitchView(id)}
            aria-label={label}
            aria-current={viewId === id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl flex-1 transition-colors ${
              viewId === id
                ? 'text-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className={`w-5 h-5 ${viewId === id ? 'text-blue-400' : (iconClass ?? 'text-slate-500')}`} />
            <span className="text-[9px] font-bold leading-none line-clamp-1">
              {label.split(' ')[0]}
            </span>
          </button>
        ))}
        {isEditMode && onOpenCurationDrawer && (
          <button
            type="button"
            onClick={onOpenCurationDrawer}
            aria-label="대시보드 편집"
            className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl flex-1 text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none">편집</span>
          </button>
        )}
      </nav>
    </>
  );
}
