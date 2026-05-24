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

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useSubscriberTabs(basePath);

  return (
    <nav
      className="sticky bottom-0 z-50 shrink-0 border-t px-3 pt-2 sm:px-6 lg:hidden"
      style={{ borderColor: '#e2e8f0', background: 'rgba(245,247,251,0.9)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      aria-label="SPOKEDU MASTER 주요 메뉴"
    >
      <div
        className="mx-auto grid h-[58px] w-full max-w-[760px] rounded-[18px] border"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          borderColor: '#e2e8f0',
          boxShadow: '0 -14px 34px rgba(15,23,42,0.08)',
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
              <span className="grid h-7 w-7 place-items-center rounded-[9px]" style={{ background: active ? 'var(--spm-acc)' : 'transparent', boxShadow: active ? '0 8px 20px rgba(99,102,241,0.28)' : 'none' }}>
                <Icon size={16} strokeWidth={1.8} color={active ? '#ffffff' : '#94a3b8'} />
              </span>
              <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none" style={{ color: active ? '#4f46e5' : '#94a3b8' }}>
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
    <aside className="hidden w-[208px] shrink-0 border-r px-4 py-5 lg:block" style={{ borderColor: '#e2e8f0', background: 'rgba(255,255,255,0.82)' }} aria-label="SPOKEDU MASTER 데스크톱 메뉴">
      <div className="px-3 pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>SPOKEDU</p>
        <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: '#0f172a', letterSpacing: 0 }}>MASTER</h2>
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
              style={{ background: active ? 'var(--spm-acc)' : 'transparent', color: active ? '#fff' : '#94a3b8' }}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-6 rounded-[14px] p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <p className="text-[11px] font-black" style={{ color: '#0f172a' }}>수업 실행 루프</p>
        <p className="mt-1 text-[10px] font-semibold leading-5" style={{ color: '#64748b' }}>
          수업안, 큰 화면, 설명 문구를 한 번에 이어갑니다.
        </p>
      </div>
    </aside>
  );
}
