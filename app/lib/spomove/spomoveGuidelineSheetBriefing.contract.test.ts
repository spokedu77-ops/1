import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { listReactionCognitionSeedsByCluster } from './applySpomoveGuideSeedBatch';
import { applySpomoveGuideSeedBatch } from './applySpomoveGuideSeedBatch';
import { guideBodyFingerprint } from './spomoveGuideSourceIntegrity';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';

const sheet = readFileSync(
  join(process.cwd(), 'app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx'),
  'utf8',
);

const L3_IDS = [
  'reaction-cognition-full-color-03',
  'reaction-cognition-full-animal-18',
  'reaction-cognition-full-nature-19',
  'reaction-cognition-l3-fruit-exp',
  'reaction-cognition-l3-food-exp',
  'reaction-cognition-l3-vehicle-exp',
  'reaction-cognition-l3-mix-exp',
] as const;

describe('SPOMOVE Guideline Sheet 10-second briefing contract', () => {
  it('keeps the desktop media/guide ratio and stretches both panels to equal height', () => {
    expect(sheet).toContain('minmax(0,1.15fr)');
    expect(sheet).toContain('minmax(380px,0.85fr)');
    expect(sheet).not.toContain('1.55fr');
    expect(sheet).toContain('items-stretch');
    expect(sheet).toContain('flex h-full flex-col');
    expect(sheet).toContain('min-w-0 h-full');
    expect(sheet).not.toContain('mt-auto');
  });

  it('uses 난이도 조절 · 관찰 기준 and drops 선택적 상세', () => {
    expect(sheet).toContain('난이도 조절 · 관찰 기준');
    expect(sheet).not.toContain('선택적 상세');
  });

  it('keeps the media column video-only and moves preserved prep into briefing', () => {
    const mediaBlock = sheet.slice(sheet.indexOf('data-preview-column="media"'), sheet.indexOf('<aside'));
    expect(mediaBlock).not.toContain('CoachCueCard');
    expect(mediaBlock).not.toContain('title="준비"');
    const briefingBlock = sheet.slice(sheet.indexOf('<aside'), sheet.indexOf('data-spm-spomove-action-rail'));
    expect(briefingBlock).toContain('prep={{ matCount, cueSeconds, movementLabel, intervalLine }}');
    expect(sheet).not.toContain('교사 핵심단서(Cue)');
  });

  it('keeps focusTags out of main objective block', () => {
    const objectiveSection = sheet.slice(
      sheet.indexOf('title="활동 목표"'),
      sheet.indexOf('title="활동 방법"'),
    );
    expect(objectiveSection).not.toContain('focusTags');
    expect(sheet).toContain('활동 요소');
  });

  it('splits prep into mat / cue / movement semantics', () => {
    expect(sheet).toContain('PrepMetaRow');
    expect(sheet).toContain('matCount');
    expect(sheet).toContain('cueSeconds');
    expect(sheet).toContain("label: '준비물'");
    expect(sheet).toContain("label: '자극'");
    expect(sheet).toContain("label: '동작'");
  });

  it('keeps primary CTA and startHref contracts', () => {
    expect(sheet).toContain('spm-btn-primary');
    expect(sheet).toContain('publicOfficialPresetSessionHref');
    expect(sheet).toContain('data-spm-spomove-guide-action="start-official"');
    expect(sheet).toContain("contentLoadState === 'error'");
    expect(sheet).toContain('수업 시작');
  });

  it('avoids nested right-panel scrollbar and divide-y wall of sections', () => {
    expect(sheet).not.toContain('lg:overflow-y-auto');
    expect(sheet).not.toContain('divide-y divide-slate-100');
    expect(sheet).toContain('sticky bottom-0');
  });

  it('passes the admin cue recommendation separately from an explicit user override', () => {
    expect(sheet).toContain('contentOverride?.recommendedCueSeconds ?? preset.cueSeconds');
    expect(sheet).toContain("url.searchParams.set('recommendedCueSeconds'");
    expect(sheet).not.toContain('cueSeconds: preset.cueSeconds');
  });

  it('keeps video preview full-frame contain (IMAGE hub crop stays separate)', () => {
    const preview = sheet.slice(
      sheet.indexOf('function SpomoveScreenPreview'),
      sheet.indexOf('function BriefingSection'),
    );
    expect(preview).toContain('SPOMOVE_VIDEO_POSTER_OBJECT_FIT');
    expect(preview).toContain('posterObjectFit={SPOMOVE_VIDEO_POSTER_OBJECT_FIT}');
    expect(preview).toContain('SPOMOVE_VIDEO_FRAME_ASPECT_CLASS');
    expect(preview).not.toContain('aspect-auto');
    expect(preview).not.toContain('lg:h-full');
  });

  it('keeps the simplified briefing surface hooks and shared step grammar', () => {
    expect(sheet).toContain('data-spm-spomove-surface="stage"');
    expect(sheet).toContain('data-spm-spomove-surface="media"');
    expect(sheet).toContain('data-spm-spomove-surface="briefing"');
    expect(sheet).not.toContain('data-spm-spomove-section-rail="true"');
    expect(sheet).toContain('data-spm-spomove-prep-stats="true"');
    expect(sheet).toContain('data-spm-spomove-progress-timeline="true"');
    expect(sheet).toContain('data-spm-spomove-teaching-markers="true"');
    expect(sheet).not.toContain('data-spm-spomove-coach-cue="true"');
    expect(sheet).toContain('data-spm-spomove-details-control="true"');
    expect(sheet).toContain('data-spm-spomove-action-rail="true"');
    expect(sheet).not.toContain('CoachCueCard');
    expect(sheet).toContain('PrepMetaRow');
    expect(sheet).toContain('ProgressTimeline');
    expect(sheet).not.toContain("padStart(2, '0')");
    expect(sheet).toContain('{index + 1}');
  });

  it('uses the existing favorite persistence and leaves only the two workflow actions in the footer', () => {
    expect(sheet).toContain('toggleFavoriteContent(ownerId');
    expect(sheet).toContain("{ type: 'spomove', id: preset.id }");
    expect(sheet).toContain('aria-pressed={favorite}');
    expect(sheet).toContain('headerActions');
    expect(sheet).not.toContain('ExecutionSummary');
    expect(sheet).not.toContain('>\n                닫기\n              </button>');
  });
});

describe('L3 full editorial refine seeds', () => {
  it('uses procedure steps without rule-as-step line', () => {
    for (const seed of listReactionCognitionSeedsByCluster('L3-full')) {
      expect(seed.presetId).toBeTruthy();
      expect(L3_IDS.includes(seed.presetId as (typeof L3_IDS)[number])).toBe(true);
      expect(seed.overwriteGuideFields).toBe(true);
      expect(seed.movementGuide.instruction).not.toContain('칸 위치를 찾는 활동이 아니라');
      expect(seed.movementGuide.instruction).toContain('기준 위치로 돌아와 다음 신호를 기다립니다');
      expect(seed.movementGuide.coachScript).toContain('같은 색 패드');
      expect(seed.movementGuide.objective).toContain('같은 색 SPOMAT 패드');
    }
  });

  it('batch overwrite touches only the 7 L3 ids', () => {
    const untouchedId = 'reaction-cognition-space-direction-01';
    const current: Record<string, SpomovePresetContentOverride> = {
      [untouchedId]: {
        movementGuideStatus: 'published',
        movementGuide: {
          objective: 'keep me',
          instruction: 'keep',
          coachScript: 'keep',
          focusTags: ['simpleReaction'],
          easier: 'e',
          harder: 'h',
          teachingPoints: ['t'],
          movement: { baseMovement: 'handTouch', limbRule: 'free' },
        },
        sourceFingerprint: 'fp',
        sourceFingerprintVersion: 1,
        sourceReviewedAt: '2026-08-24T00:00:00.000Z',
      },
    };
    for (const id of L3_IDS) {
      current[id] = {
        movementGuideStatus: 'published',
        movementGuide: {
          objective: 'old',
          instruction: 'old\nold\n칸 위치를 찾는 활동이 아니라 단일 신호에 반응합니다.',
          coachScript: 'old',
          focusTags: ['simpleReaction'],
          easier: 'e',
          harder: 'h',
          teachingPoints: ['old'],
          movement: { baseMovement: 'footTap', limbRule: 'free' },
        },
        sourceFingerprint: `fp-${id}`,
        sourceFingerprintVersion: 1,
        sourceReviewedAt: '2026-08-24T00:00:00.000Z',
      };
    }
    const beforeUntouched = guideBodyFingerprint(current[untouchedId]);
    const seeds = listReactionCognitionSeedsByCluster('L3-full');
    const result = applySpomoveGuideSeedBatch({
      current,
      seeds,
      status: 'published',
      allowedPresetIds: L3_IDS,
    });
    expect(result.changedPresetIds.sort()).toEqual([...L3_IDS].sort());
    expect(guideBodyFingerprint(result.content[untouchedId])).toBe(beforeUntouched);
    expect(result.content[untouchedId]?.sourceFingerprint).toBe('fp');
    for (const id of L3_IDS) {
      expect(result.content[id]?.sourceFingerprint).toBe(`fp-${id}`);
      expect(result.content[id]?.movementGuide?.instruction).not.toContain('칸 위치를 찾는 활동이 아니라');
    }
  });
});
