import { dispatchPage } from '../data/dispatch-page';
import { LandingProcessOnePager } from './landing-process-one-pager';

/** 기관 담당자·결재 공유용 — 문의→운영 흐름 + 체크리스트 한 장 */
export function DispatchProcessOnePager() {
  return <LandingProcessOnePager data={dispatchPage.processOnePager} />;
}
