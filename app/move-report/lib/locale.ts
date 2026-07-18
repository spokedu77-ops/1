export type MoveReportLocale = 'ko' | 'en';

export function isMoveReportLocale(v: unknown): v is MoveReportLocale {
  return v === 'ko' || v === 'en';
}

/** 앱 경로 prefix — 공유·CTA 링크용 */
export function moveReportBasePath(locale: MoveReportLocale): string {
  return locale === 'en' ? '/move-report/en' : '/move-report';
}

/** "○○의" / "○○'s" */
export function formatOwnerPossessive(displayName: string, locale: MoveReportLocale): string {
  const name = displayName.trim() || (locale === 'en' ? 'Your child' : '우리 아이');
  if (locale === 'en') {
    if (/s$/i.test(name)) return `${name}'`;
    return `${name}'s`;
  }
  return `${name}의`;
}
