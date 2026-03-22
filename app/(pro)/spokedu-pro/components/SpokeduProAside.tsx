'use client';

import {
  LayoutDashboard,
  Grid,
  ClipboardCheck,
  Bot,
  Wrench,
  Settings2,
  CreditCard,
} from 'lucide-react';
import type { ViewId } from '../hooks/useSpokeduProUI';
import { LIBRARY_SIDEBAR_ITEMS, type ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';

const MAIN_NAV: { id: ViewId; label: string; icon: React.ElementType; group?: string; iconClass?: string }[] = [
  { id: 'roadmap', label: '대시보드', icon: LayoutDashboard, group: '대시보드' },
  { id: 'data-center', label: '원생 관리 및 평가', icon: ClipboardCheck, group: '데이터 및 운영', iconClass: 'text-emerald-400' },
  { id: 'ai', label: '에듀-에코 리포트', icon: Bot, group: '데이터 및 운영', iconClass: 'text-purple-400' },
  { id: 'tools', label: '수업 보조도구', icon: Wrench, group: '수업 보조도구', iconClass: 'text-amber-400' },
  { id: 'settings', label: '플랜 & 결제', icon: CreditCard, group: '계정' },
];

const MOBILE_TABS: { id: ViewId; label: string; icon: React.ElementType; iconClass?: string }[] = [
  { id: 'roadmap', label: '대시보드', icon: LayoutDashboard },
  { id: 'library', label: '라이브러리', icon: Grid, iconClass: 'text-emerald-400' },
  { id: 'data-center', label: '원생', icon: ClipboardCheck, iconClass: 'text-emerald-400' },
  { id: 'ai', label: '리포트', icon: Bot, iconClass: 'text-purple-400' },
  { id: 'tools', label: '도구', icon: Wrench, iconClass: 'text-amber-400' },
  { id: 'settings', label: '설정', icon: CreditCard },
];

export default function SpokeduProAside({
  viewId,
  onSwitchView,
  onOpenLibraryAll,
  onGoToLibraryTheme,
  libraryActiveThemeKey,
  isEditMode,
  onOpenCurationDrawer,
}: {
  viewId: ViewId;
  onSwitchView: (id: ViewId) => void;
  /** 모바일·전체 라이브러리: 테마 프리셋 없이 library 뷰 */
  onOpenLibraryAll: () => void;
  onGoToLibraryTheme: (themeKey: ThemeKey) => void;
  libraryActiveThemeKey?: string | null;
  isEditMode?: boolean;
  onOpenCurationDrawer?: () => void;
}) {
  let lastGroup = '';

  const isLibraryView = viewId === 'library';

  return (
    <>
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
            {/* 1) 대시보드 */}
            {MAIN_NAV.filter((x) => x.id === 'roadmap').map(({ id, label, icon: Icon, group, iconClass }) => {
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

            {/* 라이브러리 (테마 하위) */}
            <div>
              <div className="hidden lg:block px-4 pb-2 pt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                라이브러리
              </div>
              <div className="hidden lg:flex flex-col gap-0.5 pl-0">
                {LIBRARY_SIDEBAR_ITEMS.map(({ themeKey, label }) => {
                  const active = isLibraryView && libraryActiveThemeKey === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => onGoToLibraryTheme(themeKey)}
                      aria-label={label}
                      aria-current={active ? 'page' : undefined}
                      className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left ${
                        active ? 'nav-active' : ''
                      }`}
                    >
                      <Grid className="w-4 h-4 shrink-0 text-emerald-400/90" />
                      <span className="font-medium leading-snug">{label}</span>
                    </button>
                  );
                })}
              </div>
              {/* md~lg 축소: 라이브러리 단일 아이콘 */}
              <button
                type="button"
                onClick={() => onOpenLibraryAll()}
                className={`lg:hidden nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                  isLibraryView ? 'nav-active' : ''
                }`}
                aria-label="프로그램 라이브러리"
              >
                <Grid className="w-5 h-5 shrink-0 text-emerald-400" />
              </button>
            </div>

            {/* 나머지 메인 네비 */}
            {MAIN_NAV.filter((x) => x.id !== 'roadmap').map(({ id, label, icon: Icon, group, iconClass }) => {
              const showGroup = group && group !== lastGroup;
              if (showGroup) lastGroup = group || '';
              return (
                <div key={id}>
                  {showGroup && (
                    <div className="hidden lg:block px-4 pb-2 pt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
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

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B1120] border-t border-slate-800 flex items-center justify-around px-1 py-2 safe-area-bottom"
        role="navigation"
        aria-label="하단 탐색"
      >
        {MOBILE_TABS.map(({ id, label, icon: Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => (id === 'library' ? onOpenLibraryAll() : onSwitchView(id))}
            aria-label={label}
            aria-current={viewId === id ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl flex-1 min-h-[52px] max-w-[4.5rem] transition-colors ${
              viewId === id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className={`w-5 h-5 ${viewId === id ? 'text-blue-400' : iconClass ?? 'text-slate-500'}`} />
            <span className="text-[10px] font-bold leading-none line-clamp-2 text-center">{label}</span>
          </button>
        ))}
        {isEditMode && onOpenCurationDrawer && (
          <button
            type="button"
            onClick={onOpenCurationDrawer}
            aria-label="대시보드 편집"
            className="flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl flex-1 min-h-[52px] max-w-[4.5rem] text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[10px] font-bold leading-none">편집</span>
          </button>
        )}
      </nav>
    </>
  );
}
