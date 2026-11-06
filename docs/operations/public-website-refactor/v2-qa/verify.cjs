const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const out = __dirname;
const codeFiles = [
  'components/home-web/home-section03-people.ts', 'components/site-chrome.tsx',
  'data/about-founder.ts', 'data/about-page.ts', 'data/curriculum-page.ts', 'data/education-system.ts',
  'data/field-records-catalog.ts', 'data/field-records-catalog.test.ts', 'data/marketing-public-metrics.ts',
  'data/public-brand-copy.ts', 'data/site.ts', 'data/site-ia.test.ts', 'data/spomat-page.ts',
  'data/spomove-program-page.ts', 'data/spomove-public-catalog-page.ts',
  'website/components/content-sections.tsx', 'website/data/education.ts', 'website/data/home.ts',
  'website/pages/about.tsx', 'website/pages/education.tsx', 'website/pages/home.tsx', 'website/pages/spomove.tsx',
  'website/public-v2.contract.test.ts',
].map(file => 'app/spokedu/' + file);
function run(name, args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    let output = '';
    child.stdout.on('data', chunk => output += chunk);
    child.stderr.on('data', chunk => output += chunk);
    child.on('close', code => {
      fs.writeFileSync(path.join(out, name + '.log'), output);
      console.log(`${name}: exit ${code}`);
      resolve({ name, command: `node ${args.join(' ')}`, exitCode: code });
    });
  });
}
(async () => {
  const results = await Promise.all([
    run('build', ['node_modules/next/dist/bin/next', 'build']),
    run('tests', ['node_modules/vitest/vitest.mjs', 'run', 'app/spokedu']),
    run('eslint', ['node_modules/eslint/bin/eslint.js', ...codeFiles]),
  ]);
  results.push(await run('typescript', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']));
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ results }, null, 2));
  process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
})();
