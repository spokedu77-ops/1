'use client';

import { BookOpen, ClipboardCheck, Home, ShoppingBag, User, UsersRound, Zap } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile } from '../../store';

const TEACHER_TABS = [
  { href: '/spokedu-master/dashboard', label: '홈', Icon: Home },
  { href: '/spokedu-master/library', label: '라이브러리', Icon: BookOpen },
  { href: '/spokedu-master/spomove', label: 'SPOMOVE', Icon: Zap },
  { href: '/spokedu-master/class-record', label: '기록', Icon: ClipboardCheck },
  { href: '/spokedu-master/profile', label: '내 정보', Icon: User },
] as const;

const DIRECTOR_TABS = [
  { href: '/spokedu-master/dashboard', label: '홈', Icon: Home },
  { href: '/spokedu-master/director', label: '센터', Icon: UsersRound },
  { href: '/spokedu-master/students', label: '학생', Icon: ClipboardCheck },
  { href: '/spokedu-master/report', label: '리포트', Icon: BookOpen },
  { href: '/spokedu-master/shop', label: '교구', Icon: ShoppingBag },
  { href: '/spokedu-master/profile', label: '내 정보', Icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const tabs = profile?.role === 'director' ? DIRECTOR_TABS : TEACHER_TABS;

  return (
    <nav className="sticky bottom-0 z-50 shrink-0 border-t px-3 py-2 sm:px-6 sm:pb-4 lg:hidden" style={{ borderColor: 'var(--spm-br2)' }}>
      <div
        className="mx-auto grid h-[58px] w-full max-w-[760px] rounded-[18px] border"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          background: 'rgba(12,12,18,0.96)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--spm-br2)',
          boxShadow: '0 -14px 34px rgba(0,0,0,0.25)',
        }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <button
              key={href}
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
                router.push(href);
              }}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-50"
              aria-current={active ? 'page' : undefined}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-[9px]"
                style={{
                  background: active ? 'var(--spm-acc)' : 'transparent',
                  boxShadow: active ? '0 8px 20px rgba(99,102,241,0.32)' : 'none',
                }}
              >
                <Icon size={16} strokeWidth={1.8} color={active ? '#ffffff' : 'var(--spm-t3)'} />
              </span>
              <span className="truncate text-[10px] font-bold" style={{ color: active ? '#a5b4fc' : 'var(--spm-t3)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopRail() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const tabs = profile?.role === 'director' ? DIRECTOR_TABS : TEACHER_TABS;

  return (
    <aside className="hidden w-[184px] shrink-0 border-r px-3 py-5 lg:block" style={{ borderColor: 'var(--spm-br2)', background: 'rgba(7,7,12,0.62)' }}>
      <div className="px-3 pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--spm-t3)' }}>SPOKEDU</p>
        <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>MASTER</h2>
      </div>
      <div className="space-y-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[13px] font-black transition-colors"
              style={{ background: active ? 'var(--spm-acc)' : 'transparent', color: active ? '#fff' : 'var(--spm-t3)' }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
