import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOKEDU — 프리미엄 체육 파견 솔루션',
  description:
    '시키지 않아도 뛰어드는 아이들, 그 수업을 설계합니다. 연세대학교 체육교육 전공 출신이 직접 설계한 기관 맞춤 체육 파견 솔루션.',
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
