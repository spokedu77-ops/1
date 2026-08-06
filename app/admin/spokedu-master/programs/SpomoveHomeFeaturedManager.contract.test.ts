import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/admin/spokedu-master/programs/SpomoveHomeFeaturedManager.tsx'),
  'utf8',
);

describe('admin SPOMOVE home featured labels', () => {
  it('uses the shared public display model for selected values and dropdown options', () => {
    expect(source).toContain('getSpomovePresetDisplayModel');
    expect(source).toContain('display.displayTitle');
    expect(source).toContain('display.programLabel');
    expect(source).toContain('display.supportMeta');
    expect(source).toContain('buildPresetAdminLabel(preset)');
    expect(source).not.toContain('const inputValue = open ? query : selected?.title');
    expect(source).not.toContain('{preset.title}</p>');
    expect(source).not.toContain('{preset.axisTitle} · {preset.programTitle}');
  });
});
