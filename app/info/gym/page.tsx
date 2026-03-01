import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOKEDU | 체육관 수업 안내',
  description: '50분 정규수업 · 12주 커리큘럼 · 소그룹 레벨링 · 성장 리포트',
};

export default function GymInfoPage() {
  return (
    <iframe
      src="/info/gym.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="SPOKEDU 체육관 수업 안내"
    />
  );
}
