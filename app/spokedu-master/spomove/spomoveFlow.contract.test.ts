import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const session = read('app/spokedu-master/spomove/session/page.tsx');
const guidelineSheet = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');
const recordDraft = read('app/spokedu-master/spomove/session/spomoveRecordDraft.ts');

describe('SPOMOVE pilot flow contract', () => {
  it('shows card tags and guideline actions on hub cards', () => {
    expect(hub).toContain('sortSpomovePresetsByDisplayTitle');
    expect(hub).toContain('참고 영상');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(hub).not.toContain('빠른 시작');
    expect(hub).toContain('최근 SPOMOVE');
  });

  it('keeps normal program cards separate from recent rerun actions', () => {
    expect(hub).toContain('data-spm-spomove-card-action="preview"');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(hub).toContain('data-spm-spomove-recent-action="rerun"');

    const cardInfoBlock = hub.slice(
      hub.indexOf('function CardInfo'),
      hub.indexOf('function PresetCard'),
    );
    expect(cardInfoBlock).toContain('data-spm-spomove-card-action="start"');
    expect(cardInfoBlock).not.toContain('data-spm-spomove-recent-action="rerun"');
    expect(cardInfoBlock).not.toContain('다시 실행');
  });

  it('shows recent SPOMOVE re-entry without exposing other owners', () => {
    expect(hub).toContain('최근 SPOMOVE');
    expect(hub).toContain('최근 사용한 활동');
    expect(hub).toContain('활동 선택');
    expect(hub).toContain('아직 실행한 SPOMOVE 활동이 없습니다.');
    expect(hub).toContain('activity.ownerId === ownerId');
    expect(hub).toContain("activity.action === 'spomove_started'");
    expect(hub).toContain('slice(0, 3)');
  });

  it('loads guideline videos in the guideline sheet without pad layout clutter', () => {
    expect(hub).toContain('SPOMOVE_GUIDE_VIDEO_PACK_ID');
    expect(hub).toContain('SharedSpomoveGuidelineSheet');
    expect(guidelineSheet).not.toContain('SpomovePadLayoutView');
    expect(guidelineSheet).toContain('SpomoveGuideVideo');
    expect(guidelineSheet).toContain('참고 영상');
  });

  it('separates start (entry=start) from settings and keeps Public without autostart', () => {
    expect(hub).toContain('data-spm-spomove-start-mode="start"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).toContain('data-spm-spomove-start-mode="dive"');
    expect(hub).not.toContain('빠른 시작');
    expect(hub).toContain('설정');
    expect(hub).toContain("openWithPick(selectedPick, 'start')");
    expect(hub).toContain("openWithPick(selectedPick, 'settings')");
    expect(hub).not.toContain('writeFamilyMovement');
    expect(hub).toContain('publicOfficialPresetSessionHref');
    expect(session).toContain('activationBlocked');
    expect(session).toContain('전체화면과 소리 켜기');
    expect(session).not.toContain('MovementHud');
    const diveLinkBlock = hub.slice(
      hub.indexOf('data-spm-spomove-start-mode="dive"') - 80,
      hub.indexOf('data-spm-spomove-start-mode="dive"') + 120,
    );
    expect(diveLinkBlock).toContain('startHref');
    expect(hub).toContain('href={startHref}');
    expect(guidelineSheet).not.toContain('autostart: true');
    expect(guidelineSheet).toContain('공식 추천으로 시작');
    expect(guidelineSheet).toContain('data-spm-spomove-guide-action="start-official"');
    expect(session).toContain('resolveLegacyAutostart');
    expect(session).toContain('resolveSessionCueSeconds');
    expect(session).toContain('parseCueSecondsQuery');
  });

  it('exposes cue speed on StartBriefing', () => {
    const startBriefing = read('app/spokedu-master/spomove/session/StartBriefing.tsx');
    expect(hub).toContain('publicOfficialPresetSessionHref');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(startBriefing).toContain('supportsCueSpeedOverride');
    expect(startBriefing).toContain('SPOMOVE_CUE_SPEED_OPTIONS');
    expect(startBriefing).toContain('자극 속도');
    expect(startBriefing).toContain('이 설정으로 시작');
  });

  it('reproduces recent same-settings or downgrades the label', () => {
    expect(hub).toContain('canReproduceSpomoveSameSettings');
    expect(hub).toContain('같은 설정으로 시작');
    expect(hub).toContain('이 활동으로 시작');
    expect(hub).toContain('data-spm-spomove-recent-reproduce');
    expect(session).toContain('difficultyValue: difficultyKind ? difficultyValue : undefined');
  });

  it('keeps Start/Settings briefings without nested details modal', () => {
    expect(session).toContain('StartBriefing');
    expect(session).toContain('SettingsBriefing');
    expect(session).not.toContain('자세히 보기');
    expect(session).not.toContain('OfficialEngineBriefing');
  });

  it('prevents duplicate session starts and records only real starts', () => {
    expect(session).toContain('startLockedRef');
    expect(session).toContain("setState('running')");
    expect(session).toContain('recordRecentProgramActivity({');
    expect(session).toContain("action: 'spomove_started'");
  });

  it('separates completed and early-ended sessions', () => {
    expect(session).toContain("type SessionState = 'idle' | 'movementIntro' | 'running' | 'done' | 'ended'");
    expect(session).toContain("finishSession('ended')");
    expect(session).toContain("finishSession('done', payload)");
    expect(session).toContain('TrainingResultScreen');
    expect(session).toContain('중도 종료');
    expect(session).toContain('완료');
  });

  it('connects lesson-context completion to class records and keeps standalone sessions separate', () => {
    expect(session).toContain('recordProgramHref');
    expect(session).toContain('buildSpomoveRecordDraft');
    expect(session).toContain('buildSpomoveRecordHref');
    expect(session).not.toContain('/spokedu-master/class-record?program=${officialPreset.id}');
    expect(session).toContain('/spokedu-master/activity');
    expect(session).toContain('같은 프로그램 다시 실행');
    expect(session).toContain('다른 프로그램');
  });

  it('keeps SPOMOVE class-record drafts as general estimates, not sensor-precise metrics', () => {
    expect(recordDraft).toContain('실제 움직인 시간: 약');
    expect(recordDraft).toContain('예상 소모 열량');
    expect(recordDraft).toContain('센서 기반 정밀 측정값이 아니라 수업 기록용 일반 추정치');
    expect(recordDraft).toContain('spomoveDraft');
  });

  it('keeps user-facing hub copy in valid UTF-8 Korean', () => {
    expect(hub).not.toMatch(/[\u0080-\u009f]/);
    expect(hub).not.toContain('\ufffd');
    expect(hub).not.toMatch(/[怨諛鍮異醫珥]/);
  });
});
