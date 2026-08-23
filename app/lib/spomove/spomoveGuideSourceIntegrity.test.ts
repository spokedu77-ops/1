import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { listActiveSpomoveCatalog } from './spomoveBriefingCoverage';
import { resolveSpomoveBriefingReadiness } from './spomoveBriefingReadiness';
import {
  applySpomoveGuideSourceBaseline,
  planSpomoveGuideSourceBaseline,
} from './applySpomoveGuideSourceBaseline';
import { SPOMOVE_GUIDE_SOURCE_DIGESTS } from './generated/spomoveGuideSourceDigests.generated';
import {
  buildSpomoveGuideSemanticSnapshot,
} from './spomoveGuideSemanticSnapshot';
import {
  buildSpomoveGuideSourceFingerprint,
  buildSpomoveGuideSourceFingerprintWithDigests,
  SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
} from './spomoveGuideSourceFingerprint';
import {
  preserveSourceBaselineFields,
  resolveSpomoveGuideSourceIntegrity,
  withPublishedSourceBaseline,
} from './spomoveGuideSourceIntegrity';
import {
  resolveSpomoveGuideSourceClustersForPreset,
  SPOMOVE_GUIDE_SOURCE_CLUSTERS,
} from './spomoveGuideSourceManifest';
import { normalizeSpomoveContentMap, type SpomovePresetContentOverride } from './spomoveOfficialAssets';
import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

function clonePreset(preset: OfficialSpomovePreset, patch: Partial<OfficialSpomovePreset>): OfficialSpomovePreset {
  return {
    ...preset,
    ...patch,
    engine: {
      ...preset.engine,
      ...(patch.engine ?? {}),
    },
  };
}

function samplePublishedReady(_preset: OfficialSpomovePreset): SpomovePresetContentOverride {
  const builtIn = _preset.id.startsWith('dive-');
  return {
    movementGuideStatus: 'published',
    movementGuide: {
      objective: '테스트 목표',
      instruction: '테스트 지시',
      coachScript: '테스트 코치',
      focusTags: ['choiceReaction'],
      teachingPoints: ['포인트1', '포인트2'],
      easier: '쉽게',
      harder: '어렵게',
      successCriteria: '성공',
      commonMistake: '실수',
      movement: builtIn ? null : { baseMovement: 'handTouch', limbRule: 'free' },
    },
  };
}

describe('SPOMOVE guide source digest generation', () => {
  it('keeps generated digests in sync with source (--check)', () => {
    execFileSync(process.execPath, ['scripts/generate-spomove-guide-source-digest.mjs', '--check'], {
      cwd: join(process.cwd()),
      stdio: 'pipe',
    });
  });

  it('covers every cluster id used by active presets', () => {
    const active = listActiveSpomoveCatalog();
    expect(active.length).toBe(72);
    for (const preset of active) {
      const clusters = resolveSpomoveGuideSourceClustersForPreset(preset);
      expect(clusters.length).toBeGreaterThan(0);
      for (const id of clusters) {
        expect(SPOMOVE_GUIDE_SOURCE_DIGESTS[id], `digest for ${id} (${preset.id})`).toBeTruthy();
        expect(SPOMOVE_GUIDE_SOURCE_CLUSTERS.some((c) => c.id === id)).toBe(true);
      }
    }
  });
});

describe('resolveSpomoveGuideSourceIntegrity', () => {
  const preset = findOfficialSpomovePreset('visual-reaction-goalkeeper-42')!;

  it('returns untracked when fingerprint is missing (never changed)', () => {
    const r = resolveSpomoveGuideSourceIntegrity({
      preset,
      contentOverride: samplePublishedReady(preset),
    });
    expect(r.status).toBe('untracked');
    expect(r.storedFingerprint).toBeNull();
  });

  it('returns current when stored fingerprint matches', () => {
    const fp = buildSpomoveGuideSourceFingerprint(preset);
    const r = resolveSpomoveGuideSourceIntegrity({
      preset,
      contentOverride: {
        ...samplePublishedReady(preset),
        sourceFingerprint: fp,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
        sourceReviewedAt: '2026-08-24T00:00:00.000Z',
      },
    });
    expect(r.status).toBe('current');
  });

  it('returns changed when semantic contract differs (CASE A goalkeeperTier)', () => {
    const stored = buildSpomoveGuideSourceFingerprint(preset);
    const mutated = clonePreset(preset, {
      engine: { ...preset.engine, goalkeeperTier: 1 },
    });
    expect(mutated.engine.goalkeeperTier).not.toBe(preset.engine.goalkeeperTier);
    const r = resolveSpomoveGuideSourceIntegrity({
      preset: mutated,
      contentOverride: {
        ...samplePublishedReady(preset),
        sourceFingerprint: stored,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    expect(r.status).toBe('changed');
  });

  it('returns changed when reactTrainConcurrent changes (CASE B)', () => {
    const flow = findOfficialSpomovePreset('visual-reaction-flow-2x-31')!;
    const stored = buildSpomoveGuideSourceFingerprint(flow);
    const mutated = clonePreset(flow, {
      engine: { ...flow.engine, reactTrainConcurrent: 3 },
    });
    const r = resolveSpomoveGuideSourceIntegrity({
      preset: mutated,
      contentOverride: {
        ...samplePublishedReady(flow),
        sourceFingerprint: stored,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    expect(r.status).toBe('changed');
  });

  it('returns changed when handFootDifficulty changes (CASE C)', () => {
    const hf = findOfficialSpomovePreset('visual-reaction-hand-foot-easy-skeleton')!;
    const stored = buildSpomoveGuideSourceFingerprint(hf);
    const mutated = clonePreset(hf, {
      engine: { ...hf.engine, handFootDifficulty: 'hard' },
    });
    const r = resolveSpomoveGuideSourceIntegrity({
      preset: mutated,
      contentOverride: {
        ...samplePublishedReady(hf),
        sourceFingerprint: stored,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    expect(r.status).toBe('changed');
  });

  it('returns changed when runtime digest changes with same preset (CASE D/E)', () => {
    const hf = findOfficialSpomovePreset('visual-reaction-hand-foot-hard-skeleton')!;
    const stored = buildSpomoveGuideSourceFingerprint(hf);
    const digests = { ...SPOMOVE_GUIDE_SOURCE_DIGESTS, handFootBasicL7: 'deadbeefdeadbeef' };
    const nextFp = buildSpomoveGuideSourceFingerprintWithDigests(hf, digests);
    expect(nextFp).not.toBe(stored);
    const r = resolveSpomoveGuideSourceIntegrity({
      preset: hf,
      contentOverride: {
        ...samplePublishedReady(hf),
        sourceFingerprint: stored,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    // Integrity uses generated digests — simulate "current" mismatch via stored fake
    const r2 = resolveSpomoveGuideSourceIntegrity({
      preset: hf,
      contentOverride: {
        ...samplePublishedReady(hf),
        sourceFingerprint: nextFp,
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    expect(r.status).toBe('current');
    expect(r2.status).toBe('changed');
  });

  it('ignores sortOrder / BGM / title presentation metadata (CASE F/G/H)', () => {
    const base = buildSpomoveGuideSourceFingerprint(preset);
    const sortPatched = clonePreset(preset, { sortOrder: (preset.sortOrder ?? 0) + 99 });
    const bgmPatched = {
      ...preset,
      bgmCategory: 'other-category',
      bgmAutoPlay: false,
    } as unknown as OfficialSpomovePreset;
    const titlePatched = clonePreset(preset, { title: `${preset.title}!!!` });
    expect(buildSpomoveGuideSourceFingerprint(sortPatched)).toBe(base);
    expect(buildSpomoveGuideSourceFingerprint(bgmPatched)).toBe(base);
    expect(buildSpomoveGuideSourceFingerprint(titlePatched)).toBe(base);
    expect(buildSpomoveGuideSemanticSnapshot(sortPatched)).toEqual(buildSpomoveGuideSemanticSnapshot(preset));
  });

  it('treats unknown fingerprint version as untracked (not changed)', () => {
    const r = resolveSpomoveGuideSourceIntegrity({
      preset,
      contentOverride: {
        ...samplePublishedReady(preset),
        sourceFingerprint: 'abc',
        sourceFingerprintVersion: 999,
      },
    });
    expect(r.status).toBe('untracked');
  });
});

describe('cluster isolation (false-positive guard)', () => {
  it('Goalkeeper digest change does not drift Sequential', () => {
    const gk = findOfficialSpomovePreset('visual-reaction-goalkeeper-42')!;
    const seq = findOfficialSpomovePreset('sequential-memory-3color-09')!;
    const digests = { ...SPOMOVE_GUIDE_SOURCE_DIGESTS, visualGoalkeeper: 'gk-changed-digest01' };
    expect(buildSpomoveGuideSourceFingerprintWithDigests(gk, digests)).not.toBe(
      buildSpomoveGuideSourceFingerprint(gk),
    );
    expect(buildSpomoveGuideSourceFingerprintWithDigests(seq, digests)).toBe(
      buildSpomoveGuideSourceFingerprint(seq),
    );
  });

  it('Mole digest change does not drift Flanker', () => {
    const mole = findOfficialSpomovePreset('visual-reaction-mole-l1')!;
    const flanker = findOfficialSpomovePreset('flanker-uniform-07')!;
    const digests = { ...SPOMOVE_GUIDE_SOURCE_DIGESTS, visualMole: 'mole-changed-digest01' };
    expect(buildSpomoveGuideSourceFingerprintWithDigests(mole, digests)).not.toBe(
      buildSpomoveGuideSourceFingerprint(mole),
    );
    expect(buildSpomoveGuideSourceFingerprintWithDigests(flanker, digests)).toBe(
      buildSpomoveGuideSourceFingerprint(flanker),
    );
  });

  it('Sequential L4 digest change does not drift Reaction Cognition', () => {
    const l4 = findOfficialSpomovePreset('sequential-memory-color-number-exp')!;
    expect(l4.engine.level).toBe(4);
    const rc = findOfficialSpomovePreset('reaction-cognition-space-direction-01')!;
    const digests = { ...SPOMOVE_GUIDE_SOURCE_DIGESTS, sequentialMemoryL4: 'l4-changed-digest01' };
    expect(buildSpomoveGuideSourceFingerprintWithDigests(l4, digests)).not.toBe(
      buildSpomoveGuideSourceFingerprint(l4),
    );
    expect(buildSpomoveGuideSourceFingerprintWithDigests(rc, digests)).toBe(
      buildSpomoveGuideSourceFingerprint(rc),
    );
  });
});

describe('lifecycle + commercial independence', () => {
  const preset = findOfficialSpomovePreset('visual-reaction-goalkeeper-42')!;

  it('Draft save preserves baseline fingerprint', () => {
    const published = withPublishedSourceBaseline(preset, samplePublishedReady(preset), '2026-01-01T00:00:00.000Z');
    const draftNext = preserveSourceBaselineFields(published, {
      ...published,
      movementGuideStatus: 'draft',
      movementGuide: {
        ...published.movementGuide!,
        objective: '편집 중 목표',
      },
      sourceFingerprint: 'should-be-overwritten',
      sourceFingerprintVersion: 9,
      sourceReviewedAt: '2099-01-01T00:00:00.000Z',
    });
    expect(draftNext.sourceFingerprint).toBe(published.sourceFingerprint);
    expect(draftNext.sourceFingerprintVersion).toBe(published.sourceFingerprintVersion);
    expect(draftNext.sourceReviewedAt).toBe(published.sourceReviewedAt);
  });

  it('Published re-confirm refreshes baseline to current', () => {
    const stale = {
      ...samplePublishedReady(preset),
      sourceFingerprint: 'stale-hash',
      sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      sourceReviewedAt: '2020-01-01T00:00:00.000Z',
    };
    expect(resolveSpomoveGuideSourceIntegrity({ preset, contentOverride: stale }).status).toBe('changed');
    const confirmed = withPublishedSourceBaseline(preset, stale, '2026-08-24T12:00:00.000Z');
    expect(resolveSpomoveGuideSourceIntegrity({ preset, contentOverride: confirmed }).status).toBe(
      'current',
    );
  });

  it('Source Changed can still be Commercial Ready', () => {
    const ready = samplePublishedReady(preset);
    const { readiness } = resolveSpomoveBriefingReadiness({
      preset,
      contentOverride: {
        ...ready,
        sourceFingerprint: 'stale',
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    });
    expect(readiness).toBe('ready');
    expect(
      resolveSpomoveGuideSourceIntegrity({
        preset,
        contentOverride: {
          ...ready,
          sourceFingerprint: 'stale',
          sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
        },
      }).status,
    ).toBe('changed');
  });

  it('normalizeSpomoveContentMap preserves source metadata', () => {
    const fp = buildSpomoveGuideSourceFingerprint(preset);
    const map = normalizeSpomoveContentMap({
      content: {
        [preset.id]: {
          ...samplePublishedReady(preset),
          sourceFingerprint: fp,
          sourceFingerprintVersion: 1,
          sourceReviewedAt: '2026-08-24T00:00:00.000Z',
        },
      },
    });
    expect(map[preset.id]?.sourceFingerprint).toBe(fp);
    expect(map[preset.id]?.sourceFingerprintVersion).toBe(1);
    expect(map[preset.id]?.sourceReviewedAt).toBe('2026-08-24T00:00:00.000Z');
  });
});

describe('source baseline bootstrap (merge-only)', () => {
  it('plans eligible rows and applies metadata without mutating guide body', () => {
    const active = listActiveSpomoveCatalog();
    const content: Record<string, SpomovePresetContentOverride> = {};
    for (const preset of active) {
      content[preset.id] = samplePublishedReady(preset);
    }
    const plan = planSpomoveGuideSourceBaseline({ presets: active, content });
    expect(plan.filter((r) => r.bootstrapEligible)).toHaveLength(72);

    const eligibleIds = plan.filter((r) => r.bootstrapEligible).map((r) => r.presetId);
    const applied = applySpomoveGuideSourceBaseline({
      current: content,
      presets: active,
      eligiblePresetIds: eligibleIds,
      reviewedAt: '2026-08-24T00:00:00.000Z',
    });
    expect(applied.changedPresetIds).toHaveLength(72);
    expect(applied.afterEntryCount).toBe(72);

    for (const preset of active) {
      expect(applied.guideBodyAfterById[preset.id]).toBe(applied.guideBodyBeforeById[preset.id]);
      expect(
        resolveSpomoveGuideSourceIntegrity({
          preset,
          contentOverride: applied.content[preset.id],
        }).status,
      ).toBe('current');
      expect(resolveSpomoveBriefingReadiness({
        preset,
        contentOverride: applied.content[preset.id],
      }).readiness).toBe('ready');
    }
  });

  it('excludes entries that already have fingerprint', () => {
    const preset = findOfficialSpomovePreset('dive-standard')!;
    const content = {
      [preset.id]: {
        ...samplePublishedReady(preset),
        sourceFingerprint: buildSpomoveGuideSourceFingerprint(preset),
        sourceFingerprintVersion: SPOMOVE_GUIDE_SOURCE_FINGERPRINT_VERSION,
      },
    };
    const plan = planSpomoveGuideSourceBaseline({ presets: [preset], content });
    expect(plan[0]?.bootstrapEligible).toBe(false);
  });
});

describe('Public import guard', () => {
  it('spokedu-master public tree does not import source digests as runtime fallback', () => {
    const root = join(process.cwd(), 'app/spokedu-master');
    const walk: string[] = [];
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx)$/.test(name)) walk.push(full);
      }
    }
    const hits = walk.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return (
        text.includes('spomoveGuideSourceDigests') ||
        text.includes('resolveSpomoveGuideSourceIntegrity') ||
        text.includes('sourceFingerprint')
      );
    });
    expect(hits).toEqual([]);
  });
});
