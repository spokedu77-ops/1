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
    expect(hub).toContain('buildSpomoveCardTags');
    expect(hub).toContain('참고 영상');
    expect(hub).toContain('sortSpomovePresetsByDisplayTitle');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(hub).toContain('실행');
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

  it('routes hub/guideline starts through briefing (no autostart) and exposes cue speed controls', () => {
    expect(hub).toContain('officialPresetSessionHref(preset)');
    expect(hub).not.toContain('autostart: true');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(guidelineSheet).not.toContain('autostart: true');
    expect(session).toContain('supportsCueSpeedOverride');
    expect(session).toContain('SPOMOVE_CUE_SPEED_OPTIONS');
    expect(session).toContain('자극 속도');
    expect(session).toContain('속도만 고르고 시작하세요');
    expect(session).toContain('recommendedCueSecondsForPreset');
    expect(session).toContain('이 활동 추천');
    expect(session).toContain("searchParams.get('autostart') === '1'");
  });

  it('keeps briefing speed-first with a primary start CTA and collapsible details', () => {
    expect(session).toContain('속도만 고르고 시작하세요');
    expect(session).toContain('초로 시작');
    expect(session).toContain('자세히 보기');
    expect(session).toContain('자극 속도');
    expect(session).toContain('getCueSpeedGuide');
    expect(session).not.toContain('시작 전 확인');
  });

  it('prevents duplicate session starts and records only real starts', () => {
    expect(session).toContain('startLockedRef');
    expect(session).toContain("setState('running')");
    expect(session).toContain('recordRecentProgramActivity({');
    expect(session).toContain("action: 'spomove_started'");
  });

  it('separates completed and early-ended sessions', () => {
    expect(session).toContain("type SessionState = 'idle' | 'running' | 'done' | 'ended'");
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
