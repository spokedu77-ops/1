'use client';

/**
 * 구독자(view) 전용 스포키듀 구독 페이지.
 * 데이터는 API GET만 사용. 편집 UI 없음.
 */
export default function SpokeduProView() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-black tracking-tight mb-2">스포키듀 구독</h1>
      <p className="text-slate-400 font-medium">SPOKEDU PRO · Accessible Smart PE</p>
      <p className="mt-8 text-sm text-slate-500">대시보드 UI는 API·훅 연동 후 배치됩니다.</p>
    </div>
  );
}
