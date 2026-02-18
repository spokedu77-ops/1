import { redirect } from 'next/navigation';

/**
 * 센터 목록은 "일정 및 센터관리" 페이지의 센터 관리 탭으로 통합되었습니다.
 * /admin/centers 링크는 일정·센터 통합 페이지로 리다이렉트합니다.
 */
export default function CentersRedirect() {
  redirect('/admin/schedules');
}
