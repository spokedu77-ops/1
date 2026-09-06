import { permanentRedirect } from 'next/navigation';
import { SPOKEDU_PATHS } from '../../data/site';

/** 상단 메뉴에 없음 — 기관 체육교육으로 안내 */
export default function SpokeduProgramCampPage() {
  permanentRedirect(SPOKEDU_PATHS.education);
}
