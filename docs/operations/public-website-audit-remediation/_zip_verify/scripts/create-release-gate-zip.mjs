#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const gateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(gateDir, '../../..');
const zipName = 'SPOKEDU_PUBLIC_WEBSITE_RELEASE_GATE.zip';
const zipPath = path.join(repoRoot, zipName);
const verifyDir = path.join(gateDir, '_zip_verify');

async function sha256File(abs) {
  const buf = await readFile(abs);
  return createHash('sha256').update(buf).digest('hex');
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.name === '_zip_verify') continue;
    if (e.isDirectory()) await copyDir(s, d);
    else await cp(s, d);
  }
}

async function main() {
  await rm(path.join(gateDir, '_zip_verify'), { recursive: true, force: true });
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${gateDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  await rm(verifyDir, { recursive: true, force: true });
  await mkdir(verifyDir, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${verifyDir.replace(/'/g, "''")}' -Force"`,
    { cwd: repoRoot, stdio: 'inherit' },
  );
  const manifestPath = path.join(gateDir, 'RELEASE_FILE_MANIFEST.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const checks = [];
  for (const f of manifest.newFiles) {
    const rel = f.path.replace(/\\/g, '/');
    const v = path.join(verifyDir, 'included-sources', rel);
    try {
      const st = await stat(v);
      checks.push({ path: rel, ok: st.isFile(), sha256: await sha256File(v) });
    } catch {
      checks.push({ path: rel, ok: false });
    }
  }
  const verify = {
    zipPath,
    zipBytes: (await stat(zipPath)).size,
    manifestNewFilesOk: checks.every((c) => c.ok),
    sha256Match: checks.every((c) => c.ok && c.sha256 === manifest.newFiles.find((m) => m.path === c.path)?.sha256),
    fullPatchOk: await stat(path.join(verifyDir, 'FULL_REMEDIATION.patch')).then(() => true).catch(() => false),
  };
  await writeFile(path.join(gateDir, 'qa-evidence', 'ZIP_VERIFY.json'), JSON.stringify({ verify, checks }, null, 2));
  console.log(JSON.stringify(verify, null, 2));
  if (!verify.manifestNewFilesOk || !verify.fullPatchOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
