import { privateInquiryHref } from '../data/commercial-routes';
import { queryStringFromSearchParams } from './permanentRedirectToEducation';

export type LegacySearchParams = Record<string, string | string[] | undefined>;

/** Merge incoming query; set default program only when absent. */
export function legacyCurriculumRedirectTarget(searchParams: LegacySearchParams): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    for (const value of values) {
      if (value !== '') params.append(key, value);
    }
  }
  if (!params.has('program')) {
    params.set('program', 'spomove');
  }
  const qs = params.toString();
  return `/education${qs ? `?${qs}` : ''}#contact`;
}

/** Preserve all query pairs; anchor #apply on canonical /private. */
export function legacyPrivateRedirectTarget(searchParams: LegacySearchParams): string {
  const qs = queryStringFromSearchParams(searchParams).replace(/^\?/, '');
  const base = privateInquiryHref({}).split('#')[0];
  return `${base}${qs ? `?${qs}` : ''}#apply`;
}
