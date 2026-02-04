/**
 * Admin - IIWarmup - Flow Phase
 * PR-C: /admin/iiwarmup/flow에서 Flow Phase 접근
 * 
 * 서버 리다이렉트 (App Router 권장 방식)
 * - 클라이언트 push보다 깔끔 (화면 깜빡임/히스토리 누적 없음)
 */

import { redirect } from 'next/navigation';

export default function AdminFlowPage() {
  redirect('/flow-phase?admin=true');
}
