/**
 * SPOKEDU 마케팅 Clean Public URL SSOT.
 * 브라우저에 노출되는 href·canonical·sitemap·analytics page_path는 여기만 사용한다.
 * `/spokedu-master`, `/admin`, `/api` 는 대상이 아니다.
 */
export const SPOKEDU_PATHS = {
  home: '/',
  about: '/about',
  education: '/education',
  dispatch: '/dispatch',
  private: '/private',
  spomove: '/spomove',
  spomoveCatalog: '/spomove/catalog',
  /** 공식 public route — 내부 모듈명은 curriculum 유지 가능 */
  subscription: '/subscription',
  records: '/records',
  contact: '/contact',
  spomat: '/spomat',
  partners: '/partners',
} as const;

export type SpokeduPublicPathKey = keyof typeof SPOKEDU_PATHS;

/** 레거시 prefix — permanent redirect source 전용. 신규 public href에 쓰지 않는다. */
export const SPOKEDU_LEGACY_PREFIX = '/spokedu';

/**
 * @deprecated `SPOKEDU_PATHS` 사용.
 * 빈 문자열로 두어 `${SPOKEDU_BASE_PATH}/about` → `/about` 형태를 유지한다.
 * `/curriculum`·`/programs/spomove` 조합에는 쓰지 말 것 — `SPOKEDU_PATHS` 사용.
 */
export const SPOKEDU_BASE_PATH = '';

export function spokeduRecordPath(slug: string): string {
  return `${SPOKEDU_PATHS.records}/${slug}`;
}

/** 구독시스템 mode query — `/subscription?mode=` */
export function spokeduSubscriptionHref(query?: {
  mode?: string;
  hash?: string;
  extra?: Record<string, string>;
}): string {
  const params = new URLSearchParams(query?.extra);
  if (query?.mode) params.set('mode', query.mode);
  const qs = params.toString();
  const hash = query?.hash ? (query.hash.startsWith('#') ? query.hash : `#${query.hash}`) : '';
  return `${SPOKEDU_PATHS.subscription}${qs ? `?${qs}` : ''}${hash}`;
}

export function isSpokeduHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

export function isSpokeduContactPath(pathname: string): boolean {
  return pathname === SPOKEDU_PATHS.contact;
}

export function isSpomoveCatalogPath(pathname: string): boolean {
  return pathname === SPOKEDU_PATHS.spomoveCatalog;
}
