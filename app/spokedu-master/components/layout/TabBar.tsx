'use client';

import { BookOpen, CalendarDays, Heart, Home, Lock, Wrench } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { MasterAccessSnapshot } from '../../lib/masterAccessModel';
import { MASTER_NAV_ITEMS } from './masterNavLabels';
import { hasMasterRouteCapability } from './masterRouteAccess';

const TAB_ICONS = {
  dashboard: Home,
  programs: BookOpen,
  favorites: Heart,
  manage: CalendarDays,
  'class-tools': Wrench,
} as const;

function buildPrimaryTabs(basePath: string) {
  return MASTER_NAV_ITEMS.filter(
    (item): item is (typeof MASTER_NAV_ITEMS)[number] & { key: keyof typeof TAB_ICONS } =>
      item.key in TAB_ICONS,
  ).map((item) => ({
    key: item.key,
    href: item.href.replace('/spokedu-master', basePath),
    label: item.label,
    shortLabel: item.shortLabel,
    Icon: TAB_ICONS[item.key],
    capability: item.capability,
  }));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar({
  basePath = '/spokedu-master',
  snapshot = null,
}: {
  basePath?: string;
  snapshot?: MasterAccessSnapshot | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const primaryTabs = buildPrimaryTabs(basePath);

  const go = (href: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    router.push(href);
  };

  return (
    <>
      <nav
        data-spm-tabbar="true"
        className="fixed inset-x-0 bottom-0 z-50 border-t px-2 pt-2 lg:hidden"
        style={{
          borderColor: 'var(--spm-br2)',
          background: 'color-mix(in srgb, var(--spm-bg) 92%, transparent)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="SPOKEDU MASTER 주요 메뉴"
      >
        <div
          className="mx-auto grid h-[62px] w-full max-w-[720px] grid-cols-5 rounded-[18px] border"
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderColor: '#e2e8f0',
            boxShadow: '0 -14px 34px rgba(15,23,42,0.08)',
          }}
        >
          {primaryTabs.map(({ href, label, shortLabel, Icon, capability }) => {
            const active =
              isActivePath(pathname, href) ||
              (href.endsWith('/programs') && (isActivePath(pathname, `${basePath}/library`) || isActivePath(pathname, `${basePath}/spomove`))) ||
              (href.endsWith('/manage') && (isActivePath(pathname, `${basePath}/activity`) || isActivePath(pathname, `${basePath}/classes`) || isActivePath(pathname, `${basePath}/class-record`)));
            const locked = snapshot != null && !hasMasterRouteCapability(snapshot, capability);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--spm-acc)]"
                aria-current={active ? 'page' : undefined}
                aria-label={locked ? `${label} (Lite 이상)` : label}
              >
                <span
                  className="relative grid h-7 w-7 place-items-center rounded-[9px]"
                  style={{ background: active ? 'var(--spm-acc)' : 'transparent' }}
                >
                  <Icon size={17} strokeWidth={1.9} color={active ? '#ffffff' : '#64748b'} />
                  {locked ? (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--spm-acc)]">
                      <Lock size={9} color="#ffffff" strokeWidth={2.2} />
                    </span>
                  ) : null}
                </span>
                <span
                  className="max-w-full px-0.5 text-center text-[10px] font-bold leading-none whitespace-nowrap"
                  style={{ color: active ? 'var(--spm-acc)' : '#64748b' }}
                >
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
