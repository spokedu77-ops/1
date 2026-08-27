import { describe, expect, it } from 'vitest';

import {
  getMasterContentPrimaryAction,
  MASTER_CONTRACT_AUTHORITY,
  MASTER_DOMAIN_ROLES,
  MASTER_PRODUCT_CONTRACT,
  MASTER_PRODUCT_FLOW,
  MASTER_PRODUCT_VALUES,
  resolveMasterContentMode,
  resolveMasterHomePriority,
} from './masterProductTruth';

describe('MASTER Level 0 product contract', () => {
  it('keeps the complete product loop and equal product values in one consumable definition', () => {
    expect(MASTER_PRODUCT_CONTRACT.flow).toBe(MASTER_PRODUCT_FLOW);
    expect(MASTER_PRODUCT_FLOW).toEqual(['DISCOVER', 'BUILD', 'TEACH', 'CAPTURE', 'REUSE']);
    expect(Object.keys(MASTER_PRODUCT_VALUES)).toEqual(['CONTENT', 'CONTINUITY']);
    expect(MASTER_PRODUCT_CONTRACT.values).toBe(MASTER_PRODUCT_VALUES);
  });

  it('places Library and SPOMOVE in one independent content domain while limiting Session canonicality', () => {
    expect(MASTER_DOMAIN_ROLES.content.independentDiscovery).toBe(true);
    expect(MASTER_DOMAIN_ROLES.content.flow).toEqual(['DISCOVER', 'REVIEW', 'SELECT', 'BUILD']);
    expect(MASTER_DOMAIN_ROLES.content.library).toContain('Library');
    expect(MASTER_DOMAIN_ROLES.content.spomove).toContain('Library');
    expect(MASTER_DOMAIN_ROLES.session).toContain('한 번의 수업');
  });

  it('puts product meaning above implementation and legacy regression shape', () => {
    expect(MASTER_CONTRACT_AUTHORITY[0]).toBe('product');
    expect(MASTER_CONTRACT_AUTHORITY.indexOf('flow-ux')).toBeLessThan(MASTER_CONTRACT_AUTHORITY.indexOf('implementation'));
    expect(MASTER_CONTRACT_AUTHORITY.at(-1)).toBe('legacy-regression');
  });
});

describe('MASTER content and Home context', () => {
  it('keeps direct entry in discovery mode and exact scheduled Session entry in build mode', () => {
    expect(resolveMasterContentMode({ requestedSessionId: null, hasExactScheduledSession: false })).toBe('discovery');
    expect(resolveMasterContentMode({ requestedSessionId: 'missing', hasExactScheduledSession: false })).toBe('discovery');
    expect(resolveMasterContentMode({ requestedSessionId: 'session-1', hasExactScheduledSession: true })).toBe('session-build');
    expect(getMasterContentPrimaryAction('discovery')).toBe('활동 살펴보기');
    expect(getMasterContentPrimaryAction('session-build')).toBe('이 수업에 추가');
  });

  it('uses current user need instead of a permanent operations-first rule', () => {
    expect(resolveMasterHomePriority({ hasUrgentOperationalWork: true, hasTodaySession: true })).toBe('operational');
    expect(resolveMasterHomePriority({ hasUrgentOperationalWork: false, hasTodaySession: true })).toBe('today');
    expect(resolveMasterHomePriority({ hasUrgentOperationalWork: false, hasTodaySession: false })).toBe('discovery');
  });
});
