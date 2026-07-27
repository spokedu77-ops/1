'use client';

import { BookOpen, FileText, Home, Lock, Tv, Wrench } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useOptionalMasterAccessContext } from '../../access/MasterAccessProvider';
import type { MasterAccessSnapshot } from '../../lib/masterAccessModel';
import type { MasterCapability } from './masterRouteAccess';

const PRIMARY_TABS = [
  { key: 'dashboard', label: '홈', shortLabel: '홈', Icon: Home, capability: 'authenticated' },
  { key: 'library', label: '수업자료', shortLabel: '자료', Icon: BookOpen, capability: 'library' },
  { key: 'class-tools', label: '수업 도구', shortLabel: '도구', Icon: Wrench, capability: 'classTools' },
  { key: 'activity', label: '수업 기록', shortLabel: '기록', Icon: FileText, capability: 'records' },
  { key: 'spomove', label: 'SPOMOVE', shortLabel: '무브', Icon: Tv, capability: 'spomove' },
] as const;

function withHref<T extends { key: string }>(tabs: readonly T[], basePath: string) {
  return tabs.map((tab) => ({ ...tab, href: `${basePath}/${tab.key}` }));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canUseTab(snapshot: MasterAccessSnapshot | null | undefined, capability: MasterCapability) {
  if (!snapshot) return true;
  if (capability === 'authenticated') return snapshot.authenticated;
  if (capability === 'library') return snapshot.canUseLibrary;
  if (capability === 'classTools') return snapshot.canUseClassTools;
  if (capability === 'records') return snapshot.canUseRecords;
  return snapshot.canUseSpomove;
}

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const accessContext = useOptionalMasterAccessContext();
  const primaryTabs = withHref(PRIMARY_TABS, basePath);

  const go = (href: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    router.push(href);
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 shrink-0 border-t px-2 pt-2 lg:hidden"
        style={{
          borderColor: 'var(--spm-br2)',
          background: 'color-mix(in srgb, var(--spm-bg) 92%, transparent)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="SPOKEDU MASTER 주요 메뉴"
      >
        <div
          className="mx-auto grid h-[62px] w-full max-w-[620px] grid-cols-5 rounded-[18px] border"
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderColor: '#e2e8f0',
            boxShadow: '0 -14px 34px rgba(15,23,42,0.08)',
          }}
        >
          {primaryTabs.map(({ href, label, shortLabel, Icon, capability }) => {
            const active = isActivePath(pathname, href) || (href.endsWith('/activity') && isActivePath(pathname, `${basePath}/class-record`));
            const locked = !canUseTab(accessContext?.snapshot, capability);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--spm-acc)]"
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <span className="relative grid h-7 w-7 place-items-center rounded-[9px]" style={{ background: active ? 'var(--spm-acc)' : 'transparent' }}>
                  <Icon size={17} strokeWidth={1.9} color={active ? '#ffffff' : '#64748b'} />
                  {locked ? (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--spm-acc)]">
                      <Lock size={9} color="#ffffff" strokeWidth={2.2} />
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full px-0.5 text-center text-[10px] font-bold leading-none whitespace-nowrap" style={{ color: active ? 'var(--spm-acc)' : '#64748b' }}>
                  {shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
