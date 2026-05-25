'use client';

import { BookOpen, FileText, Home, User, Zap } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const TAB_DEFS = [
  { key: 'dashboard', label: '홈', Icon: Home },
  { key: 'library', label: '라이브러리', Icon: BookOpen },
  { key: 'spomove', label: 'SPOMOVE', Icon: Zap },
  { key: 'report', label: '설명 문구', Icon: FileText },
  { key: 'profile', label: '계정', Icon: User },
] as const;

function useSubscriberTabs(basePath: string) {
  return TAB_DEFS.map((tab) => ({ ...tab, href: `${basePath}/${tab.key}` }));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useSubscriberTabs(basePath);
  const darkChrome = pathname === basePath || pathname.startsWith(`${basePath}/dashboard`);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 shrink-0 border-t px-3 pt-2 sm:px-6 lg:hidden"
      style={{
        borderColor: darkChrome ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
        background: darkChrome ? 'rgba(10,10,10,0.92)' : 'rgba(245,247,251,0.9)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
      aria-label="SPOKEDU MASTER 주요 메뉴"
    >
      <div
        className="mx-auto grid h-[58px] w-full max-w-[760px] rounded-[18px] border"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          background: darkChrome ? 'rgba(24,24,27,0.96)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          borderColor: darkChrome ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
          boxShadow: darkChrome ? '0 -14px 34px rgba(0,0,0,0.35)' : '0 -14px 34px rgba(15,23,42,0.08)',
        }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
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
              aria-label={label}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-[9px]"
                style={{
                  background: active ? (darkChrome ? '#ffffff' : 'var(--spm-acc)') : 'transparent',
                  boxShadow: active && !darkChrome ? '0 8px 20px rgba(99,102,241,0.28)' : 'none',
                }}
              >
                <Icon size={16} strokeWidth={1.8} color={active ? (darkChrome ? '#0a0a0a' : '#ffffff') : darkChrome ? '#71717a' : '#94a3b8'} />
              </span>
              <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none" style={{ color: active ? (darkChrome ? '#ffffff' : '#4f46e5') : darkChrome ? '#71717a' : '#94a3b8' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopRail({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useSubscriberTabs(basePath);
  const darkChrome = pathname === basePath || pathname.startsWith(`${basePath}/dashboard`);

  return (
    <aside
      className="hidden w-[208px] shrink-0 border-r px-4 py-5 lg:block"
      style={{
        borderColor: darkChrome ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
        background: darkChrome ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.82)',
      }}
      aria-label="SPOKEDU MASTER 데스크톱 메뉴"
    >
      <div className="px-3 pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: darkChrome ? '#71717a' : '#94a3b8' }}>
          SPOKEDU
        </p>
        <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: darkChrome ? '#ffffff' : '#0f172a', letterSpacing: 0 }}>
          MASTER
        </h2>
      </div>
      <div className="space-y-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[13px] font-black transition-colors"
              style={{
                background: active ? (darkChrome ? '#ffffff' : 'var(--spm-acc)') : 'transparent',
                color: active ? (darkChrome ? '#0a0a0a' : '#ffffff') : darkChrome ? '#71717a' : '#94a3b8',
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
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
