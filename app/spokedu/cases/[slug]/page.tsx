import { permanentRedirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../../data/site';

/** 레거시 `/spokedu/cases/[slug]` — 개별 slug 매핑 없이 records 목록으로 영구 이전 */
export default async function SpokeduCaseDetailPage() {
  permanentRedirect(`${SPOKEDU_BASE_PATH}/records`);
}
