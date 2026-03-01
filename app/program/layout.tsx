import { Suspense } from 'react';

export default function ProgramLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full">
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </div>
  );
}
