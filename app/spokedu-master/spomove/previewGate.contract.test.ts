import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import { getActivityFamily } from './movements/activityFamilies';
import { getMovementProfile } from './movements/movementProfiles';
import { getPresetMovementSummary } from './movements/presetMovementSummary';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/**
 * 제한 Preview 진입 전 최소 4게이트 — 구조는 유지, 화면 노출은 기존 SPOMOVE가 주인공.
 */
describe('SPOMOVE preview gate (최소 4가지)', () => {
  const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
  const session = read('app/spokedu-master/spomove/session/page.tsx');
  const hrefSource = read('app/spokedu-master/spomove/officialSpomovePresets.ts');

  it('1) running 중 MovementHud 없음 — Engine만', () => {
    expect(session).not.toContain('MovementHud');
    expect(session).not.toContain('hud_collapsed');
    expect(session).toContain("state === 'running'");
    expect(session).toContain('<EngineRouter');
    expect(session).toContain("state === 'movementIntro'");
  });

  it('2) 카드는 빠른 시작 / 설정 두 버튼만 (움직임 레이어)', () => {
    expect(hub).toContain('data-spm-spomove-start-mode="quick"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).toContain('빠른 시작');
    expect(hub).toContain('설정');
    expect(hub).not.toContain('동작 바꾸기');
    expect(hub).not.toContain('설정하고 시작');
    expect(hub).not.toContain('변형 ');
    expect(hub).not.toContain('점프 없이');
  });

  it('3) MQ2~4는 bodyCueBuiltIn — 일반 movement summary 없음', () => {
    const mqBody = OFFICIAL_SPOMOVE_LIBRARY.filter((p) =>
      ['reaction-cognition-mq2-33', 'reaction-cognition-mq3-34', 'reaction-cognition-mq4-35'].includes(
        p.id,
      ),
    );
    expect(mqBody.length).toBeGreaterThanOrEqual(3);
    for (const preset of mqBody) {
      expect(preset.activityFamilyId).toBe('reaction-variant-body-cue');
      expect(preset.movementProfileId).toBe('bodyCueBuiltIn');
      expect(getMovementProfile(preset.movementProfileId!).selectionMode).toBe('disabled');
      expect(getPresetMovementSummary(preset)).toBeNull();
      expect(getActivityFamily(preset.activityFamilyId!)?.movementProfileId).toBe('bodyCueBuiltIn');
    }
  });

  it('4) cue 조건부 · difficulty 초기 URL · FS/Audio 폴백', () => {
    expect(hrefSource).toContain("if (options?.cueSeconds != null)");
    expect(hrefSource).not.toContain('cueSeconds: String(options?.cueSeconds ?? preset.cueSeconds)');
    expect(session).toContain('urlDifficulty');
    expect(session).toContain('difficultyReady');
    expect(session).toContain('activationBlocked');
    expect(session).toContain('전체화면과 소리 켜기');
    expect(session).toContain('unlockActivation');
  });
});
