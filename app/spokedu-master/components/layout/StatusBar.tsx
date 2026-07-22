'use client';

import { BookOpen, CircleUserRound, FileText, Home, Search, Tv, Wifi, WifiOff, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOperationalStatus } from '../../store';

const APP_LINKS = [
  { href: '/spokedu-master/dashboard', label: '홈', Icon: Home },
  { href: '/spokedu-master/library', label: '수업자료', Icon: BookOpen },
  { href: '/spokedu-master/spomove', label: 'SPOMOVE', Icon: Tv },
  { href: '/spokedu-master/class-tools', label: '수업도구', Icon: Wrench },
  { href: '/spokedu-master/activity', label: '기록', Icon: FileText },
  { href: '/spokedu-master/profile', label: '프로필', Icon: CircleUserRound },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StatusBar() {
  const pathname = usePathname();
  const operational = useOperationalStatus();

  return (
    <header
      className="sticky top-0 z-40 flex min-h-16 shrink-0 items-center border-b px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(22px)', borderColor: '#e2e8f0' }}
    >
      <div className="mx-auto flex w-full max-w-[1376px] items-center justify-between gap-4">
        <Link
          href="/spokedu-master/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-[12px] px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
          aria-label="SPOKEDU MASTER 홈"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[var(--spm-acc)] text-[11px] font-black text-white">SM</span>
          <span className="hidden items-baseline gap-1.5 sm:flex">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">SPOKEDU</span>
            <span className="text-[15px] font-black text-slate-900">MASTER</span>
          </span>
        </Link>

        <nav
          className="hidden min-w-0 max-w-full items-center gap-0.5 overflow-x-auto lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="SPOKEDU MASTER 데스크톱 메뉴"
        >
          {APP_LINKS.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[12px] px-2.5 text-[12px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)] xl:gap-2 xl:px-3 xl:text-[13px]"
                style={{ background: active ? 'rgba(79,70,229,0.09)' : 'transparent', color: active ? '#4338ca' : '#475569' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.9} className="shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/spokedu-master/library"
            className="grid h-11 w-11 place-items-center rounded-[12px] border border-slate-200 bg-white text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--spm-acc)]"
            aria-label="라이브러리"
          >
            <Search size={17} />
          </Link>
          <span
            className="hidden min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black sm:inline-flex"
            style={{ background: operational.online ? 'var(--spm-grn-a11)' : 'var(--spm-amb-a12)', color: operational.online ? 'var(--spm-grn-strong)' : 'var(--spm-amb-strong)' }}
            role="status"
          >
            {operational.online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {operational.online ? '인터넷 연결됨' : '인터넷 연결 없음'}
          </span>
          <Link
            href="/spokedu-master/profile"
            className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--spm-acc)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
            aria-label="계정 및 구독"
          >
            <CircleUserRound size={18} color="#fff" />
          </Link>
        </div>
      </div>
    </header>
  );
}
