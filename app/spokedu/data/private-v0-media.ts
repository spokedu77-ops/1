import { SPOKEDU_IMAGES } from './images';
import type { PrivatePreferredFormat, PrivateStartDirection } from './private-page';

/** Hero — 1:1 맞춤 수업 실사 (협찬 스텝레더·러닝스텝) */
export const PRIVATE_V0_HERO = {
  src: '/images/spokedu/private/private-coaching.jpg',
  alt: '체육관에서 지도자가 아동과 함께 스텝레더·민첩성 활동을 진행하는 밝은 개인수업 현장',
  objectPosition: '50% 42%',
} as const;

export const PRIVATE_V0_ONE_TO_ONE = {
  src: '/images/spokedu/private/private-tool-activity.jpg',
  alt: '지도자가 아동과 1:1로 줄넘기·후프 연계 활동을 밀착 지도하는 개인수업 현장',
  objectPosition: '50% 40%',
} as const;

export const PRIVATE_V0_SMALL_GROUP = {
  src: SPOKEDU_IMAGES.private.smallGroup.src,
  alt: SPOKEDU_IMAGES.private.smallGroup.alt,
  objectPosition: '62% 48%',
} as const;

/** 학부모 수업 피드백·리포트 UI (기존 랜딩 자산) */
export const PRIVATE_V0_PARENT_REPORT = {
  src: '/images/spokedu-master/landing/remember-report.png',
  alt: '수업 후 학부모에게 공유하는 성장·참여 피드백 리포트 화면',
  objectPosition: '50% 0%',
} as const;

export const PRIVATE_V0_CLASS_TYPE_CHIPS = [
  '1:1 개인수업',
  '소그룹 수업',
  '특수·발달 맞춤',
  'PAPS·기초체력',
  '기타 상담',
] as const;

export type PrivateV0ClassType = (typeof PRIVATE_V0_CLASS_TYPE_CHIPS)[number];

export function mapPrivateV0ClassType(type: PrivateV0ClassType): {
  preferredFormat: PrivatePreferredFormat;
  startDirection?: PrivateStartDirection;
  sport?: string;
} {
  switch (type) {
    case '1:1 개인수업':
      return { preferredFormat: 'one-to-one', startDirection: 'confidence' };
    case '소그룹 수업':
      return { preferredFormat: 'small-group', startDirection: 'peer-group' };
    case '특수·발달 맞춤':
      return { preferredFormat: 'one-to-one', startDirection: 'fundamental' };
    case 'PAPS·기초체력':
      return {
        preferredFormat: 'undecided',
        startDirection: 'fundamental',
        sport: 'PAPS·기초체력',
      };
    case '기타 상담':
    default:
      return { preferredFormat: 'undecided' };
  }
}
