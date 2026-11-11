'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import { BrandLogo } from '@/app/spokedu/components/brand-logo';
import {
  BookOpen,
  Box,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Settings,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import { logoutCurrentSession } from '@/app/lib/auth/logoutSession';
import {
  ADMIN_CONSULT_PENDING_REFRESH,
  loadConsultPendingCount,
} from '@/app/lib/admin/consultPendingBadge';

interface SidebarProps {
  isDesktopOpen?: boolean;
  onToggleDesktop?: () => void;
  overlayOnly?: boolean;
  hideHeader?: boolean;
}

type MenuItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
};

type MenuGroup = {
  group: string;
  items: MenuItem[];
};

export default function Sidebar({ isDesktopOpen = true, onToggleDesktop, overlayOnly = false, hideHeader = false }: SidebarProps) {
  const pathname = usePathname();
  const { isMobileOpen, setMobileOpen, toggleMobile } = useAppSidebar();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [consultPendingCount, setConsultPendingCount] = useState(0);

  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/spokedu-master') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/class');

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen, setMobileOpen]);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const session = await getSessionWithRefreshRecovery(supabase);
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;

    let cancelled = false;

    const refresh = async (force = false) => {
      const count = await loadConsultPendingCount({ force });
      if (!cancelled && count !== null) {
        setConsultPendingCount(count);
      }
    };

    void refresh(true);

    // 탭이 보일 때만 5분마다 갱신 (기존 60초 전역 폴링 대체)
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh(false);
    }, 5 * 60_000);
    const onRefresh = () => void refresh(true);
    const onFocus = () => void refresh(false);
    const onVisibility = () => {
      if (!document.hidden) void refresh(false);
    };

    window.addEventListener(ADMIN_CONSULT_PENDING_REFRESH, onRefresh);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(ADMIN_CONSULT_PENDING_REFRESH, onRefresh);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAdminRoute]);

  const handleLogout = async () => {
    try {
      await logoutCurrentSession();
    } catch (error) {
      devLogger.error('Logout error:', error);
    } finally {
      window.location.replace('/login');
    }
  };

  const adminMenuItems: MenuGroup[] = [
    {
      group: '',
      items: [{ name: '관리 홈', href: '/admin', icon: LayoutDashboard }],
    },
    {
      group: '01 수업 운영',
      items: [
        { name: '수업 일정', href: '/admin/classes/calendar', icon: Calendar },
        { name: '기관·개인 관리', href: '/admin/centers', icon: Building2 },
        { name: '수업 검수', href: '/admin/teachers-classes', icon: CheckCircle },
        { name: '교구·재고', href: '/admin/inventory', icon: Box },
        ...(userEmail === 'choijihoon@spokedu.com' ? [{ name: '정산 관리', href: '/admin/master/reports', icon: CreditCard }] : []),
      ],
    },
    {
      group: '02 교육 콘텐츠',
      items: [
        { name: '커리큘럼 관리', href: '/admin/curriculum', icon: BookOpen },
        { name: '블로그 원고', href: '/admin/blog-drafts', icon: ClipboardList },
        { name: 'SPOMOVE 관리', href: '/admin/spomove/training', icon: Sparkles },
      ],
    },
    {
      group: '03 LAB 구독 서비스',
      items: [
        { name: 'LAB 프로그램 관리', href: '/admin/spokedu-lab/programs', icon: BookOpen },
        { name: 'LAB SPOMOVE', href: '/admin/spokedu-lab/spomove', icon: Sparkles },
        { name: 'LAB 운영 관리', href: '/admin/spokedu-lab-admin', icon: Settings },
        { name: 'LAB 서비스 보기', href: '/spokedu-lab/dashboard', icon: ExternalLink },
      ],
    },
  ];

  const subscriberMenuItems: MenuGroup[] = [
    {
      group: '계정 관리',
      items: [{ name: '플랜 & 결제', href: '/billing', icon: CreditCard }],
    },
  ];

  const isSubscriber = pathname.startsWith('/billing');
  const isSpomoveAccount = userEmail?.toLowerCase() === 'spomove@spokedu.com';
  const mobileHeaderBreakpoint = overlayOnly ? '' : isAdminRoute ? 'min-[1200px]:hidden' : 'md:hidden';
  const desktopSidebarTransform = overlayOnly ? '' : isAdminRoute
    ? isDesktopOpen
      ? 'min-[1200px]:translate-x-0'
      : 'min-[1200px]:-translate-x-full'
    : isDesktopOpen
      ? 'md:translate-x-0'
      : 'md:-translate-x-full';
  const desktopOnlyDisplay = isAdminRoute ? 'min-[1200px]:flex' : 'md:flex';
  const desktopOnlyBlock = overlayOnly ? '' : isAdminRoute ? 'min-[1200px]:block' : 'md:block';
  const desktopNavPadding = overlayOnly ? '' : isAdminRoute ? 'min-[1200px]:pt-2' : 'md:pt-2';
  const drawerWidth = overlayOnly ? 'w-[min(84vw,240px)]' : isAdminRoute ? 'w-[min(84vw,240px)] min-[1200px]:w-[var(--admin-sidebar-width)]' : 'w-64';

  if (!isAdminRoute && !isSubscriber) return null;

  const groups = isSubscriber
    ? subscriberMenuItems
    : isSpomoveAccount
      ? [{ group: 'SPOMOVE', items: [{ name: 'SPOMOVE Training', href: '/admin/spomove/training', icon: Sparkles }] }]
      : adminMenuItems;

  const isActiveItem = (href: string) => {
    if (href === '/admin/classes/calendar') return pathname === href;
      if (href === '/admin/spokedu-lab/programs') {
        return pathname === href || pathname.startsWith('/admin/spokedu-lab/library');
    }
      if (href === '/admin/spokedu-lab/spomove') {
        return pathname.startsWith('/admin/spokedu-lab/spomove');
    }
      if (href === '/spokedu-lab/dashboard') {
      return pathname.startsWith('/spokedu-master');
    }
    if (href === '/admin/spokedu-lab-admin') {
      return pathname.startsWith('/admin/spokedu-master-admin');
    }
    if (href === '/admin/spomove/training') {
      return pathname.startsWith('/admin/spomove');
    }
    if (href === '/admin/blog-drafts') {
      return pathname.startsWith('/admin/blog-drafts') || pathname.startsWith('/admin/field-records');
    }
    if (href === '/admin/iiwarmup') {
      return pathname === '/admin/iiwarmup' || pathname.startsWith('/admin/iiwarmup/assets');
    }
    if (href.includes('#')) {
      return pathname.startsWith(href.split('#')[0]);
    }
    return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLAnchorElement>, item: MenuItem) => {
    setMobileOpen(false);
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    if (item.href.includes('#')) {
      event.preventDefault();
      const [path, hash] = item.href.split('#');
      if (pathname !== path) {
        window.location.href = item.href;
        return;
      }
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {!hideHeader && <header className={`fixed inset-x-0 top-0 z-[300] flex h-[calc(var(--app-header-height)+env(safe-area-inset-top,0px))] min-w-0 items-center justify-between gap-4 bg-[#1e293b] px-4 pt-[env(safe-area-inset-top,0px)] shadow-sm ${mobileHeaderBreakpoint}`}>
        <BrandLogo onDark size="sm" className="min-h-11 min-w-0 shrink-0" />
        <button
          type="button"
          onClick={toggleMobile}
          className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-lg p-0 text-white transition-colors hover:bg-slate-700 active:bg-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label={isMobileOpen ? '사이드바 닫기' : '사이드바 열기'}
          aria-expanded={isMobileOpen}
          aria-controls="app-navigation"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>}

      {isMobileOpen ? (
        <button className={`fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm ${mobileHeaderBreakpoint}`} onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기" />
      ) : null}

      <aside
        id="app-navigation"
        aria-label={isAdminRoute ? '관리자 메뉴' : '계정 메뉴'}
        inert={overlayOnly && !isMobileOpen}
        data-admin-sidebar={pathname.startsWith('/admin') && !overlayOnly ? 'true' : undefined}
        className={`fixed !left-0 !top-0 z-[260] m-0 flex h-[var(--viewport-height-px,100dvh)] max-h-[var(--viewport-height-px,100dvh)] ${drawerWidth} flex-col overflow-hidden bg-[#1e293b] pb-[env(safe-area-inset-bottom,0px)] text-white transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${desktopSidebarTransform}`}
      >
        <div className={`hidden border-b border-slate-700 px-4 py-3 text-left ${desktopOnlyBlock}`}>
          <BrandLogo onDark size="sm" />
          <p className="mt-1.5 text-[10px] font-medium uppercase leading-none text-slate-400">{isAdminRoute ? 'Admin Portal' : 'Warm-up Portal'}</p>
        </div>

        <nav className={`scrollbar-hide min-h-0 flex-1 overflow-y-auto p-2 pt-[calc(var(--app-header-height)+env(safe-area-inset-top,0px)+0.5rem)] text-left ${desktopNavPadding}`}>
          {groups.map((group, groupIndex) => (
            <div key={group.group} className={`space-y-0 text-left ${groupIndex > 0 ? 'mt-2 border-t border-slate-700 pt-2' : ''}`}>
              {group.group && <h3 className="px-2.5 py-0.5 text-left text-[11px] font-semibold leading-5 text-slate-400">{group.group}</h3>}
              <div className="space-y-0">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.disabled && isActiveItem(item.href);
                  const baseClass = `group flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg px-2 py-1.5 transition-all ${pathname.startsWith('/admin') ? 'min-[1200px]:min-h-[40px]' : ''} ${
                    item.disabled
                      ? 'pointer-events-none cursor-not-allowed text-slate-500 opacity-40'
                      : isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                  }`;

                  if (item.disabled) {
                    return (
                      <div key={item.href} className={baseClass} aria-disabled>
                        <Icon size={17} className="text-slate-500" />
                        <span className={`${isAdminRoute ? 'text-xs' : 'text-sm'} font-medium leading-5`}>{item.name}</span>
                        <span className="ml-auto text-[10px] text-slate-500">개발 예정</span>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.href} href={item.href} onClick={(event) => handleMenuClick(event, item)} className={baseClass}>
                      <Icon size={17} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                      <span className="text-sm font-medium leading-5">{item.name}</span>
                      {item.href === '/admin' && consultPendingCount > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                          +{consultPendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-700 bg-slate-900/50 px-3 py-2">
          <div className="flex items-center gap-2 border-b border-slate-800 px-1.5 py-1">
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400">
              <User size={16} />
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-left text-[9px] font-medium uppercase leading-3 tracking-tight text-slate-500">Account</p>
              <p className="truncate text-left text-xs font-medium leading-5 text-slate-200">{userEmail || 'Admin'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="group flex min-h-[44px] w-full touch-manipulation items-center gap-2.5 px-1.5 py-2 text-slate-500 transition-colors hover:text-rose-400">
            <LogOut size={17} className="transition-transform group-hover:rotate-12" />
            <span className={`${isAdminRoute ? 'text-xs' : 'text-sm'} font-medium`}>로그아웃</span>
          </button>
        </div>
      </aside>

      {onToggleDesktop && !overlayOnly ? (
        <button
          onClick={onToggleDesktop}
          className={`fixed bottom-4 left-4 z-[300] hidden h-11 w-11 items-center justify-center rounded-xl bg-[#1e293b] text-slate-300 shadow-lg transition-colors hover:bg-slate-700 hover:text-white ${desktopOnlyDisplay}`}
          title={isDesktopOpen ? '사이드바 닫기' : '사이드바 열기'}
        >
          {isDesktopOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      ) : null}
    </>
  );
}
