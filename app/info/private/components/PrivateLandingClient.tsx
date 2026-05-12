'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from './Header';
import Hero from './Hero';
import Instructors from './Instructors';
import ClassFlow from './ClassFlow';
import Curriculum from './Curriculum';
import MoveReportPreview, {
  PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY,
  PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY,
} from './MoveReportPreview';
import Reviews from './Reviews';
import FAQ from './FAQ';
import ApplyForm from './ApplyForm';
import Footer from './Footer';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

export default function PrivateLandingClient() {
  const [reportSummary, setReportSummary] = useState('');
  const [reportShareUrl, setReportShareUrl] = useState('');
  const searchParams = useSearchParams();
  const { message, visible, show } = useToast(3000);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = searchParams.get('reportSummary')?.trim() ?? '';
    if (fromQuery) {
      setReportSummary(fromQuery);
      window.localStorage.setItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY, fromQuery);
    } else {
      const raw = window.localStorage.getItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY) ?? '';
      setReportSummary(raw);
    }
    const shareRaw = window.localStorage.getItem(PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY) ?? '';
    setReportShareUrl(shareRaw.trim());
  }, [searchParams]);

  const handleSummaryChange = useCallback((summary: string) => {
    setReportSummary(summary);
    if (typeof window === 'undefined') return;
    if (!summary.trim()) {
      window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY);
      return;
    }
    window.localStorage.setItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY, summary);
  }, []);

  const handleShareUrlChange = useCallback((url: string) => {
    setReportShareUrl(url);
    if (typeof window === 'undefined') return;
    const t = url.trim();
    if (!t) {
      window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY);
      return;
    }
    window.localStorage.setItem(PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY, t);
  }, []);

  const handleMoveReportClear = useCallback(() => {
    setReportSummary('');
    setReportShareUrl('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY);
      window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SHARE_URL_LS_KEY);
    }
    show('Move report 요약·링크를 지웠습니다.');
  }, [show]);

  const handleCopyResult = useCallback(
    (ok: boolean) => {
      show(
        ok
          ? '복사되었습니다. 카카오 채널에 직접 올리실 때만 붙여넣기 해 주세요.'
          : '복사에 실패했습니다. 미리보기 영역을 드래그해 복사해 주세요.'
      );
    },
    [show]
  );

  const handleConsultSubmit = useCallback(
    (result: {
      requiredFilled: boolean;
      ok: boolean;
      emailSent: boolean;
      message: string;
    }) => {
      if (!result.requiredFilled) {
        show('안내: 필수 항목(학습자·연락처·종목·지역·시간)을 모두 기재하시면 상담이 더욱 신속해집니다.', 4000);
        return;
      }
      if (result.ok) {
        show('상담 신청이 완료되었습니다.', result.emailSent ? 4000 : 5500);
        return;
      }
      show(result.message, 5000);
    },
    [show]
  );

  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Instructors />
        <Curriculum />
        <ClassFlow />
        <MoveReportPreview
          reportSummary={reportSummary}
          reportShareUrl={reportShareUrl}
          onSummaryChange={handleSummaryChange}
          onShareUrlChange={handleShareUrlChange}
          onClear={handleMoveReportClear}
        />
        <Reviews />
        <FAQ />
        <ApplyForm
          reportSummary={reportSummary}
          reportShareUrl={reportShareUrl}
          onCopyResult={handleCopyResult}
          onConsultSubmit={handleConsultSubmit}
        />
      </main>
      <Footer />
      <Toast message={message} visible={visible} />
    </>
  );
}
