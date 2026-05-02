'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ShareResultCard from '../components/ShareResultCard';
import { captureMoveReportAttribution, getMoveReportAttribution, pickAttributionForShareUrl } from '../lib/attribution';
import { appendMoveReportAttributionToUrl, parseMoveReportSharePayload } from '../lib/shareLink';
import { copyTextToClipboard } from '../lib/shareCard';
import { P } from '../data/profiles';
import { trackMoveReportEvent } from '../lib/events';

function useMoveReportStartHref(basePath: string) {
  const [href, setHref] = useState(basePath);

  useLayoutEffect(() => {
    captureMoveReportAttribution();
    try {
      const url = appendMoveReportAttributionToUrl(new URL(basePath, window.location.origin).href, pickAttributionForShareUrl(getMoveReportAttribution()));
      const u = new URL(url);
      setHref(`${u.pathname}${u.search}`);
    } catch {
      setHref(basePath);
    }
  }, [basePath]);

  return href;
}

export default function MoveReportSharedContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('d');
  const parsed = useMemo(() => parseMoveReportSharePayload(raw), [raw]);
  const moveReportBasePath = raw ? `/move-report?d=${encodeURIComponent(raw)}` : '/move-report';
  const moveReportHref = useMoveReportStartHref(moveReportBasePath);
  const restartHref = useMoveReportStartHref('/move-report');

  const payload = useMemo(() => {
    if (!parsed) return null;
    const profile = P[parsed.profileKey];
    if (!profile) return null;
    /** shared 표면에는 URL에 이름이 있어도 실명을 노출하지 않음 */
    return { displayLabel: '우리 아이', profile };
  }, [parsed]);

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
    void trackMoveReportEvent({ eventName: 'move_report_shared_page_viewed', shareKey: raw });
  }, [payload, raw]);

  const shareKey = raw;

  const onCopyPageLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      flash('링크가 복사되었어요');
      void trackMoveReportEvent({ eventName: 'move_report_shared_page_link_copied', shareKey });
    } else {
      flash('복사에 실패했어요. 주소창의 링크를 길게 눌러 복사해 보세요.');
    }
  }, [flash, shareKey]);

  const onStartClick = useCallback(() => {
    void trackMoveReportEvent({ eventName: 'move_report_shared_page_start_clicked', shareKey });
  }, [shareKey]);

  if (!payload || !parsed) {
    return (
      <main className="mr-page mr-shared-page">
        <div className="mr-page-inner mr-content-max mr-shared-error">
          <div className="mr-shared-error-card mr-shared-error-card--simple">
            <h1 className="mr-shared-error-title">결과를 불러오지 못했어요</h1>
            <p className="mr-shared-error-body">MOVE REPORT를 다시 시작해 주세요.</p>
            <Link href={restartHref} className="btn-fire mr-shared-error-cta" onClick={onStartClick}>
              MOVE REPORT 시작하기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mr-page mr-shared-page">
      <div className="mr-shared-poster-page">
        <div className="mr-shared-poster-shell">
          <ShareResultCard variant="viralShare" displayName={payload.displayLabel} profileCode={parsed.profileKey} p={payload.profile} />
          <div className="mr-shared-poster-footer">
            <Link href={moveReportHref} className="mr-shared-poster-cta" onClick={onStartClick}>
              나도 MOVE REPORT 해보기
            </Link>
            <button type="button" className="mr-shared-poster-copy" onClick={() => void onCopyPageLink()}>
              링크 복사
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
