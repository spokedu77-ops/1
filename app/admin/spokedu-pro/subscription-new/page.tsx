'use client';

import dynamic from 'next/dynamic';

const SpokeduSubscriptionExperienceV2 = dynamic(() => import('./SpokeduSubscriptionExperienceV2'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0f172a]">
      <div className="flex items-center gap-3 text-slate-300">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-300" />
        <p className="text-sm font-bold">스포크두 구독 화면 준비 중...</p>
      </div>
    </div>
  ),
});

export default function AdminSpokeduSubscriptionNewPage() {
  return <SpokeduSubscriptionExperienceV2 />;
}
