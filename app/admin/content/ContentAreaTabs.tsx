'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/blog-drafts', label: '블로그 원고' },
  { href: '/admin/field-records', label: '현장 관리' },
];

export function ContentAreaTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="교육 콘텐츠 관리" className="mb-6 flex gap-2 border-b border-slate-200">
      {tabs.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
