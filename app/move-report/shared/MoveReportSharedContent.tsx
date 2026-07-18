'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ShareResultCard from '../components/ShareResultCard';
import { getProfiles } from '../data/catalog';
import { getMoveReportUi } from '../i18n/ui';
import { captureMoveReportAttribution, getMoveReportAttribution, pickAttributionForShareUrl } from '../lib/attribution';
import { appendMoveReportAttributionToUrl, parseMoveReportSharePayload } from '../lib/shareLink';
import { copyTextToClipboard } from '../lib/shareCard';
import { moveReportBasePath, type MoveReportLocale } from '../lib/locale';
import { trackMoveReportEvent } from '../lib/events';

function useMoveReportStartHref(basePath: string) {
  const [href, setHref] = useState(basePath);

  useLayoutEffect(() => {
    captureMoveReportAttribution();
    try {
      const url = appendMoveReportAttributionToUrl(
        new URL(basePath, window.location.origin).href,
        pickAttributionForShareUrl(getMoveReportAttribution())
      );
      const u = new URL(url);
      setHref(`${u.pathname}${u.search}`);
    } catch {
      setHref(basePath);
    }
  }, [basePath]);

  return href;
}

type Props = {
  locale?: MoveReportLocale;
};

export default function MoveReportSharedContent({ locale = 'ko' }: Props) {
  const ui = useMemo(() => getMoveReportUi(locale), [locale]);
  const t = ui.shared;
  const searchParams = useSearchParams();
  const raw = searchParams.get('d');
  const parsed = useMemo(() => parseMoveReportSharePayload(raw), [raw]);
  const base = moveReportBasePath(locale);
  const moveReportBasePathWithD = raw ? `${base}?d=${encodeURIComponent(raw)}` : base;
  const moveReportHref = useMoveReportStartHref(moveReportBasePathWithD);
  const restartHref = useMoveReportStartHref(base);

  const payload = useMemo(() => {
    if (!parsed) return null;
    const profile = getProfiles(locale)[parsed.profileKey];
    if (!profile) return null;
    /** shared 표면에는 URL에 이름이 있어도 실명을 노출하지 않음 */
    return { displayLabel: t.anonLabel, profile };
  }, [parsed, locale, t.anonLabel]);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);
  const pageViewedRef = useRef(false);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast('');
      toastTimer.current = null;
    }, 2600);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!payload || !raw || pageViewedRef.current) return;
    pageViewedRef.current = true;
    void trackMoveReportEvent({
      eventName: 'move_report_shared_page_viewed',
      shareKey: raw,
      meta: { locale },
    });
  }, [payload, raw, locale]);

  const shareKey = raw;

  const onCopyPageLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      flash(t.copied);
      void trackMoveReportEvent({
        eventName: 'move_report_shared_page_link_copied',
        shareKey,
        meta: { locale },
      });
    } else {
      flash(t.copyFail);
    }
  }, [flash, locale, shareKey, t.copied, t.copyFail]);

  const onStartClick = useCallback(() => {
    void trackMoveReportEvent({
      eventName: 'move_report_shared_page_start_clicked',
      shareKey,
      meta: { locale },
    });
  }, [locale, shareKey]);

  if (!payload || !parsed) {
    return (
      <main className="mr-page mr-shared-page" lang={locale === 'en' ? 'en' : 'ko'}>
        <div className="mr-page-inner mr-content-max mr-shared-error">
          <div className="mr-shared-error-card mr-shared-error-card--simple">
            <h1 className="mr-shared-error-title">{t.errorTitle}</h1>
            <p className="mr-shared-error-body">{t.errorBody}</p>
            <Link href={restartHref} className="btn-fire mr-shared-error-cta" onClick={onStartClick}>
              {t.startCta}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mr-page mr-shared-page" lang={locale === 'en' ? 'en' : 'ko'}>
      <div className="mr-shared-poster-page">
        <div className="mr-shared-poster-shell">
          <ShareResultCard
            variant="viralShare"
            displayName={payload.displayLabel}
            profileCode={parsed.profileKey}
            p={payload.profile}
            locale={locale}
          />
          <div className="mr-shared-poster-footer">
            <Link href={moveReportHref} className="mr-shared-poster-cta" onClick={onStartClick}>
              {t.startCta}
            </Link>
            <button type="button" className="mr-shared-poster-copy" onClick={() => void onCopyPageLink()}>
              {t.copyLink}
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="toast-bar toast-bar--top" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
