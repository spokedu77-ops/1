'use client';

import { BookOpen, ClipboardList, FileText, Home, MessageSquare, Tv, UsersRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';

const PRIMARY_TABS = [
  { key: 'dashboard', label: '홈', Icon: Home },
  { key: 'library', label: '라이브러리', Icon: BookOpen },
  { key: 'spomove', label: 'SPOMOVE', Icon: Tv },
] as const;

const RECORD_TABS = [
  { key: 'report', label: '안내문', caption: '수업 안내문 작성과 최근 문서', Icon: MessageSquare },
  { key: 'class-record', label: '수업 기록', caption: '출석, 참여도, 수업 메모', Icon: ClipboardList },
  { key: 'students', label: '학생 기록', caption: '학생 목록과 개별 기록', Icon: UsersRound },
] as const;

function withHref<T extends { key: string }>(tabs: readonly T[], basePath: string) {
  return tabs.map((tab) => ({ ...tab, href: `${basePath}/${tab.key}` }));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar({ basePath = '/spokedu-master' }: { basePath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [recordsOpen, setRecordsOpen] = useState(false);
  const primaryTabs = withHref(PRIMARY_TABS, basePath);
  const recordTabs = withHref(RECORD_TABS, basePath);
  const recordsActive = recordTabs.some((tab) => isActivePath(pathname, tab.href));
  const activityHref = `${basePath}/activity`;
  const activityActive = recordsActive || isActivePath(pathname, activityHref);

  const go = (href: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    setRecordsOpen(false);
    router.push(href);
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 shrink-0 border-t px-2 pt-2 lg:hidden"
        style={{
          borderColor: '#e2e8f0',
          background: 'rgba(245,247,251,0.92)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="SPOKEDU MASTER 주요 메뉴"
      >
        <div
          className="mx-auto grid h-[62px] w-full max-w-[620px] grid-cols-4 rounded-[18px] border"
          style={{
            background: 'rgba(255,255,255,0.97)',
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
                className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500"
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <span className="grid h-7 w-7 place-items-center rounded-[9px]" style={{ background: active ? '#4f46e5' : 'transparent' }}>
                  <Icon size={17} strokeWidth={1.9} color={active ? '#ffffff' : '#64748b'} />
                </span>
                <span className="max-w-full whitespace-nowrap px-0.5 text-[11px] font-bold leading-none" style={{ color: active ? '#4338ca' : '#64748b' }}>
                  {label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => go(activityHref)}
            className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] transition-opacity active:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500"
            aria-current={activityActive ? 'page' : undefined}
            aria-label="내 활동·기록"
          >
            <span className="grid h-7 w-7 place-items-center rounded-[9px]" style={{ background: activityActive ? '#4f46e5' : 'transparent' }}>
              <FileText size={17} strokeWidth={1.9} color={activityActive ? '#ffffff' : '#64748b'} />
            </span>
            <span className="text-[11px] font-bold leading-none" style={{ color: activityActive ? '#4338ca' : '#64748b' }}>
              내 활동·기록
            </span>
          </button>
        </div>
      </nav>

      <BottomSheet open={recordsOpen} title="내 활동·기록" onClose={() => setRecordsOpen(false)}>
        <div className="grid gap-2">
          {recordTabs.map(({ href, label, caption, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => go(href)}
                className="flex min-h-[68px] w-full items-center gap-3 rounded-[14px] px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                style={{
                  background: active ? 'rgba(79,70,229,0.09)' : '#f8fafc',
                  border: active ? '1px solid rgba(79,70,229,0.24)' : '1px solid #e2e8f0',
                }}
                aria-current={active ? 'page' : undefined}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: active ? '#4f46e5' : '#ffffff', color: active ? '#ffffff' : '#64748b' }}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-black text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-slate-500">{caption}</span>
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
