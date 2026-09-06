'use client';

import { BookOpen, CalendarDays, CircleUserRound, Heart, Home, WifiOff, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOperationalStatus } from '../../store';
import { MASTER_NAV_ITEMS } from './masterNavLabels';

const NAV_ICONS = {
  dashboard: Home,
  programs: BookOpen,
  favorites: Heart,
  manage: CalendarDays,
  'class-tools': Wrench,
} as const;

const APP_LINKS = MASTER_NAV_ITEMS.map((item) => ({
  href: item.href,
  label: item.label,
  Icon: NAV_ICONS[item.key],
}));

function isActivePath(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href.endsWith('/programs')) {
    return pathname.startsWith('/spokedu-master/library') || pathname.startsWith('/spokedu-master/spomove');
  }
  if (href.endsWith('/manage')) {
    return pathname.startsWith('/spokedu-master/activity')
      || pathname.startsWith('/spokedu-master/classes')
      || pathname.startsWith('/spokedu-master/class-record');
  }
  return false;
}

export function StatusBar() {
  const pathname = usePathname();
  const operational = useOperationalStatus();

  return (
    <header
      className="sticky top-0 z-40 flex min-h-16 shrink-0 items-center border-b px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(22px)', borderColor: '#e2e8f0' }}
    >
      <div className="mx-auto flex w-full max-w-[1376px] items-center justify-between gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <Link
          href="/spokedu-master/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-[12px] px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] lg:justify-self-start"
          aria-label="SPOKEDU MASTER 홈"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-slate-950 text-[11px] font-black text-white">SM</span>
          <span className="hidden items-baseline gap-1.5 sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">SPOKEDU</span>
            <span className="text-[15px] font-semibold text-slate-900">MASTER</span>
          </span>
        </Link>

        <nav
          className="hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto lg:flex lg:justify-self-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="SPOKEDU MASTER 데스크톱 메뉴"
        >
          {APP_LINKS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-[12px] font-semibold transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)] xl:gap-2 xl:px-3 xl:text-[13px] ${active ? 'text-slate-950' : 'text-slate-600'}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.9} className="shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
                {active ? <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-slate-950" aria-hidden /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:justify-self-end">
          {!operational.online ? <span
            className="hidden min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black sm:inline-flex"
            style={{ background: 'var(--spm-amb-a12)', color: 'var(--spm-amb-strong)' }}
            role="status"
          >
            <WifiOff size={13} />
            인터넷 연결 없음
          </span> : null}
          <Link
            href="/spokedu-master/profile"
            className="grid h-11 w-11 place-items-center rounded-[12px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
            aria-label="계정 및 구독"
          >
            <CircleUserRound size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
