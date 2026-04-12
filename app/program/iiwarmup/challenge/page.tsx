'use client';

import dynamic from 'next/dynamic';

const ChallengeProgramClient = dynamic(
  () => import('./ChallengeProgramClient'),
  { ssr: false, loading: () => <div className="min-h-screen w-full bg-neutral-950" /> }
);

export default function ChallengeProgramPage() {
  return <ChallengeProgramClient />;
}
