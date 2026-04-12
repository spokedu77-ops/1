'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE = '/admin/iiwarmup';

function isAssetHubActive(pathname: string): boolean {
  return pathname === `${BASE}/assets` || pathname.startsWith(`${BASE}/assets/`);
}

function isSpomovePrimaryActive(pathname: string): boolean {
  if (pathname === `${BASE}/spomove` || pathname.startsWith(`${BASE}/spomove/`)) return true;
  if (pathname === `${BASE}/think` || pathname.startsWith(`${BASE}/think/`)) return true;
  if (pathname === `${BASE}/challenge` || pathname.startsWith(`${BASE}/challenge/`)) return true;
  if (pathname === `${BASE}/flow` || pathname.startsWith(`${BASE}/flow/`)) return true;
  return false;
}

function showSecondaryNav(pathname: string): boolean {
  return isSpomovePrimaryActive(pathname);
}

function isOverviewActive(pathname: string): boolean {
  return pathname === BASE;
}

function navClass(active: boolean): string {
  return `rounded-lg px-3 py-2 transition ${
    active ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
  }`;
}

function subNavClass(active: boolean): string {
  return `rounded-lg px-3 py-2 text-sm transition ${
    active ? 'bg-blue-600/90 text-white ring-1 ring-blue-500/50' : 'bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700'
  }`;
}

function isThinkActive(pathname: string): boolean {
  return pathname === `${BASE}/think` || pathname.startsWith(`${BASE}/think/`);
}
function isChallengeActive(pathname: string): boolean {
  return pathname === `${BASE}/challenge` || pathname.startsWith(`${BASE}/challenge/`);
}
function isFlowActive(pathname: string): boolean {
  return pathname === `${BASE}/flow` || pathname.startsWith(`${BASE}/flow/`);
}

export default function TeacherAppIiwarmupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  const overviewOn = isOverviewActive(pathname);
  const assetOn = isAssetHubActive(pathname);
  const spomoveOn = isSpomovePrimaryActive(pathname);
  const secondary = showSecondaryNav(pathname);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">선생님 APP</h1>
            <p className="text-sm text-neutral-400">Asset Hub · SPOMOVE(스튜디오·훈련·카메라)</p>
          </div>

          <nav className="flex flex-wrap gap-2 text-sm" aria-label="선생님 APP 1차 메뉴">
            <Link className={navClass(overviewOn)} href={BASE}>
              Overview
            </Link>
            <Link className={navClass(assetOn)} href={`${BASE}/assets`}>
              Asset Hub
            </Link>
            <Link className={navClass(spomoveOn)} href={`${BASE}/spomove`}>
              SPOMOVE
            </Link>
          </nav>

          {secondary && (
            <nav
              className="flex flex-wrap gap-2 border-t border-neutral-800 pt-4 text-sm"
              aria-label="SPOMOVE 도구"
            >
              <Link className={subNavClass(isThinkActive(pathname))} href={`${BASE}/think`}>
                Think
              </Link>
              <Link className={subNavClass(isChallengeActive(pathname))} href={`${BASE}/challenge`}>
                Challenge
              </Link>
              <Link className={subNavClass(isFlowActive(pathname))} href={`${BASE}/flow`}>
                Flow
              </Link>
              <Link className={subNavClass(false)} href="/admin/camera">
                카메라 앱
              </Link>
              <Link className={subNavClass(false)} href="/admin/memory-game">
                SPOMOVE 훈련
              </Link>
            </nav>
          )}
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
