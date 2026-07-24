import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../../data/site';

/** 상단 메뉴에 없음 — 기관 프로그램으로 안내 */
export default function SpokeduProgramOnedayEventPage() {
  redirect(`${SPOKEDU_BASE_PATH}/dispatch`);
}
