import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'app/spokedu-master');

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.endsWith('.test.ts') || name.endsWith('.test.tsx') || name.endsWith('.contract.test.ts')) {
      continue;
    }
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsx(full, out);
    else if (/\.(tsx|ts)$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

describe('MASTER product UI unity', () => {
  const files = walkTsx(ROOT);

  it('bans 「바로 실행」 in product UI/copy (CTA contract)', () => {
    const hits: string[] = [];
    for (const file of files) {
      if (file.includes(`${join('spomove', 'SPOMOVE_PRODUCT_CONTRACT')}`)) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes('바로 실행')) hits.push(file.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''));
    }
    expect(hits).toEqual([]);
  });

  it('routes filter chips through masterUiClasses (no slate-950 chip hardcode)', () => {
    const chipSurfaces = [
      join(ROOT, 'library', 'LibraryView.tsx'),
      join(ROOT, 'report', 'page.tsx'),
      join(ROOT, 'spomove', 'SpomoveHubView.tsx'),
      join(ROOT, 'dashboard', 'DashboardView.tsx'),
    ];
    for (const file of chipSurfaces) {
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('spmChipClass');
      expect(text).not.toMatch(/bg-slate-950 text-white shadow/);
    }
  });

  it('exposes shared chip/seg helpers', () => {
    const tokens = readFileSync(join(ROOT, 'lib', 'masterUiClasses.ts'), 'utf8');
    expect(tokens).toContain('spmChipClass');
    expect(tokens).toContain('spmSegClass');
    expect(tokens).toContain('--spm-acc');
  });

  it('uses spm-btn-primary for subscription gate and payment success primary CTAs', () => {
    const gate = readFileSync(join(ROOT, 'components', 'ui', 'SubscriptionGateWall.tsx'), 'utf8');
    const preview = readFileSync(join(ROOT, 'dashboard', 'EntitlementPreviewHome.tsx'), 'utf8');
    const success = readFileSync(join(ROOT, 'payment', 'success', 'page.tsx'), 'utf8');
    const payment = readFileSync(join(ROOT, 'payment', 'page.tsx'), 'utf8');
    const cancel = readFileSync(join(ROOT, 'payment', 'cancel', 'page.tsx'), 'utf8');
    const subscription = readFileSync(join(ROOT, 'subscription', 'page.tsx'), 'utf8');
    const landing = readFileSync(join(ROOT, 'landing', 'page.tsx'), 'utf8');
    const landingBanner = readFileSync(join(ROOT, 'landing', 'LandingLoggedInBanner.tsx'), 'utf8');
    const onboarding = readFileSync(join(ROOT, 'onboarding', 'page.tsx'), 'utf8');
    for (const text of [gate, preview, success, payment, cancel, subscription, landing, landingBanner, onboarding]) {
      expect(text).toContain('spm-btn-primary');
      expect(text).not.toMatch(/spm-btn-primary[\s\S]{0,80}bg-\[var\(--spm-acc\)\]/);
      expect(text).not.toMatch(/className="[^"]*bg-\[var\(--spm-acc\)\][^"]*font-black/);
    }
    for (const text of [gate, preview, success, cancel, landingBanner]) {
      expect(text).not.toMatch(/style=\{\{\s*background:\s*'var\(--spm-acc\)'/);
    }
    expect(landing).not.toMatch(/시작하기[\s\S]{0,80}background:\s*'var\(--spm-acc\)'/);
    expect(payment).not.toMatch(/구독 선택[\s\S]{0,120}background:\s*'var\(--spm-acc\)'/);
    expect(subscription).not.toMatch(/upgradeHref[\s\S]{0,200}background:\s*'var\(--spm-acc\)'/);
    expect(onboarding).not.toMatch(/시작하기[\s\S]{0,120}background:\s*'var\(--spm-acc\)'/);
  });
});
