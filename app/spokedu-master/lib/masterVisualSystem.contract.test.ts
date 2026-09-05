import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actions = readFileSync('app/spokedu-master/lib/masterActionGrammar.ts', 'utf8');
const ui = readFileSync('app/spokedu-master/lib/masterUiClasses.ts', 'utf8');

describe('MASTER action/token freeze (not Art Direction PASS)', () => {
  it('keeps primary, secondary, quiet, and destructive actions semantically distinct', () => {
    expect(actions).toContain('SPM_JOURNEY_PRIMARY');
    expect(actions).toContain('SPM_JOURNEY_SECONDARY');
    expect(actions).toContain('SPM_JOURNEY_QUIET');
    expect(actions).toContain('SPM_DESTRUCTIVE_BTN');
    expect(actions.match(/font-black/g)).toBeNull();
    expect(actions).toContain('font-semibold');
    expect(actions).toContain('font-medium');
  });

  it('keeps standard collection and support surfaces neutral and compact', () => {
    expect(ui).toContain('SPM_STANDARD_SURFACE');
    expect(ui).not.toContain('SPM_EMPTY_PANEL');
    expect(ui).not.toContain('SPM_STATE_PANEL');
    expect(ui).not.toContain('SPM_COLLECTION_CARD');
  });

  it('publishes a restrained typography foundation without forcing one universal card', () => {
    expect(ui).toContain('SPM_PAGE_TITLE');
    expect(ui).toContain('SPM_SECTION_HEADING');
    expect(ui).toContain('SPM_CONTENT_TITLE');
    expect(ui).toContain('SPM_META_TEXT');
    expect(ui).not.toContain('UniversalCard');
  });
});
