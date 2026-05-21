'use client';

import { BookOpen, FileText, Home, User, Zap } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const TAB_DEFS = [
  { key: 'dashboard', label: '홈', Icon: Home },
  { key: 'library', label: '라이브러리', Icon: BookOpen },
  { key: 'spomove', label: 'SPOMOVE', Icon: Zap },
  { key: 'report', label: '설명 도구', Icon: FileText },
  { key: 'profile', label: '내 정보', Icon: User },
] as const;

function useSubscriberTabs(basePath: string) {
  return TAB_DEFS.map((tab) => ({ ...tab, href: `${basePath}/${tab.key}` }));
}

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useSubscriberTabs(basePath);

  return (
    <nav
      className="sticky bottom-0 z-50 shrink-0 border-t px-3 pt-2 sm:px-6 lg:hidden"
      style={{ borderColor: 'var(--spm-br2)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      aria-label="SPOKEDU MASTER 주요 메뉴"
    >
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
              aria-label={label}
            >
              <span className="grid h-7 w-7 place-items-center rounded-[9px]" style={{ background: active ? 'var(--spm-acc)' : 'transparent', boxShadow: active ? '0 8px 20px rgba(99,102,241,0.32)' : 'none' }}>
                <Icon size={16} strokeWidth={1.8} color={active ? '#ffffff' : 'var(--spm-t3)'} />
              </span>
              <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none" style={{ color: active ? '#a5b4fc' : 'var(--spm-t3)' }}>
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

  return (
    <aside className="hidden w-[208px] shrink-0 border-r px-4 py-5 lg:block" style={{ borderColor: 'var(--spm-br2)', background: 'rgba(7,7,12,0.72)' }} aria-label="SPOKEDU MASTER 데스크톱 메뉴">
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
              aria-label={label}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-6 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <p className="text-[10px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>
          문의: <a href="mailto:support@spokedu.com" style={{ color: 'var(--spm-acc)' }}>support@spokedu.com</a>
        </p>
      </div>
    </aside>
  );
}
