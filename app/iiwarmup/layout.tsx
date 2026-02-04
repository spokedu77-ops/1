import { Suspense } from 'react';

export default function IIWarmupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        로딩 중...
      </div>
    }>
      {children}
    </Suspense>
  );
}
