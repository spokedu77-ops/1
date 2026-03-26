import type { Metadata } from 'next';
import './move-report.css';

export const metadata: Metadata = {
  title: '스포키듀 무브 리포트',
  description: '우리 아이 움직임 유형은? — 스포키듀 무브 리포트',
  openGraph: {
    title: '스포키듀 무브 리포트 — 우리 아이 신체활동 성향 분석',
    description: '우리 아이 움직임 유형은? — 스포키듀 무브 리포트',
  },
};

export default function MoveReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;600;700;900&family=Bebas+Neue&family=DM+Serif+Display:ital@1&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />
      {children}
    </>
  );
}
