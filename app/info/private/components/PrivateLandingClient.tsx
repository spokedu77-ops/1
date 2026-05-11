'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from './Header';
import Hero from './Hero';
import Instructors from './Instructors';
import ClassFlow from './ClassFlow';
import Curriculum from './Curriculum';
import MoveReportPreview, { PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY } from './MoveReportPreview';
import Reviews from './Reviews';
import FAQ from './FAQ';
import ApplyForm from './ApplyForm';
import Footer from './Footer';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

export default function PrivateLandingClient() {
  const [reportSummary, setReportSummary] = useState('');
  const searchParams = useSearchParams();
  const { message, visible, show } = useToast(3000);

  useEffect(() => {
    const fromQuery = searchParams.get('reportSummary')?.trim() ?? '';
    if (fromQuery) {
      setReportSummary(fromQuery);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY, fromQuery);
      }
      return;
    }
    if (typeof window === 'undefined') return;
    const fromStorage = window.localStorage.getItem(PRIVATE_MOVE_REPORT_SUMMARY_LS_KEY) ?? '';
    if (fromStorage.trim()) {
      setReportSummary(fromStorage.trim());
    }
  }, [searchParams]);

  const handleSummaryChange = useCallback((summary: string) => {
    setReportSummary(summary);
  }, []);

  const handleSummaryAction = useCallback(
    (action: 'saved' | 'reset') => {
      if (action === 'saved') {
        show('Move report 요약이 상담 폼에 반영되었습니다.');
        return;
      }
      show('Move report 요약이 초기화되었습니다.');
    },
    [show]
  );

  const handleCopyResult = useCallback(
    (ok: boolean) => {
      show(
        ok
          ? '복사가 완료되었습니다. 원하시는 곳에 붙여넣기 해주세요.'
          : '복사에 실패했습니다. 텍스트를 직접 드래그하여 복사해 주세요.'
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
          initialSummary={reportSummary}
          onSummaryChange={handleSummaryChange}
          onSummaryAction={handleSummaryAction}
        />
        <Reviews />
        <FAQ />
        <ApplyForm
          reportSummary={reportSummary}
          onCopyResult={handleCopyResult}
          onConsultSubmit={handleConsultSubmit}
        />
      </main>
      <Footer />
      <Toast message={message} visible={visible} />
    </>
  );
}
