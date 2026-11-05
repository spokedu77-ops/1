import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'tailwindcss';
import postcss from 'postcss';

const directory = 'app/spokedu/website';
const tokens = JSON.parse(fs.readFileSync(`${directory}/styles/tokens.json`, 'utf8'));
const theme = fs.readFileSync('node_modules/tailwindcss/theme.css', 'utf8');
const declarations = [];
const restoredDeclarations = [];
for (const [name, value] of Object.entries(tokens.colors)) declarations.push(`--color-${name}:${value};`);
for (const [name, [value, options]] of Object.entries(tokens.fontSize)) {
  declarations.push(`--text-${name}:${value};`, `--text-${name}--line-height:${options.lineHeight};`);
  restoredDeclarations.push(`--text-${name}:${value};`, `--text-${name}--line-height:${options.lineHeight};`);
  // Compatibility values are retained only for non-restored public consumers.
  if (options.fontWeight) {
    declarations.push(`--text-${name}--font-weight:${Math.min(Number(options.fontWeight), 700)};`);
    restoredDeclarations.push(`--text-${name}--font-weight:${options.fontWeight};`);
  }
  if (options.letterSpacing) {
    declarations.push(`--text-${name}--letter-spacing:-0.015em;`);
    restoredDeclarations.push(`--text-${name}--letter-spacing:${options.letterSpacing};`);
  }
}
for (const [name, families] of Object.entries(tokens.fontFamily)) {
  declarations.push(`--font-${name}:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;`);
  restoredDeclarations.push(`--font-${name}:${families.map(family => ['sans-serif', 'serif', 'monospace', 'system-ui'].includes(family) ? family : JSON.stringify(family)).join(',')};`);
}
declarations.push('--radius-lg:2rem;', '--radius-xl:3rem;');
const sources = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (file.endsWith('.tsx')) sources.push(fs.readFileSync(file, 'utf8'));
  }
}
collect(directory);
const candidates = [...new Set(sources.join('\n').match(/[a-zA-Z0-9_@!./%:[\]#(),&=+*-]+/g))];
const result = (await compile(`${theme}\n@theme {${declarations.join('\n')}}\n@tailwind utilities;`)).build(candidates);
const css = postcss.parse(result);
// Newly introduced Stitch utilities must not alter the legacy public cascade
// (for example, its existing full-width CTA buttons at desktop widths).
const stitchOnlyUtilities = new Set([
  'mt-16', 'mb-10', 'aspect-[16/9]', 'max-w-5xl', 'grid-cols-2', 'items-baseline', 'space-y-24',
  'border', 'border-t', 'border-on-primary/60', 'border-outline-variant/30', 'bg-gradient-to-t',
  'from-surface-container-lowest/90', 'object-contain', 'py-16', 'pt-10', 'pb-24',
  'font-display-metric', 'text-display-metric', 'text-display-hero-mobile', 'sm:text-display-metric-mobile', 'xl:text-display-metric', 'leading-snug', 'font-black', 'font-extrabold', 'font-medium', 'text-white',
  'shadow-[0_8px_20px_rgba(37,99,235,0.25)]', 'shadow-[0_20px_50px_rgba(19,27,46,0.06)]',
  'shadow-[0_20px_50px_rgba(37,99,235,0.25)]', 'shadow-[0_20px_50px_rgba(37,99,235,0.28)]',
  'shadow-lg', 'shadow-xl', 'hover:bg-on-primary/10', 'hover:bg-surface-container-low', 'sm:w-auto',
  'md:grid-cols-3', 'md:px-16', 'lg:right-12', 'lg:bottom-10', 'lg:left-12', 'lg:mb-20',
  'lg:aspect-[21/10]', 'lg:gap-12', 'lg:space-y-32', 'lg:px-16', 'lg:py-20', 'lg:pb-32',
]);
const restored = postcss.root();
restored.append(postcss.parse(`.website-content :where(.web-stitch) {${restoredDeclarations.join('\n')}}`).nodes);
const fontProperties = new Set(['font-family', 'font-size', 'line-height', 'letter-spacing', 'font-weight', '--tw-leading', '--tw-tracking', '--tw-font-weight']);
for (const node of css.nodes) {
  if (node.type !== 'rule' || node.selector.includes(':root') || node.selector.includes(':host')) continue;
  const copy = node.clone();
  copy.walkDecls(declaration => {
    if (!fontProperties.has(declaration.prop)) { declaration.remove(); return; }
    // Match Stitch/Tailwind 3: responsive type roles override base utilities.
    declaration.value = declaration.value.replace(/var\(--tw-(?:leading|tracking|font-weight), (var\(--text-[^)]+\))\)/g, '$1');
  });
  copy.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  if (!copy.nodes.length) continue;
  copy.selector = copy.selectors.map(selector => `.website-content :where(.web-stitch) ${selector}`).join(',\n');
  restored.append(copy);
}
css.walkRules(rule => {
  if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return;
  if (rule.parent?.type === 'rule') return;
  if (rule.selector.includes(':root') || rule.selector.includes(':host')) rule.selector = '.website-content';
  else rule.selector = rule.selectors.map(selector => {
    const candidate = selector.match(/^\.((?:\\.|[^\s:.#])+)/)?.[1].replace(/\\(.)/g, '$1');
    return `.website-content ${stitchOnlyUtilities.has(candidate) ? ':where(.web-stitch) ' : ''}${selector}`;
  }).join(',\n');
});
css.append(restored.nodes);
fs.writeFileSync(`${directory}/styles/website-utilities.css`, '/* Generated by scripts/build-website-styles.mjs. Public website only. */\n' + css.toString().replaceAll('--tw-', '--website-tw-'));
