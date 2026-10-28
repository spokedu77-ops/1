import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const accessSource = readFileSync(join(process.cwd(), 'app/lib/server/spokeduMasterAccess.ts'), 'utf8');

describe('P2-1 lite preset lookup contract', () => {
  it('gates think_asset_packs lookup behind active lite entitlement', () => {
    expect(accessSource).toContain('shouldLoadLiteSpomoveTrialPreset');
    expect(accessSource).toContain('if (shouldLoadLiteSpomoveTrialPreset(entitlement))');
    expect(accessSource).toContain('getConfiguredLiteSpomoveTrialPresetId(serviceSupabase)');
    expect(accessSource).not.toContain('getConfiguredLiteSpomoveTrialPresetId(serviceSupabase),');
    expect(accessSource).not.toContain('liteSpomoveTrialPresetConfigCache');
  });
});
