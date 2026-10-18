#!/usr/bin/env node
/** DB safety gate only — no test row writes. */
import nextEnv from '@next/env';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertContactE2eDbSafety } from '../lib/contact-e2e-db-safety.mjs';

const closureDir = path.dirname(fileURLToPath(import.meta.url));
const integratedDir = path.resolve(closureDir, '../../integrated-release-review');
nextEnv.loadEnvConfig(path.resolve(closureDir, '../../../..'));

const evidence = { kind: 'db-safety-audit-only', writes: 0, overall: 'FAIL' };

try {
  evidence.safety = assertContactE2eDbSafety();
  evidence.overall = 'PASS';
} catch (e) {
  evidence.error = String(e.message ?? e);
  evidence.overall = String(evidence.error).includes('DB_ENVIRONMENT_BLOCKED')
    ? 'DB_ENVIRONMENT_BLOCKED'
    : 'FAIL';
}

await mkdir(integratedDir, { recursive: true });
await writeFile(path.join(integratedDir, 'DB_SAFETY_AUDIT.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ overall: evidence.overall }, null, 2));
process.exit(evidence.overall === 'PASS' ? 0 : 1);
