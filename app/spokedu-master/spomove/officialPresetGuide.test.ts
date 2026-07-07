import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OFFICIAL_SPOMOVE_LIBRARY, OFFICIAL_SPOMOVE_LIBRARY_SIZE } from './officialSpomovePresets';
import {
  SPOMOVE_BODY_FUNCTION_LABELS,
  SPOMOVE_KEY_ACTION_LABELS,
  SPOMOVE_RESPONSE_TYPE_LABELS,
  SPOMOVE_TARGET_GROUP_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  getOfficialSpomovePresetGuide,
} from './officialSpomovePresetGuides';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('official SPOMOVE preset guide contract', () => {
  it('keeps official preset count expanded from the 46-item core library', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(OFFICIAL_SPOMOVE_LIBRARY_SIZE);

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const guide = getOfficialSpomovePresetGuide(preset);
      expect(guide.targetGroups.length).toBeGreaterThan(0);
      expect(guide.targetGroups.every((target) => target in SPOMOVE_TARGET_GROUP_LABELS)).toBe(true);
      expect(guide.thinkingLevel in SPOMOVE_THINKING_LEVEL_LABELS).toBe(true);
      expect(guide.responseType in SPOMOVE_RESPONSE_TYPE_LABELS).toBe(true);
      expect(guide.keyActions.length).toBeGreaterThanOrEqual(1);
      expect(guide.keyActions.length).toBeLessThanOrEqual(3);
      expect(guide.keyActions.every((action) => action in SPOMOVE_KEY_ACTION_LABELS)).toBe(true);
      expect(guide.bodyFunctions.length).toBeGreaterThanOrEqual(1);
      expect(guide.bodyFunctions.length).toBeLessThanOrEqual(3);
      expect(guide.bodyFunctions.every((fn) => fn in SPOMOVE_BODY_FUNCTION_LABELS)).toBe(true);
    }
  });

  it('does not mutate existing id, sortOrder, or engine contracts while resolving guide data', () => {
    const before = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => ({
      id: preset.id,
      sortOrder: preset.sortOrder,
      engine: JSON.stringify(preset.engine),
    }));

    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      getOfficialSpomovePresetGuide(preset);
    }

    const after = OFFICIAL_SPOMOVE_LIBRARY.map((preset) => ({
      id: preset.id,
      sortOrder: preset.sortOrder,
      engine: JSON.stringify(preset.engine),
    }));
    expect(after).toEqual(before);
  });

  it('groups bonus one-minute preset inside Dive on the user screen', () => {
    const diveLike = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) =>
      preset.programGroup === 'dive' || preset.programGroup === 'bonus'
    );
    expect(diveLike).toHaveLength(5);

    const source = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    const groupTabsSource = source.match(/const PROGRAM_GROUP_TABS[\s\S]*?\];/)?.[0] ?? '';
    expect(source).toContain("Exclude<OfficialSpomoveProgramGroup, 'bonus'>");
    expect(groupTabsSource).not.toContain("'bonus'");
    expect(source).toContain("preset.programGroup === 'dive' || preset.programGroup === 'bonus'");
  });

  it('renders thumbnail fallback, card display metadata, and briefing guide labels', () => {
    const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    const session = read('app/spokedu-master/spomove/session/page.tsx');

    expect(hub).toContain('SPOMOVE_THUMBNAIL_PACK_ID');
    expect(hub).toContain('SPOMOVE_GUIDE_VIDEO_PACK_ID');
    expect(hub).toContain('thumbnailUrl');
    expect(hub).toContain('onImageError={() => setImageFailed(true)}');
    expect(hub).toContain('onError={onImageError}');
    expect(hub).toContain('getSpomovePresetDisplayModel');
    expect(hub).toContain('buildSpomoveCardTags');
    expect(session).toContain('추천 대상');
    expect(session).toContain('생각 난이도');
    expect(session).toContain('주요 동작');
  });
});
