import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertQaAuthAllowed } from '../../scripts/lib/spokedu-master-admin-auth.mjs';

const KEYS = [
  'ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH',
  'SPOKEDU_MASTER_QA_ADMIN_HOST_ALLOWLIST',
  'SPOKEDU_MASTER_QA_ADMIN_EMAIL_ALLOWLIST',
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('SPOKEDU MASTER QA admin auth safety', () => {
  it('requires an explicit enable flag', () => {
    delete process.env.ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH;
    expect(() => assertQaAuthAllowed('http://localhost:3000', 'spm.qa.pro@spokedu.test')).toThrow(/ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH=1/);
  });

  it('requires both the target host and QA email to be allowlisted', () => {
    process.env.ALLOW_SPOKEDU_MASTER_QA_ADMIN_AUTH = '1';
    process.env.SPOKEDU_MASTER_QA_ADMIN_HOST_ALLOWLIST = 'localhost:3000';
    process.env.SPOKEDU_MASTER_QA_ADMIN_EMAIL_ALLOWLIST = 'spm.qa.pro@spokedu.test';
    expect(() => assertQaAuthAllowed('https://spokedu.kr', 'spm.qa.pro@spokedu.test')).toThrow(/host is not allowlisted/);
    expect(() => assertQaAuthAllowed('http://localhost:3000', 'teacher@spokedu.com')).toThrow(/email is not allowlisted/);
    expect(() => assertQaAuthAllowed('http://localhost:3000', 'spm.qa.pro@spokedu.test')).not.toThrow();
  });

  it('requires the server-owned QA account marker before generating a link', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/lib/spokedu-master-admin-auth.mjs'), 'utf8');
    expect(source).toContain('qaUser.app_metadata?.spokedu_master_qa !== true');
    expect(source.indexOf('spokedu_master_qa !== true')).toBeLessThan(source.indexOf('service.auth.admin.generateLink'));
    expect(source).not.toMatch(/console\.(?:log|info|debug).*serviceRole|console\.(?:log|info|debug).*token/i);
  });
});