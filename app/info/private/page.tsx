import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOKEDU | 과외 수업 안내',
  description: '스포키듀 개인/소그룹 과외 수업 안내',
};

export default function PrivateInfoPage() {
  return (
    <iframe
      src="/info/private.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="SPOKEDU 과외 수업 안내"
    />
  );
}
