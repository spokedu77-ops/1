import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공유된 MOVE 리포트 결과',
  description: '공유받은 MOVE 리포트 결과를 확인하고, 나도 테스트해보세요.',
  openGraph: {
    title: '공유된 MOVE 리포트 결과',
    description: '공유받은 결과를 확인하고 나도 MOVE 리포트를 해보세요.',
    url: '/move-report/shared',
    images: [
      {
        url: '/move-report/opengraph-image',
        width: 1200,
        height: 630,
        alt: '스포키듀 MOVE 리포트 공유 결과',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '공유된 MOVE 리포트 결과',
    description: '공유받은 결과를 확인하고 나도 MOVE 리포트를 해보세요.',
    images: ['/move-report/opengraph-image'],
  },
};

export default function MoveReportSharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
