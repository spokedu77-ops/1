'use client';

import { privatePage } from '../data/private-page';
import { AudienceTrustStrip } from './audience-trust-strip';

/** 근거 없는 카운트업 수치 대신 검증 가능한 운영 원칙만 표시 */
export function PrivateTrustMetrics() {
  return (
    <AudienceTrustStrip
      badge={privatePage.hero.trustBadge}
      eyebrow={privatePage.trustMetrics.eyebrow}
      items={privatePage.trustMetrics.items}
    />
  );
}
