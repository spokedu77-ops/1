'use client';

import { MOVE_REPORT_ATTRIBUTION_QUERY_KEYS } from './attributionSchema';
import { isValidCoachSlugFormat, normalizeCoachSlugInput } from './coachSlug';

const MR_SOURCE_ALLOWED = new Set(['parent_direct', 'shared', 'coach_link', 'educator_campaign', 'direct_unknown']);

const STORAGE_KEY = 'move_report_attribution_v1';
const MAX_LEN = 256;
const REFERRER_HOST_MAX = 120;

function sanitizeQueryValue(val: string): string {
  return val.trim().slice(0, MAX_LEN);
}

/** 첫 로드(탭당 1회)에 URL 쿼리·referrer를 sessionStorage에 고정 */
export function captureMoveReportAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY) !== null) return;

    const out: Record<string, string> = {};
    const sp = new URLSearchParams(window.location.search);
    for (const key of MOVE_REPORT_ATTRIBUTION_QUERY_KEYS) {
      const v = sp.get(key);
      if (v) {
        const s = sanitizeQueryValue(v);
        if (s) out[key] = s;
      }
    }

    if (out.mr_source && !MR_SOURCE_ALLOWED.has(out.mr_source)) {
      delete out.mr_source;
    }

    if (!out.mr_source) {
      const path = window.location.pathname;
      const coachRaw = sp.get('coach');
      const coachNorm = coachRaw ? normalizeCoachSlugInput(coachRaw) : '';
      const hasD = Boolean(sp.get('d')?.trim());
      const utmSrc = (sp.get('utm_source') || '').trim().toLowerCase();

      if (path.includes('/move-report/shared')) {
        out.mr_source = 'shared';
      } else if (utmSrc === 'educator_campaign') {
        out.mr_source = 'educator_campaign';
      } else if (coachNorm && isValidCoachSlugFormat(coachNorm)) {
        out.mr_source = 'coach_link';
      } else if (hasD) {
        out.mr_source = 'shared';
      } else if (path.startsWith('/move-report')) {
        out.mr_source = 'parent_direct';
      }
    }

    if (document.referrer) {
      try {
        const r = new URL(document.referrer);
        if (r.protocol === 'http:' || r.protocol === 'https:') {
          const host = r.hostname.trim().slice(0, REFERRER_HOST_MAX);
          if (host) out.referrer_host = host;
        }
      } catch {
        /* ignore */
      }
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* storage disabled */
  }
}

export function getMoveReportAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** 공유 링크에 붙일 파라미터(UTM·ads 클릭 ID·ref만; referrer_host 제외) */
export function pickAttributionForShareUrl(attr: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of MOVE_REPORT_ATTRIBUTION_QUERY_KEYS) {
    const v = attr[k];
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}
