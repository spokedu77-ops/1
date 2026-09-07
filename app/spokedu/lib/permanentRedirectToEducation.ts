import { permanentRedirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

/** Copy every query pair. Do not whitelist known params. */
export function queryStringFromSearchParams(searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    for (const value of values) {
      if (value) params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Fallback if next.config redirect is skipped. Prefer next.config as SSOT. */
export function permanentRedirectToEducation(searchParams: SearchParams): never {
  permanentRedirect(`/education${queryStringFromSearchParams(searchParams)}`);
}
