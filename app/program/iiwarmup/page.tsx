import { redirect } from 'next/navigation';

/** 구독자 페이지 제거 후: /program/iiwarmup 접속 시 admin으로 리다이렉트 */
export default function ProgramIIWarmupPage() {
  redirect('/admin/iiwarmup');
}
