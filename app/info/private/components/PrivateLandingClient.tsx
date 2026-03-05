'use client';

import { useCallback, useState } from 'react';
import Header from './Header';
import Hero from './Hero';
import Philosophy from './Philosophy';
import Instructors from './Instructors';
import ClassFlow from './ClassFlow';
import Curriculum from './Curriculum';
import Diagnosis from './Diagnosis';
import Reviews from './Reviews';
import FAQ from './FAQ';
import ApplyForm from './ApplyForm';
import Footer from './Footer';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

export default function PrivateLandingClient() {
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const { message, visible, show } = useToast(3000);

  const handleResultChange = useCallback((summary: string) => {
    setDiagnosisSummary(summary);
  }, []);

  const handleAnalyzeResult = useCallback(
    (result: string) => {
      if (result === 'required') {
        show('안내: Q1 문항(필수 항목)을 최소 1개 이상 선택해 주세요.');
      } else if (result === 'success') {
        show('솔루션 분석이 완료되어 상담 폼에 반영되었습니다.');
      } else if (result === 'reset') {
        show('진단 내역이 초기화되었습니다.');
      }
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

  const handleKakaoOpen = useCallback(
    (requiredFilled: boolean) => {
      if (requiredFilled) {
        show('내용이 복사되었습니다. 카카오 채널에서 붙여넣기 하여 상담을 시작해 주세요.');
      } else {
        show('안내: 필수 항목 1~4번을 모두 기재하시면 상담이 더욱 신속해집니다.', 4000);
      }
    },
    [show]
  );

  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Philosophy />
        <Instructors />
        <ClassFlow />
        <Curriculum />
        <Diagnosis
          onResultChange={handleResultChange}
          onAnalyzeResult={handleAnalyzeResult}
        />
        <Reviews />
        <FAQ />
        <ApplyForm
          diagnosisSummary={diagnosisSummary}
          onCopyResult={handleCopyResult}
          onKakaoOpen={handleKakaoOpen}
        />
      </main>
      <Footer />
      <Toast message={message} visible={visible} />
    </>
  );
}
