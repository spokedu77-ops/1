import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../data/site';

/** 상단 메뉴에 없음 — 소개로 안내 */
export default function SpokeduInsightsPage() {
  redirect(`${SPOKEDU_BASE_PATH}/about`);
}
