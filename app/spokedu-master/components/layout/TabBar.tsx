'use client';

import { BookOpen, ClipboardList, Home, Menu, MessageSquare, Tv, UserRound, Wrench } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';

const PRIMARY_TABS = [
  { key: 'dashboard', label: '홈', Icon: Home },
  { key: 'library', label: '놀이체육', Icon: BookOpen },
  { key: 'spomove', label: '스포무브', Icon: Tv },
  { key: 'class-tools', label: '수업도구', Icon: Wrench },
] as const;

const SECONDARY_TABS = [
  { key: 'class-record', label: '수업기록', caption: '출석, 참여도, 성장 기록', Icon: ClipboardList },
  { key: 'report', label: '학부모안내', caption: '피드백 리포트와 안내 문구', Icon: MessageSquare },
  { key: 'profile', label: '계정', caption: '구독, 스토어, 내 정보', Icon: UserRound },
] as const;

const DESKTOP_TABS = [...PRIMARY_TABS, ...SECONDARY_TABS] as const;

function withHref<T extends { key: string }>(tabs: readonly T[], basePath: string) {
  return tabs.map((tab) => ({ ...tab, href: `${basePath}/${tab.key}` }));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryTabs = withHref(PRIMARY_TABS, basePath);
  const secondaryTabs = withHref(SECONDARY_TABS, basePath);
  const secondaryActive = secondaryTabs.some((tab) => isActivePath(pathname, tab.href));

  const go = (href: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    setMoreOpen(false);
    router.push(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 shrink-0 border-t px-2 pt-2 sm:px-6 lg:hidden"
        style={{
          borderColor: '#e2e8f0',
          background: 'rgba(245,247,251,0.9)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
        aria-label="SPOKEDU MASTER 주요 메뉴"
      >
        <div
          className="mx-auto grid h-[62px] w-full max-w-[620px] grid-cols-5 rounded-[18px] border"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)',
            borderColor: '#e2e8f0',
            boxShadow: '0 -14px 34px rgba(15,23,42,0.08)',
          }}
        >
          {primaryTabs.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-50"
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-[9px]"
                  style={{
                    background: active ? 'var(--spm-acc)' : 'transparent',
                    boxShadow: active ? '0 8px 20px rgba(99,102,241,0.28)' : 'none',
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} color={active ? '#ffffff' : '#94a3b8'} />
                </span>
                <span
                  className="max-w-full whitespace-nowrap px-0.5 text-[10px] font-bold leading-none tracking-[-0.01em]"
                  style={{ color: active ? '#4f46e5' : '#94a3b8' }}
                >
                  {label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-50"
            aria-current={secondaryActive ? 'page' : undefined}
            aria-label="더보기"
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-[9px]"
              style={{
                background: secondaryActive ? 'var(--spm-acc)' : 'transparent',
                boxShadow: secondaryActive ? '0 8px 20px rgba(99,102,241,0.28)' : 'none',
              }}
            >
              <Menu size={16} strokeWidth={1.8} color={secondaryActive ? '#ffffff' : '#94a3b8'} />
            </span>
            <span
              className="max-w-full whitespace-nowrap px-0.5 text-[10px] font-bold leading-none tracking-[-0.01em]"
              style={{ color: secondaryActive ? '#4f46e5' : '#94a3b8' }}
            >
              더보기
            </span>
          </button>
        </div>
      </nav>

      <BottomSheet open={moreOpen} title="더보기" onClose={() => setMoreOpen(false)}>
        <div className="grid gap-2">
          {secondaryTabs.map(({ href, label, caption, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-[14px] px-3 text-left"
                style={{ background: active ? 'rgba(99,102,241,0.12)' : '#f8fafc', border: active ? '1px solid rgba(99,102,241,0.28)' : '1px solid #e2e8f0' }}
                aria-current={active ? 'page' : undefined}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: active ? 'var(--spm-acc)' : '#ffffff', color: active ? '#ffffff' : '#64748b' }}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-black" style={{ color: '#0f172a' }}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-semibold" style={{ color: '#64748b' }}>
                    {caption}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

export function DesktopRail({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = withHref(DESKTOP_TABS, basePath);

  return (
    <aside
      className="hidden w-[220px] shrink-0 border-r px-4 py-5 lg:block"
      style={{
        borderColor: '#e2e8f0',
        background: 'rgba(255,255,255,0.82)',
      }}
      aria-label="SPOKEDU MASTER 데스크톱 메뉴"
    >
      <div className="px-3 pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>
          SPOKEDU
        </p>
        <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: '#0f172a', letterSpacing: 0 }}>
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
                background: active ? 'var(--spm-acc)' : 'transparent',
                color: active ? '#ffffff' : '#94a3b8',
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon size={17} />
              <span className="min-w-0 whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
