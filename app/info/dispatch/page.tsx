import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOKEDU — 프리미엄 체육 파견 솔루션',
  description:
    '기관의 교육 수준을 증명하는 완벽한 체육 시스템. 연세대 체육교육 연구진 설계 몰입형 인터랙티브 웜업 프로그램.',
};

export default function DispatchInfoPage() {
  return (
    <iframe
      src="/info/dispatch.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="SPOKEDU 프리미엄 체육 파견 솔루션"
    />
  );
}
