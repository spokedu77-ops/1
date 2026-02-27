'use client';

import dynamic from 'next/dynamic';

/**
 * Flow Phase는 getSupabaseBrowserClient를 사용하므로 클라이언트에서만 로드.
 * ssr: false로 prerender 시 FlowPhaseClient 모듈이 서버에서 실행되지 않아 빌드 오류를 방지합니다.
 */
const FlowPhaseClient = dynamic(
  () => import('./FlowPhaseClient'),
  { ssr: false, loading: () => <div className="w-full h-screen bg-black" /> }
);

export default function FlowPhasePage() {
  return <FlowPhaseClient />;
}
