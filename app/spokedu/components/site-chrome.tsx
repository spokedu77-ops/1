import Link from 'next/link';
import { navItems, SPOKEDU_BASE_PATH } from '../data/content';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={SPOKEDU_BASE_PATH} className="text-sm font-semibold tracking-[0.14em] text-slate-900">
          SPOKEDU
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={`${SPOKEDU_BASE_PATH}/contact`}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-900 sm:text-sm"
        >
          문의하기
        </Link>
      </div>
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6 md:hidden">
        <nav className="flex min-w-max items-center gap-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6">
        <p className="text-sm font-semibold text-slate-900">SPOKEDU</p>
        <p className="text-sm text-slate-600">
          움직임으로 아이의 성장을 설계하는 아동·청소년 체육교육 전문 단체
        </p>
      </div>
    </footer>
  );
}
