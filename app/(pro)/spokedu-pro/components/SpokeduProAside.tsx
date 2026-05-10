'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import {
  LayoutDashboard,
  Grid,
  ClipboardCheck,
  Bot,
  Wrench,
  Settings2,
  CreditCard,
  CalendarDays,
  Gamepad2,
  ShoppingBag,
  Zap,
  User,
} from 'lucide-react';
import type { ViewId } from '../hooks/useSpokeduProUI';
import { LIBRARY_SIDEBAR_ITEMS, type ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';

// 사이드바는 컨텍스트 선택 도구. inactive는 모노톤(slate-400)으로 통일하고 active만 brand color로 강조.
const MAIN_NAV: { id: ViewId; label: string; icon: React.ElementType; group?: string }[] = [
  { id: 'roadmap', label: '대시보드', icon: LayoutDashboard, group: '대시보드' },
  { id: 'lesson-plan', label: '수업 계획', icon: CalendarDays, group: '수업 준비' },
  { id: 'data-center', label: '원생 관리 및 평가', icon: ClipboardCheck, group: '데이터 및 운영' },
  { id: 'ai', label: '에듀-에코 리포트', icon: Bot, group: '데이터 및 운영' },
  { id: 'tools', label: '수업 보조도구', icon: Wrench, group: '수업 보조도구' },
  { id: 'settings', label: '플랜 & 결제', icon: CreditCard, group: '계정' },
];

const MOBILE_TABS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'roadmap', label: '대시보드', icon: LayoutDashboard },
  { id: 'lesson-plan', label: '계획', icon: CalendarDays },
  { id: 'library', label: '라이브러리', icon: Grid },
  { id: 'shop', label: '교구 샵', icon: ShoppingBag },
  { id: 'data-center', label: '원생', icon: ClipboardCheck },
  { id: 'ai', label: '리포트', icon: Bot },
  { id: 'tools', label: '도구', icon: Wrench },
  { id: 'settings', label: '설정', icon: CreditCard },
];

export default function SpokeduProAside({
  viewId,
  onSwitchView,
  onOpenLibraryAll,
  onGoToLibraryTheme,
  libraryActiveThemeKey,
  libraryMode = 'program',
  onOpenSpomove,
  isEditMode,
  onOpenCurationDrawer,
}: {
  viewId: ViewId;
  onSwitchView: (id: ViewId) => void;
  /** 모바일·전체 라이브러리: 테마 프리셋 없이 library 뷰 */
  onOpenLibraryAll: () => void;
  onGoToLibraryTheme: (themeKey: ThemeKey) => void;
  libraryActiveThemeKey?: string | null;
  /** 구독자: SPOMOVE(스크린플레이) 활성 판별 */
  libraryMode?: 'program' | 'screenplay';
  /** 구독자: SPOMOVE 라이브러리 진입 */
  onOpenSpomove?: () => void;
  isEditMode?: boolean;
  onOpenCurationDrawer?: () => void;
}) {
  const t = useTranslator();
  let lastGroup = '';

  const isLibraryView = viewId === 'library';
  const programLibraryActive = isLibraryView && libraryMode === 'program';
  const spomoveActive = isLibraryView && libraryMode === 'screenplay';

  const subscriberMode = !isEditMode;

  return (
    <>
      <aside className="hidden md:flex w-20 lg:w-64 shrink-0 z-40 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl md:my-3 md:ml-3 md:mr-2 lg:mr-3">
        <div>
          <div className="h-20 flex items-center px-4 lg:px-6 border-b border-white/10">
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/25 ring-1 ring-white/10">
                <Zap className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="hidden lg:block">
                <h1 className="font-bold text-lg tracking-tight text-white leading-none">SPOKEDU</h1>
                <p className="text-[10px] text-blue-300/90 font-semibold uppercase tracking-[0.16em] mt-1">Play Think Grow</p>
              </div>
            </div>
          </div>
          <nav className="p-4 space-y-2 mt-4">
            {/* 1) 대시보드 */}
            {MAIN_NAV.filter((x) => x.id === 'roadmap').map(({ id, label, icon: Icon, group }) => {
              const showGroup = group && group !== lastGroup;
              if (showGroup) lastGroup = group || '';
              const active = viewId === id;
              return (
                <div key={id}>
                  {showGroup && (
                    <div className="hidden lg:block px-4 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
                      {t(group)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onSwitchView(id)}
                    aria-label={t(label)}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                      active ? 'nav-active' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="hidden lg:block font-medium leading-snug">{t(label)}</span>
                  </button>
                </div>
              );
            })}

            {/* 라이브러리 */}
            <div>
              <div className="hidden lg:block px-4 pb-2 pt-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
                {t('수업 준비')}
              </div>
              {subscriberMode ? (
                <>
                  <div className="hidden lg:flex flex-col gap-0.5 pl-0">
                    <button
                      type="button"
                      onClick={() => onOpenLibraryAll()}
                      aria-label={t('프로그램 라이브러리')}
                      aria-current={programLibraryActive ? 'page' : undefined}
                      className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left ${
                        programLibraryActive ? 'nav-active' : ''
                      }`}
                    >
                      <Grid className={`w-4 h-4 shrink-0 ${programLibraryActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="text-[13px] font-medium leading-snug">{t('프로그램 라이브러리')}</span>
                    </button>
                    {onOpenSpomove ? (
                      <button
                        type="button"
                        onClick={() => onOpenSpomove()}
                        aria-label={t('SPOMOVE')}
                        aria-current={spomoveActive ? 'page' : undefined}
                        className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left ${
                          spomoveActive ? 'nav-active' : ''
                        }`}
                      >
                        <Gamepad2 className={`w-4 h-4 shrink-0 ${spomoveActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-[13px] font-medium leading-snug">{t('SPOMOVE')}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSwitchView('shop')}
                      aria-label={t('교구 샵')}
                      aria-current={viewId === 'shop' ? 'page' : undefined}
                      className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left ${
                        viewId === 'shop' ? 'nav-active' : ''
                      }`}
                    >
                      <ShoppingBag className={`w-4 h-4 shrink-0 ${viewId === 'shop' ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="text-[13px] font-medium leading-snug">{t('교구 샵')}</span>
                    </button>
                  </div>
                  <div className="lg:hidden flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => onOpenLibraryAll()}
                      className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                        programLibraryActive ? 'nav-active' : ''
                      }`}
                      aria-label={t('프로그램 라이브러리')}
                    >
                      <Grid className={`w-5 h-5 shrink-0 ${programLibraryActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    </button>
                    {onOpenSpomove ? (
                      <button
                        type="button"
                        onClick={() => onOpenSpomove()}
                        className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                          spomoveActive ? 'nav-active' : ''
                        }`}
                        aria-label={t('SPOMOVE')}
                      >
                        <Gamepad2 className={`w-5 h-5 shrink-0 ${spomoveActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSwitchView('shop')}
                      className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                        viewId === 'shop' ? 'nav-active' : ''
                      }`}
                      aria-label={t('교구 샵')}
                    >
                      <ShoppingBag className={`w-5 h-5 shrink-0 ${viewId === 'shop' ? 'text-blue-400' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="hidden lg:flex flex-col gap-0.5 pl-0">
                    {LIBRARY_SIDEBAR_ITEMS.map(({ themeKey, label }) => {
                      const active = isLibraryView && libraryActiveThemeKey === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => onGoToLibraryTheme(themeKey)}
                          aria-label={t(label)}
                          aria-current={active ? 'page' : undefined}
                          className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left ${
                            active ? 'nav-active' : ''
                          }`}
                        >
                          <Grid className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className="text-[13px] font-medium leading-snug">{t(label)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLibraryAll()}
                    className={`lg:hidden nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                      isLibraryView ? 'nav-active' : ''
                    }`}
                    aria-label={t('프로그램 라이브러리')}
                  >
                    <Grid className={`w-5 h-5 shrink-0 ${isLibraryView ? 'text-blue-400' : 'text-slate-400'}`} />
                  </button>
                </>
              )}
            </div>

            {/* 나머지 메인 네비 */}
            {MAIN_NAV.filter((x) => {
              if (x.id === 'roadmap') return false;
              if (subscriberMode) {
                return x.id === 'ai' || x.id === 'settings';
              }
              return true;
            }).map(({ id, label, icon: Icon, group }) => {
              const showGroup = group && group !== lastGroup;
              if (showGroup) lastGroup = group || '';
              const active = viewId === id;
              const displayLabel =
                subscriberMode && id === 'ai'
                  ? t('성장 리포트')
                  : subscriberMode && id === 'settings'
                    ? t('플랜/결제')
                    : t(label);
              return (
                <div key={id}>
                  {showGroup && (
                    <div className="hidden lg:block px-4 pb-2 pt-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
                      {group ? t(group) : null}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onSwitchView(id)}
                    aria-label={displayLabel}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                      active ? 'nav-active' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="hidden lg:block text-[13px] font-medium leading-snug">{displayLabel}</span>
                  </button>
                </div>
              );
            })}

            {isEditMode && onOpenCurationDrawer && (
              <div className="pt-2 mt-2 border-t border-slate-800">
                <div className="hidden lg:block px-4 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
                  {t('편집')}
                </div>
                <button
                  type="button"
                  onClick={onOpenCurationDrawer}
                  aria-label={t('대시보드 편집')}
                  className="nav-item w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm"
                >
                  <Settings2 className="w-5 h-5 shrink-0 text-amber-400" />
                  <span className="hidden lg:block font-medium">{t('대시보드 편집')}</span>
                </button>
              </div>
            )}
          </nav>
        </div>
        <div className="p-4 lg:p-6 border-t border-white/10 bg-white/[0.04] rounded-b-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 ring-1 ring-white/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-300" strokeWidth={2} />
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t('강사 계정')}</p>
              <p className="text-xs text-slate-400 font-medium truncate">{t('연세 체육교육 연구소')}</p>
            </div>
          </div>
        </div>
      </aside>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B1120] border-t border-slate-800 flex items-center justify-around px-1 py-2 safe-area-bottom"
        role="navigation"
        aria-label={t('하단 탐색')}
      >
        {subscriberMode ? (
          <>
            {(
              [
                { id: 'roadmap' as const, label: '대시보드', icon: LayoutDashboard, onClick: () => onSwitchView('roadmap'), active: viewId === 'roadmap' },
                { id: 'library' as const, label: '라이브러리', icon: Grid, onClick: () => onOpenLibraryAll(), active: programLibraryActive },
                ...(onOpenSpomove
                  ? [{ id: 'spomove' as const, label: 'SPOMOVE', icon: Gamepad2, onClick: () => onOpenSpomove(), active: spomoveActive }]
                  : []),
                { id: 'shop' as const, label: '교구 샵', icon: ShoppingBag, onClick: () => onSwitchView('shop'), active: viewId === 'shop' },
                { id: 'ai' as const, label: '리포트', icon: Bot, onClick: () => onSwitchView('ai'), active: viewId === 'ai' },
                { id: 'settings' as const, label: '플랜', icon: CreditCard, onClick: () => onSwitchView('settings'), active: viewId === 'settings' },
              ] as const
            ).map(({ id, label, icon: Icon, onClick, active }) => (
              <button
                key={id}
                type="button"
                onClick={onClick}
                aria-label={t(label)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl flex-1 min-h-[52px] max-w-[4.5rem] transition-colors ${
                  active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active ? <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-400" /> : null}
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight line-clamp-2 text-center">{t(label)}</span>
              </button>
            ))}
          </>
        ) : (
          MOBILE_TABS.map(({ id, label, icon: Icon }) => {
            const active = viewId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => (id === 'library' ? onOpenLibraryAll() : onSwitchView(id))}
                aria-label={t(label)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl flex-1 min-h-[52px] max-w-[4.5rem] transition-colors ${
                  active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active ? <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-400" /> : null}
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight line-clamp-2 text-center">{t(label)}</span>
              </button>
            );
          })
        )}
        {isEditMode && onOpenCurationDrawer && (
          <button
            type="button"
            onClick={onOpenCurationDrawer}
            aria-label={t('대시보드 편집')}
            className="flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl flex-1 min-h-[52px] max-w-[4.5rem] text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[11px] font-semibold leading-tight">{t('편집')}</span>
          </button>
        )}
      </nav>
    </>
  );
}
