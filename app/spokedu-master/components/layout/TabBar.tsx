'use client';

import { BookOpen, Calendar, Home, User, Zap } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { href: '/spokedu-master/dashboard', label: '홈', Icon: Home },
  { href: '/spokedu-master/library', label: '라이브러리', Icon: BookOpen },
  { href: '/spokedu-master/spomove', label: 'SPOMOVE', Icon: Zap },
  { href: '/spokedu-master/plan', label: '수업계획', Icon: Calendar },
  { href: '/spokedu-master/profile', label: '내 정보', Icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="sticky bottom-0 z-50 grid shrink-0 grid-cols-5 border-t"
      style={{
        height: 68,
        background: 'rgba(7,7,12,0.94)',
        backdropFilter: 'blur(20px)',
        borderColor: 'var(--spm-br2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <button
            key={href}
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
              router.push(href);
            }}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-40"
          >
            <div
              className="flex items-center justify-center rounded-[8px] transition-all"
              style={{
                width: 26,
                height: 26,
                background: active ? 'var(--spm-acc)' : 'transparent',
                boxShadow: active ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              <Icon size={16} strokeWidth={1.7} color={active ? '#ffffff' : 'var(--spm-t3)'} />
            </div>
            <span
              className="text-[9px] font-semibold tracking-tight"
              style={{ color: active ? '#818cf8' : 'var(--spm-t3)' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
