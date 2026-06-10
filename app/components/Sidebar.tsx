'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSidebar } from '@/app/providers/AppSidebarProvider';
import {
  BookOpen,
  Box,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import {
  ADMIN_CONSULT_PENDING_REFRESH,
  loadConsultPendingCount,
} from '@/app/lib/admin/consultPendingBadge';

interface SidebarProps {
  isDesktopOpen?: boolean;
  onToggleDesktop?: () => void;
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

export default function Sidebar({ isDesktopOpen = true, onToggleDesktop }: SidebarProps) {
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
    const loadUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;

    let cancelled = false;

    const refresh = async () => {
      const count = await loadConsultPendingCount();
      if (!cancelled && count !== null) {
        setConsultPendingCount(count);
      }
    };

    void refresh();

    const interval = window.setInterval(() => void refresh(), 60_000);
    const onRefresh = () => void refresh();
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (!document.hidden) void refresh();
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
      await getSupabaseBrowserClient().auth.signOut();
    } catch (error) {
      devLogger.error('Logout error:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  const adminMenuItems: MenuGroup[] = [
    {
      group: '대시보드',
      items: [{ name: '관리 홈', href: '/admin', icon: LayoutDashboard }],
    },
    {
      group: '운영 관리',
      items: [
        { name: '노트', href: '/admin/note', icon: ClipboardList },
        { name: '수업 관리', href: '/admin/classes-v2/calendar', icon: Calendar },
        { name: '피드백 관리', href: '/admin/teachers-classes', icon: CheckCircle },
        { name: '센터 관리', href: '/admin/centers', icon: Building2 },
        { name: '교구·재고', href: '/admin/inventory', icon: Box },
      ],
    },
    {
      group: '콘텐츠',
      items: [
        { name: '커리큘럼', href: '/admin/curriculum', icon: BookOpen },
        { name: 'SPOMOVE', href: '/admin/spomove/training', icon: Sparkles },
      ],
    },
    {
      group: '구독 서비스',
      items: [
        { name: '스포키듀 구독 NEW', href: '/admin/spokedu-master/programs', icon: Sparkles },
        { name: 'SPOKEDU MASTER', href: '/spokedu-master/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: '사람',
      items: [
        { name: '강사 관리', href: '/admin/users', icon: Users },
        ...(userEmail === 'choijihoon@spokedu.com' ? [{ name: '정산 리포트', href: '/admin/master/reports', icon: CreditCard }] : []),
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

  if (!isAdminRoute && !isSubscriber) return null;

  const groups = isSubscriber ? subscriberMenuItems : adminMenuItems;

  const isActiveItem = (href: string) => {
    if (href === '/admin/spokedu-master/programs') {
      return pathname.startsWith('/admin/spokedu-master');
    }
    if (href === '/spokedu-master/dashboard') {
      return pathname.startsWith('/spokedu-master');
    }
    if (href === '/admin/spomove/training') {
      return pathname.startsWith('/admin/spomove');
    }
    if (href === '/admin/iiwarmup') {
      return pathname === '/admin/iiwarmup' || pathname.startsWith('/admin/iiwarmup/assets') || pathname.startsWith('/admin/iiwarmup/flow');
    }
    if (href.includes('#')) {
      return pathname.startsWith(href.split('#')[0]);
    }
    return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLAnchorElement>, item: MenuItem) => {
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
      <div className="fixed left-0 top-0 z-[300] flex h-12 w-full items-center justify-between bg-[#1e293b] px-4 pt-[env(safe-area-inset-top)] shadow-lg md:hidden md:pt-0">
        <h1 className="text-lg font-semibold uppercase italic tracking-tighter text-blue-400">SPOKEDU</h1>
        <button
          onClick={toggleMobile}
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg bg-slate-800 p-2 text-white outline-none transition-colors hover:bg-slate-700 active:bg-slate-600"
          aria-label={isMobileOpen ? '사이드바 닫기' : '사이드바 열기'}
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileOpen ? (
        <button className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기" />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-[260] flex h-screen w-64 flex-col bg-[#1e293b] text-white transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDesktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
      >
        <div className="hidden border-b border-slate-700 p-6 text-left md:block">
          <h1 className="text-xl font-semibold uppercase italic tracking-tighter text-blue-400">SPOKEDU</h1>
          <p className="mt-1 text-[10px] font-medium uppercase text-slate-400">{isAdminRoute ? 'Admin Portal' : 'Warm-up Portal'}</p>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-3 pt-[calc(3rem+env(safe-area-inset-top,0px))] text-left md:pt-3">
          {groups.map((group, groupIndex) => (
            <div key={group.group} className={`space-y-0.5 text-left ${groupIndex > 0 ? 'mt-3 border-t border-slate-700 pt-3' : ''}`}>
              <h3 className="px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{group.group}</h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.disabled && isActiveItem(item.href);
                  const baseClass = `group flex min-h-[40px] touch-manipulation items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all ${
                    item.disabled
                      ? 'pointer-events-none cursor-not-allowed text-slate-500 opacity-40'
                      : isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                  }`;

                  if (item.disabled) {
                    return (
                      <div key={item.href} className={baseClass} aria-disabled>
                        <Icon size={18} className="text-slate-500" />
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="ml-auto text-[10px] text-slate-500">개발 예정</span>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.href} href={item.href} onClick={(event) => handleMenuClick(event, item)} className={baseClass}>
                      <Icon size={18} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                      <span className="text-sm font-medium">{item.name}</span>
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

        <div className="border-t border-slate-700 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center gap-3 border-b border-slate-800 px-2 py-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <User size={16} />
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-left text-[10px] font-medium uppercase tracking-tight text-slate-500">Account</p>
              <p className="truncate text-left text-[11px] font-medium text-slate-200">{userEmail || 'Admin'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="group flex w-full items-center gap-3 p-2 text-slate-500 transition-colors hover:text-rose-400">
            <LogOut size={18} className="transition-transform group-hover:rotate-12" />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {onToggleDesktop ? (
        <button
          onClick={onToggleDesktop}
          className="fixed bottom-4 left-4 z-[300] hidden h-10 w-10 items-center justify-center rounded-xl bg-[#1e293b] text-slate-300 shadow-lg transition-colors hover:bg-slate-700 hover:text-white md:flex"
          title={isDesktopOpen ? '사이드바 닫기' : '사이드바 열기'}
        >
          {isDesktopOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      ) : null}
    </>
  );
}
