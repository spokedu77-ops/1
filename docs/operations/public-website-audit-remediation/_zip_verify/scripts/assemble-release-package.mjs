#!/usr/bin/env node
/** Copy new-file originals + write manifest (no git commit). */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const gateDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(gateDir, '..');
const repoRoot = path.resolve(pkgRoot, '../../..');
const included = path.join(pkgRoot, 'included-sources');

const NEW_FILES = [
  'app/lib/server/publicLeadSpamGuard.ts',
  'app/lib/server/publicLeadSpamGuard.test.ts',
  'app/api/info/gym/leads/route.ts',
  'app/api/info/gym/leads/route.test.ts',
  'app/spokedu/lib/legacy-info-redirects.ts',
  'app/spokedu/lib/legacy-info-redirects.test.ts',
  'supabase/migrations/20261018120000_public_lead_rate_limit.sql',
];

const DELETED_FILES = [
  'app/spokedu/components/subscription-v17/subscription-v17-manifest.json',
  'app/spokedu/components/subscription-v17/subscription-v17-page.tsx',
  'app/spokedu/components/subscription-v17/subscription-v17-source.ts',
  'app/spokedu/components/subscription-v17/subscription-v17.module.css',
];

const MODIFIED_GLOBS = [
  '.cursor/rules/spokedu-public-website.mdc',
  '.env.example',
  'docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md',
  'app/info/curriculum/page.tsx',
  'app/info/private/page.tsx',
  'app/info/gym/components/ContactForm.tsx',
  'app/info/gym/data/config.ts',
  'app/api/consult/route.ts',
  'app/api/private/leads/route.ts',
  'app/api/dispatch/leads/route.ts',
  'app/api/curriculum/leads/route.ts',
  'app/consult/page.tsx',
  'app/spokedu/data/brand.ts',
  'app/spokedu/data/site.ts',
  'app/spokedu/components/site-chrome.tsx',
  'app/spokedu/components/curriculum-landing.tsx',
  'app/move-report/components/Result.tsx',
  'app/spokedu/lib/public-marketing-typography.contract.test.ts',
  'app/spokedu-master/businessInfo.contract.test.ts',
];

async function sha256File(abs) {
  const buf = await readFile(abs);
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const head = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const originMain = execSync('git rev-parse origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim();

  for (const rel of NEW_FILES) {
    const src = path.join(repoRoot, rel);
    const dest = path.join(included, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }

  const manifest = { baseHead: head, originMain, newFiles: [], modifiedFiles: [], deletedFiles: DELETED_FILES };
  for (const rel of NEW_FILES) {
    manifest.newFiles.push({ path: rel, sha256: await sha256File(path.join(repoRoot, rel)) });
  }
  for (const rel of MODIFIED_GLOBS) {
    try {
      manifest.modifiedFiles.push({ path: rel, sha256: await sha256File(path.join(repoRoot, rel)) });
    } catch {
      /* optional */
    }
  }

  const patchOut = path.join(pkgRoot, 'FULL_REMEDIATION.patch');
  const nullDev = process.platform === 'win32' ? 'nul' : '/dev/null';
  let patch = execSync(`git diff HEAD -- ${MODIFIED_GLOBS.concat(DELETED_FILES).map((p) => `"${p}"`).join(' ')}`, {
    cwd: repoRoot,
    maxBuffer: 50 * 1024 * 1024,
  }).toString('utf8');

  for (const rel of NEW_FILES) {
    try {
      execSync(`git diff --no-index -- "${nullDev}" "${path.join(repoRoot, rel)}"`, {
        cwd: repoRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (e) {
      if (e.stdout) patch += `\n${e.stdout.toString('utf8')}`;
    }
  }

  await writeFile(patchOut, patch, 'utf8');
  await writeFile(path.join(pkgRoot, 'RELEASE_FILE_MANIFEST.json'), JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(pkgRoot, 'RELEASE_FILE_MANIFEST.md'),
    `# Release file manifest\n\n- base HEAD: \`${head}\`\n- origin/main: \`${originMain}\`\n- FULL patch: \`FULL_REMEDIATION.patch\`\n- New file originals: \`included-sources/\`\n`,
  );
  console.log(JSON.stringify({ ok: true, head, newFiles: NEW_FILES.length, deleted: DELETED_FILES.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
