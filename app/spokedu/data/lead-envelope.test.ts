import { describe, expect, it } from 'vitest';
import {
  buildLeadEnvelope,
  deriveConsultColumns,
  getLeadResponseChecklist,
  isAllowedCtaIntent,
} from './lead-envelope';

describe('lead envelope contract', () => {
  it('rejects mismatched curriculum CTA', () => {
    const built = buildLeadEnvelope({
      schemaVersion: 1,
      route: 'curriculum',
      acquisition: { entrySurface: 'home' },
      selection: { route: 'curriculum', mode: 'training' },
      ctaIntentId: 'package_quote',
    });
    expect(built.ok).toBe(false);
  });

  it('accepts training consult and derives filter columns', () => {
    const built = buildLeadEnvelope({
      schemaVersion: 1,
      route: 'curriculum',
      acquisition: { entrySurface: 'programs', utmSource: 'instagram' },
      selection: {
        route: 'curriculum',
        mode: 'training',
        contentType: '지도자 교육·세미나',
      },
      ctaIntentId: 'training_consult',
      conversionEvidenceSlug: undefined,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const cols = deriveConsultColumns(built.envelope);
    expect(cols.lead_route).toBe('curriculum');
    expect(cols.curriculum_mode).toBe('training');
    expect(cols.private_start_direction).toBeNull();
    expect(cols.lead_context.ctaIntentId).toBe('training_consult');
  });

  it('allows master org inquiry but not arbitrary strings', () => {
    expect(
      isAllowedCtaIntent(
        'curriculum',
        { route: 'curriculum', mode: 'master' },
        'master_org_inquiry',
      ),
    ).toBe(true);
    expect(
      isAllowedCtaIntent('curriculum', { route: 'curriculum', mode: 'master' }, 'hack_me'),
    ).toBe(false);
  });

  it('derives response checklist from route/mode without storing it', () => {
    const training = getLeadResponseChecklist({ leadRoute: 'curriculum', curriculumMode: 'training' });
    expect(training.title).toContain('교육');
    expect(training.items.length).toBeGreaterThan(2);
    const privateCheck = getLeadResponseChecklist({
      leadRoute: 'private',
      privateStartDirection: 'confidence',
    });
    expect(privateCheck.items.some((i) => i.includes('지도자'))).toBe(true);
  });
});
