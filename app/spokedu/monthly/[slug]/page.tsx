import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../../data/site';

/** 상단 메뉴에 없음 — 수업 사례로 안내 */
export default function SpokeduMonthlyDetailPage() {
  redirect(`${SPOKEDU_BASE_PATH}/records`);
}
