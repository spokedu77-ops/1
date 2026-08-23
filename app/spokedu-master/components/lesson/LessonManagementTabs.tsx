'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/spokedu-master/activity', label: '일정' },
  { href: '/spokedu-master/classes', label: '수업반' },
] as const;

export function LessonManagementTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="수업 관리" className="inline-flex rounded-xl bg-slate-100 p-1">
      {ITEMS.map((item) => {
        const active = item.href.endsWith('/activity') ? pathname.startsWith(item.href) : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 min-w-24 items-center justify-center rounded-lg px-4 text-sm font-black ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item.label}</Link>;
      })}
    </nav>
  );
}
