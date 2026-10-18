import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const localBuild = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

for (const port of ['3000', '3001', '3002']) {
  try {
    const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    const m = html.match(/data-spokedu-home-build="([^"]+)"/);
    console.log(port, m?.[1] ?? 'no marker', m?.[1] === localBuild ? 'MATCH' : 'STALE');
  } catch (e) {
    console.log(port, 'down', e.message);
  }
}
console.log('local BUILD_ID', localBuild);
