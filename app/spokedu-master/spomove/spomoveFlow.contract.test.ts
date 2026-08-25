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
const startBriefing = read('app/spokedu-master/spomove/session/StartBriefing.tsx');
const settingsBriefing = read('app/spokedu-master/spomove/session/SettingsBriefing.tsx');
const setupShell = read('app/spokedu-master/spomove/session/SessionSetupShell.tsx');
const cueSpeed = read('app/spokedu-master/spomove/spomoveCueSpeed.ts');
const padLayoutView = read('app/spokedu-master/spomove/SpomovePadLayoutView.tsx');
const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

describe('SPOMOVE pilot flow contract', () => {
  it('shows card tags and start/settings actions on hub cards', () => {
    expect(hub).toContain('sortSpomovePresetsByDisplayTitle');
    expect(hub).toContain('활동 준비 열기');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).not.toContain('가이드 보기');
    expect(hub).not.toContain('바로 실행');
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

  it('loads launch-confirm preview without pad layout clutter', () => {
    expect(hub).toContain('SPOMOVE_GUIDE_VIDEO_PACK_ID');
    expect(hub).toContain('SPOMOVE_CONTENT_PACK_ID');
    expect(hub).toContain('normalizeSpomoveContentMap');
    expect(hub).toContain("useState<SpomoveContentLoadState>('loading')");
    expect(hub).toContain("setContentLoadState('error')");
    expect(hub).toContain('contentLoadState={contentLoadState}');
    expect(dashboard).toContain("useState<SpomoveContentLoadState>('loading')");
    expect(dashboard).toContain("setSpomoveContentLoadState('error')");
    expect(dashboard).toContain('contentLoadState={spomoveContentLoadState}');
    expect(hub).toContain('SharedSpomoveGuidelineSheet');
    expect(hub).toContain('parseSpomoveHubView');
    expect(hub).toContain('hubView={hubView}');
    expect(hub).toContain('showProgramGroupSections');
    expect(hub).toContain('buildSpomoveProgramGroupSections');
    expect(hub).toContain('sortSpomovePresetsByCatalogOrder');
    expect(hub).not.toContain('contentOverride?.sortOrder ?? preset.sortOrder');
    expect(hub).not.toContain('showAxisSections');
    expect(hub).not.toContain('SPOMOVE_AXIS_ORDER');
    expect(guidelineSheet).not.toContain('SpomovePadLayoutView');
    expect(guidelineSheet).toContain('SpomoveScreenPreview');
    expect(guidelineSheet).toContain('size="preview"');
    expect(guidelineSheet).toContain('data-preview-column="media"');
    expect(guidelineSheet).toContain('contentOverride');
    expect(guidelineSheet).toContain('buildSpomoveGuideDisplayModel');
    expect(guidelineSheet).toContain('활동 목표');
    expect(guidelineSheet).toContain('준비');
    expect(guidelineSheet).toContain('진행');
    expect(guidelineSheet).toContain('지도 포인트');
    expect(guidelineSheet).toContain('난이도 조절 · 관찰 기준');
    expect(guidelineSheet).not.toContain('선택적 상세');
    expect(guidelineSheet).toContain('교사 Cue');
    expect(guidelineSheet).not.toContain('아이에게 하는 말');
    expect(guidelineSheet).toContain('min-[1024px]:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]');
    expect(guidelineSheet).not.toContain('1.55fr');
    expect(guidelineSheet).toContain('items-start');
    expect(guidelineSheet).not.toContain('lg:overflow-y-auto');
    expect(guidelineSheet).toContain('sticky bottom-0');
    expect(guidelineSheet).toContain('spm-btn-primary');
    expect(guidelineSheet).toContain('활동 예시 영상');
    expect(guidelineSheet).toContain('실제 운영 예시 영상입니다.');
    expect(guidelineSheet).toContain('활동 요소');
    expect(guidelineSheet).toContain("contentLoadState === 'loading'");
    expect(guidelineSheet).toContain("contentLoadState === 'error'");
    expect(guidelineSheet).toContain('getSpomovePresetDisplayModel(preset, contentOverride)');
    expect(guidelineSheet).not.toContain('세부 안내 예정');
    expect(guidelineSheet).not.toContain('등록된 활동 목표 정보가 없습니다.');
    expect(guidelineSheet).not.toContain('등록된 진행 안내가 없습니다.');
    expect(guidelineSheet).not.toContain('등록된 지도 포인트가 없습니다.');
    expect(guidelineSheet).toContain('기본 실행 정보만 제공됩니다.');
    expect(guidelineSheet).toContain('resolveSpomoveBriefingReadiness');
    expect(guidelineSheet).not.toContain('PublishedGuideContent');
    expect(guidelineSheet).not.toContain('GuideModeNotice');
    expect(guidelineSheet).not.toContain('PreparingGuideContent');
    expect(guidelineSheet).not.toContain('핵심 키워드');
    expect(guidelineSheet).not.toContain('매트 바로 밖');
    expect(guidelineSheet).not.toContain('소집단');
    expect(guidelineSheet).not.toContain('{activityMethod.title}');
    expect(guidelineSheet).toContain('수업 시작');
    expect(guidelineSheet).not.toContain('바로 시작');
    expect(guidelineSheet).not.toContain('바로 실행');
    expect(guidelineSheet).not.toContain('안내 더보기');
    expect(guidelineSheet).not.toContain('상세보기');
    expect(guidelineSheet).not.toContain('설정 변경');
  });

  it('keeps Public Hub free of editorial production-status filters and badges', () => {
    expect(hub).not.toContain('세부 안내 예정');
    expect(hub).not.toContain('공식 가이드');
    expect(hub).not.toContain('기본 안내');
    expect(hub).not.toContain('가이드 현황');
    expect(hub).not.toContain('GUIDE_STATUS_FILTERS');
    expect(hub).not.toContain('guideStatusFilter');
    expect(hub).not.toContain('getGuideStatusBadge');
    expect(hub).not.toContain('resolveGuideStatusFilter');
    expect(dashboard).not.toContain('세부 안내 예정');
    expect(dashboard).not.toContain('가이드 현황');
  });

  it('separates start (entry=start) from settings and keeps Public without autostart', () => {
    expect(hub).toContain('data-spm-spomove-start-mode="guide"');
    expect(hub).toContain('data-spm-spomove-start-mode="settings"');
    expect(hub).not.toContain('data-spm-spomove-start-mode="dive"');
    expect(hub).not.toContain('빠른 시작');
    expect(hub).toContain('시작 설정');
    expect(hub).toContain('hrefForSettings');
    expect(hub).not.toContain("hrefForOfficial('start')");
    expect(hub).not.toContain('writeFamilyMovement');
    expect(hub).toContain('publicOfficialPresetSessionHref');
    expect(session).toContain('activationBlocked');
    expect(session).toContain('전체화면과 소리 켜기');
    expect(session).not.toContain('MovementHud');
    expect(guidelineSheet).not.toContain('autostart: true');
    expect(guidelineSheet).toContain('수업 시작');
    expect(guidelineSheet).not.toContain('바로 시작');
    expect(guidelineSheet).not.toContain('바로 실행');
    expect(guidelineSheet).toContain('data-spm-spomove-guide-action="start-official"');
    expect(guidelineSheet).toContain('data-spm-spomove-launch-confirm');
    expect(guidelineSheet).not.toContain('공식 추천으로 시작');
    expect(session).toContain('resolveLegacyAutostart');
    expect(session).toContain('resolveSessionCueSeconds');
    expect(session).toContain('parseCueSecondsQuery');
    expect(session).toContain('leaveSession');
    expect(session).toContain('getSpomoveHubReturnHref');
    expect(session).toContain('router.back()');
  });

  it('exposes cue speed on StartBriefing', () => {
    expect(hub).toContain('publicOfficialPresetSessionHref');
    expect(hub).toContain('data-spm-spomove-card-action="start"');
    expect(startBriefing).toContain('supportsCueSpeedOverride');
    expect(startBriefing).toContain('SPOMOVE_CUE_SPEED_OPTIONS');
    expect(startBriefing).toContain('자극 속도');
    // Session StartBriefing = 확인 후 엔진 진입. Sheet의「이 설정으로 시작」과 구분.
    expect(startBriefing).toContain('수업 시작');
    expect(startBriefing).not.toContain('바로 시작');
    expect(startBriefing).not.toContain('바로 실행');
  });

  it('uses mat layout briefing and 1-6 second recommended speed instead of current-setting movement copy', () => {
    expect(startBriefing).toContain('SpomovePadLayoutView');
    expect(settingsBriefing).toContain('SpomovePadLayoutView');
    expect(startBriefing).not.toContain('현재 설정');
    expect(settingsBriefing).not.toContain('현재 설정');
    expect(setupShell).not.toContain('launchModeLabel');
    expect(setupShell).not.toContain('큰 화면');
    expect(cueSpeed).toContain('SPOMOVE_CUE_SPEED_OPTIONS = [1, 2, 3, 4, 5, 6]');
    expect(cueSpeed).toContain("if (value >= 5) return '쉬움'");
    expect(cueSpeed).toContain("if (value >= 3) return '보통'");
    expect(cueSpeed).toContain("return '어려움'");
    expect(startBriefing).not.toContain('난이도 {cueDifficulty}');
    expect(settingsBriefing).not.toContain('난이도 {cueDifficulty}');
    expect(startBriefing).toContain('sec === 3');
    expect(settingsBriefing).toContain('sec === 3');
    expect(startBriefing).toContain('추천');
    expect(settingsBriefing).toContain('추천');
    expect(padLayoutView).toContain('정사각형: 빨강 · 노랑 · 초록 · 파랑');
    expect(padLayoutView).toContain('다이아몬드: 빨강(위) · 노랑(왼) · 초록(오) · 파랑(아래)');
    expect(padLayoutView).toContain('aspect-square');
    expect(settingsBriefing).toContain('meta={intervalLine ? null : prepLine}');
    expect(settingsBriefing).not.toContain('text-white/70">{prepLine}');
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
    expect(session).toContain('reopenStartConfirmation');
    expect(session).not.toContain("event.code === 'Space' && state === 'done'");
  });

  it('prevents duplicate session starts and records only real starts', () => {
    expect(session).toContain('startLockedRef');
    expect(session).toContain("setState('running')");
    expect(session).toContain('recordRecentProgramActivity({');
    expect(session).toContain("action: 'spomove_started'");
  });

  it('separates completed and early-ended sessions', () => {
    expect(session).toContain("type SessionState = 'idle' | 'running' | 'done' | 'ended'");
    expect(session).not.toContain('오늘의 동작');
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
    expect(session).toContain('같은 설정으로 시작');
    expect(session).toContain('reopenStartConfirmation');
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
