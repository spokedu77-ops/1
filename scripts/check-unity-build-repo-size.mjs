import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const UNITY_ROOT = 'public/spomove/dive/unity/';
const PRODUCTION_THEME2_ROOT = `${UNITY_ROOT}theme2/`;
const LARGE_BINARY_BYTES = 40 * 1024 * 1024;
const TEST_BUILD_PATTERN = /(?:player_release_test|theme2_backup_[^/]+|theme2_camera_test|theme2_session_test|[^/]+_test)\//;
const UNITY_BINARY_PATTERN = /\.(?:data|wasm)$/i;

const stagedOutput = execFileSync(
  'git',
  ['diff', '--cached', '--name-only', '--diff-filter=A', '-z'],
  { encoding: 'utf8' },
);
const stagedPaths = stagedOutput.split('\0').filter(Boolean);
const violations = [];

for (const path of stagedPaths) {
  const normalizedPath = path.replaceAll('\\', '/');
  if (!normalizedPath.startsWith(UNITY_ROOT) || normalizedPath.startsWith(PRODUCTION_THEME2_ROOT)) continue;

  let size = 0;
  try {
    size = statSync(resolve(normalizedPath)).size;
  } catch {
    continue;
  }

  if (UNITY_BINARY_PATTERN.test(normalizedPath) && TEST_BUILD_PATTERN.test(normalizedPath.slice(UNITY_ROOT.length))) {
    violations.push(`${normalizedPath}: test Unity WebGL binary must not be committed`);
    continue;
  }

  if (size >= LARGE_BINARY_BYTES) {
    violations.push(`${normalizedPath}: new binary is ${(size / 1024 / 1024).toFixed(2)} MB (limit: less than 40 MB)`);
  }
}

if (violations.length > 0) {
  console.error('Unity build repository size guard failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(`Production allowlist: ${PRODUCTION_THEME2_ROOT}`);
  process.exit(1);
}

console.log(`Unity build repository size guard passed (${stagedPaths.length} staged additions checked).`);
