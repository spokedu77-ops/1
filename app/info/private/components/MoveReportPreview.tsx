'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type MoveReportPreviewProps = {
  initialSummary?: string;
  onSummaryChange: (summary: string) => void;
  onSummaryAction: (action: 'saved' | 'reset') => void;
};

export const PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY = 'private.moveReport.summary';

export default function MoveReportPreview({
  initialSummary = '',
  onSummaryChange,
  onSummaryAction,
}: MoveReportPreviewProps) {
  const [summaryInput, setSummaryInput] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    setSummaryInput(initialSummary);
    if (initialSummary.trim()) setAutoFilled(true);
  }, [initialSummary]);

  const persistSummary = useCallback((summary: string) => {
    if (typeof window === 'undefined') return;
    if (!summary) {
      window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY);
      return;
    }
    window.localStorage.setItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY, summary);
  }, []);

  const handleApplySummary = useCallback(() => {
    const normalized = summaryInput.trim();
    persistSummary(normalized);
    onSummaryChange(normalized);
    onSummaryAction(normalized ? 'saved' : 'reset');
  }, [summaryInput, onSummaryChange, onSummaryAction, persistSummary]);

  const handleResetSummary = useCallback(() => {
    setSummaryInput('');
    setAutoFilled(false);
    persistSummary('');
    onSummaryChange('');
    onSummaryAction('reset');
  }, [onSummaryChange, onSummaryAction, persistSummary]);

  return (
    <section id="move-report">
      <div className="pl-container">
        <h2 className="pl-section-title">Move report</h2>
        <p className="pl-lead">
          우리 아이의 움직임 유형을 빠르게 확인하고, 상담 시 참고할 요약을 함께 전달해 주세요.
        </p>
        <div className="pl-mr-wrapper">
          <div className="pl-mr-left">
            <div className="pl-mr-kicker">3분 · 12문항 · 무료 테스트</div>
            <h3 className="pl-mr-title">Move report로 수업 설계 힌트를 먼저 확인하세요</h3>
            {autoFilled ? (
              <p className="pl-mr-desc pl-mr-desc--autofill">
                Move report 결과가 자동으로 반영됐습니다. 아래에서 내용을 확인하고 상담 폼으로 이동하세요.
              </p>
            ) : (
              <>
                <p className="pl-mr-desc">
                  테스트를 완료하면 결과가 이 페이지에 자동으로 연결됩니다.
                </p>
                <ol className="pl-mr-steps">
                  <li>아래 버튼으로 Move report를 시작합니다.</li>
                  <li>결과 화면에서 "상담 신청하기"를 누르면 이 페이지로 돌아옵니다.</li>
                  <li>결과 요약이 자동 반영된 상태로 상담 폼을 작성합니다.</li>
                </ol>
              </>
            )}
            <div className="pl-mr-actions">
              <Link href="/move-report" className="pl-btn pl-btn-primary" target="_blank" rel="noopener noreferrer">
                Move report 시작하기
              </Link>
              {autoFilled ? (
                <Link href="#apply" className="pl-btn pl-btn-primary">
                  상담 폼으로 이동
                </Link>
              ) : null}
            </div>
          </div>

          <div className="pl-mr-right">
            <div className="pl-result-label">
              {autoFilled ? '자동 반영된 요약' : '상담 연동용 요약'}
            </div>
            {autoFilled ? (
              <div className="pl-mr-autofill-badge">Move report 결과 자동 연결됨</div>
            ) : null}
            <textarea
              className="pl-mr-summary"
              value={summaryInput}
              onChange={(e) => { setSummaryInput(e.target.value); setAutoFilled(false); }}
              placeholder="Move report를 완료하면 결과가 여기에 자동으로 채워집니다."
            />
            <div className="pl-mr-summary-actions">
              <button type="button" className="pl-btn pl-btn-primary" onClick={handleApplySummary}>
                요약 반영
              </button>
              <button type="button" className="pl-btn pl-btn-outline" onClick={handleResetSummary}>
                초기화
              </button>
              <Link href="#apply" className="pl-btn pl-btn-outline">
                상담 폼으로 이동
              </Link>
            </div>
            <p className="pl-result-info">
              저장된 요약은 하단 상담 폼의 자동 완성 문구에 함께 포함됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
