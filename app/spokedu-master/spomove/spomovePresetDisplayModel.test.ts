import { describe, expect, it } from 'vitest';
import { OFFICIAL_SPOMOVE_LIBRARY } from './officialSpomovePresets';
import {
  buildSpomoveGuideDisplayModel,
  buildSpomoveCardTags,
  buildSpomoveProgramGroupSections,
  getSpomovePresetDisplayModel,
  sortSpomovePresetsByCatalogOrder,
  sortSpomovePresetsByDisplayTitle,
} from './spomovePresetDisplayModel';

describe('spomove preset display model', () => {
  it('uses unique program+displayTitle pairs and runtime-aware duration labels without BGM copy', () => {
    const keys = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => {
      const display = getSpomovePresetDisplayModel(preset);
      return `${display.programLabel}::${display.displayTitle}`;
    });
    expect(new Set(keys).size).toBe(OFFICIAL_SPOMOVE_LIBRARY.length);

    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(visual).toBeTruthy();
    expect(getSpomovePresetDisplayModel(visual!).durationLabel).toBe('5초 · 20회');
    expect(visual!.programGroup).toBe('simon');

    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'dive-random');
    expect(dive).toBeTruthy();
    expect(getSpomovePresetDisplayModel(dive!).durationLabel).toMatch(/^세션 \d+초/);

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const settingTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'setting');
      const bodyFunctionTag = buildSpomoveCardTags(preset).find((tag) => tag.key === 'bodyFunction');
      expect(settingTag?.value).not.toMatch(/BGM/i);
      expect((bodyFunctionTag?.value.split(' · ') ?? []).filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });

  it('sortSpomovePresetsByCatalogOrder keeps official catalog order', () => {
    const sample = OFFICIAL_SPOMOVE_LIBRARY.slice(0, 12);
    const shuffled = [...sample].reverse();
    const sorted = sortSpomovePresetsByCatalogOrder(shuffled);
    const orders = sorted.map((preset) => preset.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('buildSpomoveProgramGroupSections groups favorites by activity category', () => {
    const reaction = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'reaction-cognition');
    const visual = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'visual-reaction');
    const dive = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.programGroup === 'dive');
    expect(reaction && visual && dive).toBeTruthy();

    const sections = buildSpomoveProgramGroupSections([dive!, reaction!, visual!, reaction!]);
    expect(sections.map((section) => section.programGroup)).toEqual([
      'reaction-cognition',
      'visual-reaction',
      'dive',
    ]);
    expect(sections[0]?.presets.every((preset) => preset.programGroup === 'reaction-cognition')).toBe(true);
    expect(sections[1]?.presets.every((preset) => preset.programGroup === 'visual-reaction')).toBe(true);
  });

  it('sortSpomovePresetsByDisplayTitle sorts by Korean display title', () => {
    const sample = OFFICIAL_SPOMOVE_LIBRARY.slice(0, 12);
    const shuffled = [...sample].reverse();
    const sorted = sortSpomovePresetsByDisplayTitle(shuffled);
    const titles = sorted.map((preset) => getSpomovePresetDisplayModel(preset).displayTitle);
    expect([...titles].sort((a, b) => a.localeCompare(b, 'ko'))).toEqual(titles);
  });

  it('displayTitle omits programLabel prefix already shown as the card tag', () => {
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const display = getSpomovePresetDisplayModel(preset);
      const compactProgram = display.programLabel.replace(/\s+/g, '');
      expect(display.displayTitle.startsWith(display.programLabel)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} ·`)).toBe(false);
      expect(display.displayTitle.startsWith(`${compactProgram} `)).toBe(false);
    }

    const rc = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'reaction-cognition-space-direction-01');
    expect(getSpomovePresetDisplayModel(rc!).displayTitle).toBe('공간 방향');

    const magic = OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === 'visual-reaction-blackout-37');
    expect(getSpomovePresetDisplayModel(magic!).displayTitle).toBe('매직 아이');

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      expect(getSpomovePresetDisplayModel(preset).displayTitle).not.toMatch(/^\d+번\b/);
      expect(getSpomovePresetDisplayModel(preset).displayTitle).not.toMatch(/\d+번\s*[·:]/);
    }
  });

  it('buildSpomoveGuideDisplayModel uses master content movement guide as the display source', () => {
    const preset = OFFICIAL_SPOMOVE_LIBRARY.find((item) => item.id === 'reaction-cognition-space-direction-01');
    expect(preset).toBeTruthy();

    const model = buildSpomoveGuideDisplayModel({
      preset: preset!,
      contentOverride: {
        movementGuide: {
          movement: { baseMovement: 'twoLegJump', limbRule: 'free' },
          instruction: '화면 색상을 확인한 뒤 같은 색상 매트로 양발 점프합니다.',
          teacherCue: '색상을 먼저 보고, 두 발로 함께 이동하세요.',
          focusTags: ['choiceReaction', 'lowerBodyCoordination', 'landingControl'],
          easier: '점프 대신 한 발씩 이동하고 자극 시간을 늘립니다.',
          harder: '자극 시간을 줄이고 같은 색상이 연속되면 제자리 점프를 추가합니다.',
          remix: {
            movement: '발 터치 또는 런지로 바꾸어 진행할 수 있습니다.',
          },
        },
      },
    });

    expect(model.recommendedMovementLabel).toBe('양발 홉');
    expect(model.instruction).toBe('화면 색상을 확인한 뒤 같은 색상 매트로 양발 점프합니다.');
    expect(model.coachScript).toBe('색상을 먼저 보고, 두 발로 함께 이동하세요.');
    expect(model.focusTags).toEqual(['선택반응', '하체 협응', '착지 조절']);
    expect(model.movementVariation).toBe('발 터치 또는 런지로 바꾸어 진행할 수 있습니다.');
    expect(model.contentReadiness).toBe('home-ready');
  });
});
