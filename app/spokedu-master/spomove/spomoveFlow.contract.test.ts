import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const session = read('app/spokedu-master/spomove/session/page.tsx');

describe('SPOMOVE pilot flow contract', () => {
  it('shows card tags and guideline actions on hub cards', () => {
    expect(hub).toContain('buildSpomoveCardTags');
    expect(hub).toContain('가이드라인');
    expect(hub).toContain('큰 화면 실행');
    expect(hub).toContain('이 기기에서 실행');
    expect(hub).not.toContain('최근 실행');
    expect(hub).not.toContain('최근 실행한 활동');
  });

  it('keeps normal program cards separate from recent rerun actions', () => {
    expect(hub).toContain('data-spm-spomove-card-action="preview"');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(hub).toContain('data-spm-spomove-card-action="start-mobile"');
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
    expect(hub).toContain('최근 SPOMOVE 활동');
    expect(hub).toContain('최근 활동');
    expect(hub).toContain('활동 선택');
    expect(hub).toContain('아직 실행한 SPOMOVE 활동이 없습니다.');
    expect(hub).toContain('activity.ownerId === ownerId');
    expect(hub).toContain("activity.action === 'spomove_started'");
    expect(hub).toContain('slice(0, 3)');
  });

  it('loads guideline videos and renders pad layout in the guideline sheet', () => {
    expect(hub).toContain('SPOMOVE_GUIDE_VIDEO_PACK_ID');
    expect(hub).toContain('SpomoveGuidelineSheet');
    expect(hub).toContain('SpomovePadLayoutView');
    expect(hub).toContain('SpomoveGuideVideo');
  });

  it('starts sessions immediately from hub cards and guideline sheet', () => {
    expect(hub).toContain("officialPresetSessionHref(preset, { autostart: true })");
    expect(hub).toContain("mode: 'mobile'");
    expect(session).toContain("searchParams.get('autostart') === '1'");
  });

  it('shows a preparation checklist and only existing runtime settings', () => {
    expect(session).toContain('시작 전 확인');
    expect(session).toContain('반복 횟수');
    expect(session).toContain('자극 속도');
    expect(session).toContain('음향');
    expect(session).toContain('전체 화면');
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
    expect(session).toContain("finishSession('done')");
    expect(session).toContain('TrainingResultScreen');
    expect(session).toContain('중도 종료');
    expect(session).toContain('완료');
  });

  it('connects lesson-context completion to class records and keeps standalone sessions separate', () => {
    expect(session).toContain('recordProgramHref');
    expect(session).not.toContain('/spokedu-master/class-record?program=${officialPreset.id}');
    expect(session).toContain('/spokedu-master/activity');
    expect(session).toContain('같은 프로그램 다시 실행');
    expect(session).toContain('다른 프로그램 선택');
  });

  it('keeps user-facing hub copy in valid UTF-8 Korean', () => {
    expect(hub).not.toMatch(/[\u0080-\u009f]/);
    expect(hub).not.toContain('\ufffd');
    expect(hub).not.toMatch(/[怨諛鍮異醫珥]/);
  });
});
