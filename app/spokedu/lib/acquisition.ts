'use client';

import type { AcquisitionContext, AcquisitionEntrySurface } from '../data/lead-envelope';
import { isAcquisitionEntrySurface } from '../data/lead-envelope';

const STORAGE_KEY = 'spokedu.acquisition.v1';

function readStored(): AcquisitionContext | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcquisitionContext;
    if (!parsed?.entrySurface || !isAcquisitionEntrySurface(parsed.entrySurface)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(ctx: AcquisitionContext) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

function inferSurfaceFromPath(pathname: string): AcquisitionEntrySurface {
  if (pathname.includes('/records')) return 'record';
  if (pathname.includes('/programs') || pathname.includes('/spomove')) return 'programs';
  if (pathname === '/' || pathname === '' || pathname === '/spokedu' || pathname.endsWith('/spokedu/')) {
    return 'home';
  }
  return 'direct';
}

function currentPathWithQuery(): string {
  const { pathname, search } = window.location;
  return `${pathname}${search || ''}`;
}

/** 세션 내 유입 귀속 — URL/utm/entryPath는 최초 1회 고정 */
export function captureAcquisitionFromLocation(): AcquisitionContext {
  if (typeof window === 'undefined') return { entrySurface: 'direct' };
  const existing = readStored();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source')?.trim() || undefined;
  const utmCampaign = params.get('utm_campaign')?.trim() || undefined;
  const entryId = params.get('entryId')?.trim() || undefined;
  const surfaceParam = params.get('entrySurface')?.trim();
  const entrySurface =
    surfaceParam && isAcquisitionEntrySurface(surfaceParam)
      ? surfaceParam
      : inferSurfaceFromPath(window.location.pathname);

  const ctx: AcquisitionContext = {
    entrySurface,
    entryId,
    utmSource,
    utmCampaign,
    entryPath: currentPathWithQuery(),
    referrer: document.referrer?.trim() || undefined,
  };
  writeStored(ctx);
  return ctx;
}

/**
 * 제출 시점 acquisition.
 * entry* / utm은 세션 고정, submitPath·referrer는 제출 페이지 기준 보강.
 */
export function getAcquisitionContext(opts?: { submitPath?: string }): AcquisitionContext {
  if (typeof window === 'undefined') return { entrySurface: 'direct' };
  const base = readStored() ?? captureAcquisitionFromLocation();
  const submitPath =
    opts?.submitPath?.trim() ||
    `${window.location.pathname}${window.location.search || ''}` ||
    undefined;
  return {
    ...base,
    submitPath: submitPath || base.submitPath,
    referrer: base.referrer || document.referrer?.trim() || undefined,
  };
}
