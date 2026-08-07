import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_COMMERCIAL_MODES,
  curriculumCommercialModes,
  curriculumModeList,
  curriculumModeScrollTarget,
  isCurriculumCommercialMode,
  resolveCurriculumMode,
} from './curriculum-commercial-modes';
import { curriculumPage } from './curriculum-page';
import { getPublicProductContract } from './public-product-contract';
import { MASTER_HANDOFF } from './site';

describe('curriculum commercial modes', () => {
  it('defines four commercial modes with distinct primary intent ids', () => {
    expect([...CURRICULUM_COMMERCIAL_MODES]).toEqual(['package', 'training', 'master', 'license']);
    const intentIds = curriculumModeList.map((mode) => mode.primaryAction.intentId);
    expect(new Set(intentIds).size).toBe(4);
  });

  it('keeps MASTER/subscription primary on product handoff (not inquiry form)', () => {
    const master = curriculumCommercialModes.master;
    const contract = getPublicProductContract();
    expect(master.primaryAction.href).toBe(contract.handoff.freeStartHref);
    expect(master.primaryAction.intentId).toBe('free_start');
    expect(master.secondaryAction?.href).toBe(contract.handoff.landingHref);
    expect(master.secondaryAction?.intentId).toBe('master_view');
  });

  it('gives every inquiry mode formDefaults with matching leadMode', () => {
    for (const mode of curriculumModeList) {
      expect(mode.formDefaults?.leadMode).toBe(mode.id);
      expect(mode.primaryAction.trackingLabel).toContain(mode.id);
      expect(mode.evidence.length).toBeGreaterThan(0);
    }
  });

  it('pairs only strong history evidence ids that exist on curriculumPage', () => {
    const historyIds = new Set<string>(curriculumPage.serviceExamples.items.map((item) => item.id));
    for (const mode of curriculumModeList) {
      for (const evidence of mode.evidence) {
        if (evidence.type === 'history') {
          expect(historyIds.has(evidence.historyId), evidence.historyId).toBe(true);
        }
        if (evidence.type === 'missing') {
          expect(evidence.note.length).toBeGreaterThan(8);
        }
      }
    }
  });

  it('resolves URL mode safely with subscription default', () => {
    expect(resolveCurriculumMode(null)).toBe('master');
    expect(resolveCurriculumMode('package')).toBe('package');
    expect(resolveCurriculumMode('training')).toBe('training');
    expect(resolveCurriculumMode('license')).toBe('license');
    expect(resolveCurriculumMode('nope')).toBe('master');
    expect(isCurriculumCommercialMode('license')).toBe(true);
    expect(isCurriculumCommercialMode('x')).toBe(false);
  });

  it('maps mode query to scroll anchors for training/license/package/master', () => {
    expect(curriculumModeScrollTarget('master')).toBe('plans');
    expect(curriculumModeScrollTarget('training')).toBe('training');
    expect(curriculumModeScrollTarget('license')).toBe('license');
    expect(curriculumModeScrollTarget('package')).toBe('package');
  });

  it('uses public contract handoff on subscription hub hero (no hardcoded MASTER product name CTA)', () => {
    const contract = getPublicProductContract();
    expect(curriculumPage.hero.primaryCta.href).toBe(contract.handoff.freeStartHref);
    expect(curriculumPage.hero.secondaryCta.href).toBe(contract.handoff.landingHref);
    expect(curriculumPage.hero.secondaryCta.href).toBe(MASTER_HANDOFF.landing);
    expect(curriculumPage.hero.eyebrow).toBe('스포키듀 구독시스템');
    expect(curriculumPage.sectionOrder.length).toBeLessThanOrEqual(7);
  });
});
