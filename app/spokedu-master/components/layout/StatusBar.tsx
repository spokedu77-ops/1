'use client';

import { BookOpen, CircleUserRound, ClipboardList, Home, MessageSquare, Search, Tv, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOperationalStatus } from '../../store';

const APP_LINKS = [
  { href: '/spokedu-master/dashboard', label: '홈', Icon: Home },
  { href: '/spokedu-master/library', label: '라이브러리', Icon: BookOpen },
  { href: '/spokedu-master/spomove', label: 'SPOMOVE', Icon: Tv },
  { href: '/spokedu-master/report', label: '안내문', Icon: MessageSquare },
  { href: '/spokedu-master/class-record', label: '수업 기록', Icon: ClipboardList },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StatusBar() {
  const pathname = usePathname();
  const operational = useOperationalStatus();

  return (
    <header
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b px-4 sm:px-6 lg:px-8"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(22px)', borderColor: '#e2e8f0' }}
    >
      <div className="mx-auto flex w-full max-w-[1376px] items-center justify-between gap-4">
        <Link
          href="/spokedu-master/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-[12px] px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          aria-label="SPOKEDU MASTER 홈"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-indigo-600 text-[11px] font-black text-white">SM</span>
          <span className="hidden items-baseline gap-1.5 sm:flex">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">SPOKEDU</span>
            <span className="text-[15px] font-black text-slate-900">MASTER</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 lg:flex" aria-label="SPOKEDU MASTER 데스크톱 메뉴">
          {APP_LINKS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-[13px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                style={{ background: active ? 'rgba(79,70,229,0.09)' : 'transparent', color: active ? '#4338ca' : '#475569' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.9} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/spokedu-master/library"
            className="grid h-11 w-11 place-items-center rounded-[12px] border border-slate-200 bg-white text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            aria-label="라이브러리"
          >
            <Search size={17} />
          </Link>
          <span
            className="hidden min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black sm:inline-flex"
            style={{ background: operational.online ? 'rgba(16,185,129,0.11)' : 'rgba(245,158,11,0.12)', color: operational.online ? '#047857' : '#b45309' }}
            role="status"
          >
            {operational.online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {operational.online ? '인터넷 연결됨' : '인터넷 연결 없음'}
          </span>
          <Link
            href="/spokedu-master/profile"
            className="grid h-11 w-11 place-items-center rounded-[12px] bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            aria-label="계정 및 이용권"
          >
            <CircleUserRound size={18} color="#fff" />
          </Link>
        </div>
      </div>
    </header>
  );
}
