import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../data/site';

/** 상단 메뉴에 없음 — SPOMOVE로 안내 */
export default function SpokeduProgramsIndexPage() {
  redirect(`${SPOKEDU_BASE_PATH}/programs/spomove`);
}
