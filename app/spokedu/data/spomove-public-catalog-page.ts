import { dispatchInquiryHref } from './commercial-routes';
import { spomoveProgramPage } from './spomove-program-page';
import { SPOKEDU_PATHS } from './site';

/** `/spomove/catalog` 자체 페이지 SSOT — `spomove-program-page`에서 검증된 공개 copy만 재사용 */
export const spomovePublicCatalogPage = {
  kicker: 'SPOMOVE',
  title: 'SPOMOVE 프로그램 구성',
  subtitle: '화면의 정보를 보고 판단한 뒤 움직임으로 연결하는 프로그램을 소개합니다.',
  levelsIntro:
    'SPOMOVE는 화면의 자극을 보고 반응하는 방식에 따라 단순·선택·복합 반응으로 구성됩니다.',
  activityIntro:
    '프로그램별 화면과 과제를 먼저 확인하세요. SEE·DECIDE·MOVE 흐름은 SPOMOVE 소개 페이지에서 자세히 설명합니다.',
  levels: spomoveProgramPage.content.levels,
  flowEyebrow: spomoveProgramPage.flow.eyebrow,
  flowSteps: spomoveProgramPage.flow.steps,
  activitySectionTitle: spomoveProgramPage.activities.title,
  activityCards: spomoveProgramPage.activities.items,
  ctas: {
    primary: {
      label: 'SPOMOVE 알아보기',
      href: SPOKEDU_PATHS.spomove,
      trackLabel: 'spomove-catalog-primary-spomove',
    },
    secondary: {
      label: '기관 도입 문의',
      href: dispatchInquiryHref({ program: 'spomove' }),
      trackLabel: 'spomove-catalog-dispatch',
    },
    lab: {
      label: 'SPOKEDU LAB 알아보기',
      href: SPOKEDU_PATHS.subscription,
      trackLabel: 'spomove-catalog-lab',
    },
  },
} as const;
