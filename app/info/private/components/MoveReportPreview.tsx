'use client';

import Link from 'next/link';

type MoveReportPreviewProps = {
  reportSummary: string;
  reportShareUrl: string;
  onSummaryChange: (summary: string) => void;
  onShareUrlChange: (shareUrl: string) => void;
  onClear: () => void;
};

export const PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY = 'private.moveReport.summary';
export const PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY = 'private.moveReport.shareUrl';

export default function MoveReportPreview({
  reportSummary,
  reportShareUrl,
  onSummaryChange,
  onShareUrlChange,
  onClear,
}: MoveReportPreviewProps) {
  return (
    <section id="move-report">
      <div className="pl-container">
        <h2 className="pl-section-title">Move report</h2>
        <p className="pl-lead">
          우리 아이의 움직임 유형을 빠르게 확인하면, 아래 상담 폼 접수 문안에 요약과 결과 카드 링크가{' '}
          <strong>자동으로 붙습니다.</strong> 별도 복사·붙여넣기는 없습니다.
        </p>
        <div className="pl-mr-wrapper">
          <div className="pl-mr-left">
            <div className="pl-mr-kicker">3분 · 12문항 · 무료 테스트</div>
            <h3 className="pl-mr-title">
              Move report는 아이의 움직임·반응 성향을 짧은 문항으로 살펴보는 관찰형 체크입니다
            </h3>
            <p className="pl-mr-desc">
              약 3분 안에 완료할 수 있고, 결과로 움직임 유형과 한 줄 해석이 정리됩니다. 상담 시 아이를 이해하는
              참고 자료로 쓰일 뿐, 진단이나 의학적 판단이 아닙니다. 원하시면 생략하셔도 상담 신청은 가능합니다.
            </p>
            <ol className="pl-mr-steps">
              <li>아래 버튼으로 Move report를 새 탭에서 완료합니다.</li>
              <li>
                결과 화면 맨 아래 <strong>「결과 가지고 상담 페이지로 돌아가기」</strong>를 누르면 이 페이지로 돌아오며,
                하단 <strong>상담 폼 미리보기</strong>에 요약·결과 카드 링크가 바로 반영됩니다.
              </li>
              <li>필요하면 아래 칸에서만 고치고, 상담 폼을 이어서 작성·접수하면 됩니다.</li>
            </ol>
            <div className="pl-mr-actions">
              <Link href="/move-report" className="pl-btn pl-btn-primary" target="_blank" rel="noopener noreferrer">
                Move report 새 탭에서 시작하기
              </Link>
            </div>
          </div>

          <div className="pl-mr-right">
            <div className="pl-result-label">상담 접수에 포함되는 내용</div>
            <p className="pl-result-info" style={{ margin: 0 }}>
              Move report에서 돌아오면 여기와 하단 폼에 동시에 채워집니다. 직접 수정해도 곧바로 폼에 반영됩니다.
            </p>
            <textarea
              className="pl-mr-summary"
              value={reportSummary}
              onChange={(e) => onSummaryChange(e.target.value)}
              placeholder="Move report를 마치고 돌아오면 자동으로 채워집니다."
            />
            <div className="pl-result-label" style={{ marginTop: 4 }}>
              결과 카드 링크 (자동·선택)
            </div>
            <input
              type="url"
              className="pl-mr-share-url"
              value={reportShareUrl}
              onChange={(e) => onShareUrlChange(e.target.value)}
              placeholder="결과 화면에서 돌아오면 자동으로 채워질 수 있습니다."
              autoComplete="off"
              spellCheck={false}
            />
            <div className="pl-mr-summary-actions">
              <button type="button" className="pl-btn pl-btn-outline" onClick={onClear}>
                Move report 내용 지우기
              </button>
              <Link href="#apply" className="pl-btn pl-btn-primary">
                상담 폼으로 이동
              </Link>
            </div>
            <p className="pl-result-info">
              「상담 신청 보내기」를 누르면 위 내용이 접수 본문에 함께 전달됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
