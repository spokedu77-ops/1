'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { copyTextToClipboard } from '../lib/shareCard';
import { getMoveReportAttribution, pickAttributionForShareUrl } from '../lib/attribution';
import { trackMoveReportEvent } from '../lib/events';
import { appendMoveReportAttributionToUrl, buildMoveReportShareUrl } from '../lib/shareLink';
import EducatorBetaModal from './EducatorBetaModal';

export interface ResultShareActionsProps {
  profileKey: string;
  graphCode: string;
  flash: (msg: string) => void;
  /** false면 교육자 섹션(선생님 링크·베타) 미렌더 — 코치/shared 유입 등 */
  showEducatorCta?: boolean;
}

function extractShareKey(shareUrl: string): string | null {
  if (!shareUrl) return null;
  try {
    return new URL(shareUrl).searchParams.get('d');
  } catch {
    return null;
  }
}

export default function ResultShareActions({ profileKey, graphCode, flash, showEducatorCta = true }: ResultShareActionsProps) {
  const [copyBusy, setCopyBusy] = useState(false);
  const [educatorModalOpen, setEducatorModalOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    /** 공유 URL에는 실명을 넣지 않음(v5 포맷·파서 유지, displayName 생략으로 짧은 링크만 사용) */
    const built = buildMoveReportShareUrl(window.location.origin, {
      v: 5,
      profileKey,
      graphCode,
    });
    return appendMoveReportAttributionToUrl(built, pickAttributionForShareUrl(getMoveReportAttribution()));
  }, [profileKey, graphCode]);

  const shareKey = useMemo(() => extractShareKey(shareUrl), [shareUrl]);

  const runCopyLink = useCallback(async (): Promise<boolean> => {
    if (!shareUrl) return false;
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      flash('링크가 복사되었어요');
      void trackMoveReportEvent({ eventName: 'move_report_result_link_copied', shareKey });
    } else {
      flash('복사에 실패했어요. 링크를 길게 눌러 직접 복사해 보세요.');
    }
    return ok;
  }, [flash, shareKey, shareUrl]);

  const onCopyLinkClick = useCallback(async () => {
    if (!shareUrl || copyBusy) return;
    setCopyBusy(true);
    try {
      await runCopyLink();
    } finally {
      setCopyBusy(false);
    }
  }, [copyBusy, runCopyLink, shareUrl]);

  const onOpenResultCardClick = useCallback(() => {
    if (!shareUrl) return;
    void trackMoveReportEvent({ eventName: 'move_report_result_card_opened', shareKey });
  }, [shareKey, shareUrl]);

  const onEducatorCoachClick = useCallback(() => {
    void trackMoveReportEvent({ eventName: 'move_report_educator_entry_clicked', shareKey });
  }, [shareKey]);

  return (
    <div className="mr-result-share-root" style={{ position: 'relative' }}>
      <section className="mr-result-share-parent" aria-labelledby="mr-result-share-parent-title">
        <h2 id="mr-result-share-parent-title" className="mr-result-share-lead-title">
          결과를 공유해보세요
        </h2>
        <p className="mr-result-share-lead-body">
          아이의 움직임 성향을 가볍게 공유하고, 주변 아이들은 어떤 유형인지 함께 확인해보세요.
        </p>
        <div className="mr-result-share-actions">
          {shareUrl ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-fire mr-result-share-btn mr-result-share-btn--primary mr-result-share-card-link"
              onClick={onOpenResultCardClick}
            >
              <i className="fa-regular fa-image" aria-hidden />
              결과 카드 보기
            </a>
          ) : (
            <button type="button" className="btn-fire mr-result-share-btn mr-result-share-btn--primary" disabled>
              <i className="fa-regular fa-image" aria-hidden />
              결과 카드 보기
            </button>
          )}
          <button
            type="button"
            className="btn-ghost mr-result-share-btn"
            onClick={() => void onCopyLinkClick()}
            disabled={!shareUrl || copyBusy}
          >
            <i className="fa-regular fa-copy" aria-hidden />
            {copyBusy ? '복사 중…' : '링크 복사'}
          </button>
        </div>
      </section>

      {showEducatorCta ? (
        <section className="mr-result-share-educator" aria-labelledby="mr-result-share-edu-title">
          <h3 id="mr-result-share-edu-title" className="mr-result-share-edu-title">
            체육 선생님이신가요?
          </h3>
          <p className="mr-result-share-edu-body">
            우리 반, 센터, 기관 전용 MOVE REPORT 링크를 만들고 아이들의 움직임 성향 분포를 확인해보세요.
          </p>
          <div className="mr-result-share-educator-actions">
            <Link
              href="/move-report/coach/new"
              className="mr-result-share-btn mr-result-share-edu-coach mr-result-share-edu-coach--secondary"
              onClick={onEducatorCoachClick}
            >
              선생님 전용 링크 만들기
            </Link>
            <button type="button" className="mr-result-share-edu-beta-link" onClick={() => setEducatorModalOpen(true)}>
              교육자 베타 신청
            </button>
          </div>
        </section>
      ) : null}

      <EducatorBetaModal open={educatorModalOpen} onClose={() => setEducatorModalOpen(false)} shareKey={shareKey} />
    </div>
  );
}
