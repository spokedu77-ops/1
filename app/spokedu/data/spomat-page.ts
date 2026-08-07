import { getPublicProductContract } from './public-product-contract';
import { SPOKEDU_BASE_PATH } from './site';
import type { HomeMediaKey } from './home-media';

const publicProduct = getPublicProductContract();

/**
 * SPOMAT 상세 — SPOMOVE 실행 도구. 별도 사업 아님.
 * 가격: public contract pricesPublished=false → 비공개.
 * 스펙: MASTER shop에 확인된 값만.
 */
export const spomatPage = {
  sectionOrder: [
    'definition',
    'structure',
    'usage',
    'examples',
    'specs',
    'purchase',
  ] as const,

  definition: {
    id: 'definition',
    eyebrow: 'SPOMAT',
    title: 'SPOMAT은 SPOMOVE를 실행하는 물리적 도구입니다',
    lead:
      '화면의 색·위치 신호가 바닥 패드의 위치로 이어지도록 돕는 실행 도구입니다. SPOMOVE 콘텐츠와 동일한 제품이 아니며, 별도 사업으로 취급하지 않습니다.',
    mediaKey: 'spomovePadSystem' as HomeMediaKey,
  },

  structure: {
    id: 'structure',
    eyebrow: '구조',
    title: '2×2 색 위치',
    lead: '네 칸의 위치가 화면 신호와 대응합니다.',
    cells: [
      { name: 'GREEN', ko: '초록', hex: '#22C55E' },
      { name: 'RED', ko: '빨강', hex: '#EF4444' },
      { name: 'BLUE', ko: '파랑', hex: '#3B82F6' },
      { name: 'YELLOW', ko: '노랑', hex: '#EAB308' },
    ] as const,
  },

  usage: {
    id: 'usage',
    eyebrow: '사용',
    title: 'SPOMOVE에서의 사용 방식',
    lead: '화면에서 색·위치·방향을 확인한 뒤, SPOMAT 위에서 점프·이동·터치 등으로 반응합니다.',
    points: [
      { title: '확인', body: '화면 신호의 색·위치를 읽습니다.' },
      { title: '판단', body: '규칙에 맞는 반응을 고릅니다.' },
      { title: '수행', body: '해당 칸에서 움직임을 실행합니다.' },
      { title: '조절', body: '속도와 타이밍을 이어 갑니다.' },
    ] as const,
  },

  examples: {
    id: 'examples',
    eyebrow: '적용',
    title: '수업 적용 예',
    items: [
      {
        title: '반응 이동',
        body: '화면에 제시된 색 칸으로 이동·착지합니다.',
      },
      {
        title: '규칙 전환',
        body: '신호 규칙이 바뀌면 같은 패드 위에서 반응을 바꿉니다.',
      },
      {
        title: '공간 기준',
        body: '교실·체육관 등에서 발 위치의 기준으로 활용합니다.',
      },
    ] as const,
  },

  /** MASTER shop 확인 스펙만 — 무게·KC·제조국 없음 */
  specs: {
    id: 'specs',
    eyebrow: '구성',
    title: '구성·사용 안내',
    lead: '제품 원장에 확인된 규격만 안내합니다. 확인되지 않은 무게·인증·제조국은 표기하지 않습니다.',
    items: [
      { label: '규격', value: '60 × 60cm' },
      { label: '총 두께', value: '5.5mm' },
      { label: '표면', value: '폴리에스터' },
      { label: '바닥', value: '라텍스 미끄럼 방지' },
      { label: '테두리', value: '폴리프로필렌' },
      { label: '색상', value: '빨강·노랑·초록·파랑' },
    ] as const,
    note: 'SPOMAT 구매는 SPOMOVE 이용의 필수 조건이 아닙니다.',
  },

  purchase: {
    id: 'purchase',
    eyebrow: '이용 경로',
    title: '구매·이용 안내',
    lead: publicProduct.spomat.pricesPublished
      ? '공개 가격으로 안내합니다.'
      : '가격은 이번 페이지에서 공개하지 않습니다. 구매·회원가 안내는 제품 경로에서 확인하세요.',
    primary: {
      label: publicProduct.spomat.purchaseGuideLabel,
      href: publicProduct.spomat.shopHref,
      trackLabel: 'spomat-purchase-guide',
    },
    secondary: [
      {
        label: 'SPOMOVE 알아보기',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'spomat-to-spomove',
      },
      {
        label: '구독시스템 알아보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'spomat-to-curriculum',
      },
    ] as const,
  },
} as const;
