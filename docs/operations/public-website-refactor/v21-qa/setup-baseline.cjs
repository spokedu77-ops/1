const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const commit = '225a9111149da052db5fe6728f05df950f98b4a9';
if (fs.existsSync(path.join(__dirname, 'initial-file-hashes.json'))) throw new Error('Historical baseline already exists; preserve it instead of overwriting the audit.');
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const read = file => git(['show', `${commit}:${file}`]);
fs.mkdirSync(__dirname, { recursive: true });
const status = git(['status', '--porcelain', '-uall']);
const initial = {};
for (const line of status.split('\n').filter(Boolean)) {
  const file = line.slice(3).replace(/^"|"$/g, '');
  if (file.includes('/v21-qa/') || !fs.existsSync(path.join(root, file))) continue;
  initial[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
fs.writeFileSync(path.join(__dirname, 'initial-file-hashes.json'), JSON.stringify(initial, null, 2));
const originals = {};
for (const file of ['app/spokedu/website/pages/home.tsx', 'app/spokedu/website/data/home.ts', 'app/spokedu/website/styles/website.css', 'app/spokedu/website/styles/home-spomove.css', 'app/spokedu/website/components/shared.tsx', 'app/spokedu/website/components/SpomoveVisual.tsx']) {
  const content = read(file);
  originals[file] = { commit, sha256: crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex'), currentMatches: fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n') === content.replace(/\r\n/g, '\n') };
  fs.writeFileSync(path.join(__dirname, 'baseline-' + path.basename(file)), content);
}
fs.writeFileSync(path.join(root, 'app/spokedu/website/pages/__v21-baseline.tsx'), read('app/spokedu/website/pages/home.tsx').replace("'../data/home'", "'../data/__v21-baseline'"));
fs.writeFileSync(path.join(root, 'app/spokedu/website/data/__v21-baseline.ts'), read('app/spokedu/website/data/home.ts'));
const publicEntry = path.join(root, 'app/(spokedu-public)/page.tsx');
const originalEntry = fs.readFileSync(publicEntry, 'utf8');
fs.writeFileSync(path.join(__dirname, 'saved-public-entry.txt'), originalEntry);
fs.writeFileSync(publicEntry, originalEntry.replace("export { default } from '../spokedu/website/pages/home';", "import HomePage from '../spokedu/website/pages/home';\nimport Baseline from '../spokedu/website/pages/__v21-baseline';\nexport default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {\n const query = await searchParams;\n return query.v21baseline === '1' ? <Baseline /> : <HomePage />;\n}"));
fs.writeFileSync(path.join(__dirname, 'baseline-provenance.json'), JSON.stringify({ commit, originals, note: 'Temporary query switch at /?v21baseline=1 ensures the same root shell width as /. Current approved GNB retained. Original Home markup/data and unchanged CSS/shared components. Remove the query switch and temporary components after capture.' }, null, 2));
console.log('Baseline sources preserved; temporary local renderer ready.');
