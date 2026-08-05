import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_COMMERCIAL_MODES,
  curriculumCommercialModes,
  curriculumModeList,
  isCurriculumCommercialMode,
  resolveCurriculumMode,
} from './curriculum-commercial-modes';
import { curriculumPage } from './curriculum-page';

describe('curriculum commercial modes', () => {
  it('defines four commercial modes with distinct primary intent ids', () => {
    expect([...CURRICULUM_COMMERCIAL_MODES]).toEqual(['package', 'training', 'master', 'license']);
    const intentIds = curriculumModeList.map((mode) => mode.primaryAction.intentId);
    expect(new Set(intentIds).size).toBe(4);
  });

  it('keeps MASTER primary off the general inquiry form', () => {
    const master = curriculumCommercialModes.master;
    expect(master.primaryAction.href).toBe('/spokedu-master/landing');
    expect(master.primaryAction.intentId).toBe('master_view');
    expect(master.secondaryAction?.intentId).toBe('master_org_inquiry');
    expect(master.secondaryAction?.formDefaults?.leadMode).toBe('master');
  });

  it('gives every inquiry mode formDefaults with matching leadMode', () => {
    for (const mode of curriculumModeList) {
      expect(mode.formDefaults?.leadMode).toBe(mode.id);
      expect(mode.primaryAction.trackingLabel).toContain(mode.id);
      expect(mode.evidence.length).toBeGreaterThan(0);
    }
  });

  it('pairs only strong history evidence ids that exist on curriculumPage', () => {
    const historyIds = new Set(curriculumPage.serviceExamples.items.map((item) => item.id));
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

  it('resolves URL mode safely', () => {
    expect(resolveCurriculumMode('package')).toBe('package');
    expect(resolveCurriculumMode('nope')).toBe('training');
    expect(isCurriculumCommercialMode('license')).toBe(true);
    expect(isCurriculumCommercialMode('x')).toBe(false);
  });

  it('drops duplicated contact secondary CTA from curriculum hero', () => {
    expect(curriculumPage.heroCtas.secondary.href).toBe('/spokedu-master/landing');
    expect(curriculumPage.heroCtas.secondary.label).toContain('MASTER');
    expect(curriculumPage.heroCtas.primary.href).toBe('#modes');
  });
});
