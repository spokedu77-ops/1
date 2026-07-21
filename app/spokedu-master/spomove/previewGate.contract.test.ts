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
 * Phase 0 — 즉시 실행·과밀 설정·양산형 설명 손상 중단.
 */
describe('SPOMOVE preview gate (Phase 0)', () => {
  const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
  const session = read('app/spokedu-master/spomove/session/page.tsx');
  const hrefSource = read('app/spokedu-master/spomove/officialSpomovePresets.ts');
  const contract = read('app/spokedu-master/spomove/SPOMOVE_PRODUCT_CONTRACT.md');
  const configurator = read('app/spokedu-master/spomove/movements/MovementConfigurator.tsx');

  it('1) running 중 MovementHud 없음 — Engine만', () => {
    expect(session).not.toContain('MovementHud');
    expect(session).not.toContain('hud_collapsed');
    expect(session).toContain("state === 'running'");
    expect(session).toContain('<EngineRouter');
    expect(session).toContain("state === 'movementIntro'");
  });

  it('2) Hub CTA는 시작/설정 · Public autostart 없음 · description 미노출', () => {
    expect(hub).toContain('data-spm-spomove-start-mode="start"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).not.toContain('빠른 시작');
    expect(hub).toContain('설정');
    expect(hub).toContain("openWithPick(selectedPick, 'start')");
    expect(hub).toContain("openWithPick(selectedPick, 'settings')");
    expect(hub).toContain('publicOfficialPresetSessionHref');
    expect(hub).not.toContain('writeFamilyMovement');
    expect(hub).not.toContain('{preset.description}');
    expect(hub).toContain('같은 설정으로 시작');
    expect(hub).not.toContain('같은 설정 실행');
  });

  it('2b) Session entry·legacyAutostart·Briefing 분리', () => {
    const settingsBriefing = read('app/spokedu-master/spomove/session/SettingsBriefing.tsx');
    expect(session).toContain('parseSessionEntryMode');
    expect(session).toContain('resolveLegacyAutostart');
    expect(session).toContain('entryParam:');
    expect(session).toContain('StartBriefing');
    expect(session).toContain('SettingsBriefing');
    expect(session).toContain('beginConfiguredSession');
    expect(session).toContain('reopenStartConfirmation');
    expect(session).toContain('isInteractiveKeyTarget');
    expect(session).toContain("event.code === 'Space' && state === 'idle' && showBriefing");
    expect(session).not.toContain("event.code === 'Space' && state === 'done'");
    expect(settingsBriefing).toContain('variant="compact"');
  });

  it('2c) Hub 가이드 명시 · 잘못된 헤더 문구 없음', () => {
    expect(hub).toContain('가이드 보기');
    expect(hub).toContain('data-spm-spomove-card-action="guide"');
    expect(hub).not.toContain('사전 설정된 공식 조건으로 실행');
  });

  it('2d) Compact side-rule 안내', () => {
    expect(configurator).toContain('compactMovementInstruction');
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
    expect(hrefSource).toContain('publicOfficialPresetSessionHref');
    expect(session).toContain('urlDifficulty');
    expect(session).toContain('difficultyReady');
    expect(session).toContain('activationBlocked');
    expect(session).toContain('전체화면과 소리 켜기');
    expect(session).toContain('unlockActivation');
  });

  it('5) Product Contract Phase 0·Catalog 정의', () => {
    expect(contract).toContain('Phase 0');
    expect(contract).toContain('Catalog Family');
    expect(contract).toContain('Activity Family');
    expect(contract).toContain('entry=settings');
    expect(contract).not.toContain('Sprint 1 = Movement Configurator');
  });

  it('6) Configurator compact — 대형 도식 없음', () => {
    expect(configurator).toContain("variant === 'compact'");
    expect(configurator).not.toContain('SpomatMovementDiagram');
    expect(configurator).not.toContain('MovementInstructionPanel');
  });
});
