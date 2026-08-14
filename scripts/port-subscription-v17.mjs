import fs from 'node:fs';
import postcss from 'postcss';

const sourcePath = 'C:/Users/joker/Desktop/spokedu_subscription_intro_v17.html';
const outputDir = 'app/spokedu/components/subscription-v17';
const source = fs.readFileSync(sourcePath, 'utf8');

const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/i);
const mainMatch = source.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
if (!styleMatch || !mainMatch) throw new Error('Reference style/main boundary not found.');

const root = postcss.parse(styleMatch[1]);
root.walkAtRules('font-face', (rule) => {
  const family = rule.nodes?.find((node) => node.type === 'decl' && node.prop === 'font-family');
  if (family?.value.includes('Cafe24SsurroundAir')) rule.remove();
});
const splitSelectors = (value) => {
  const result = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (char === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
};

root.walkRules((rule) => {
  if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
  const scoped = [];
  for (const selector of splitSelectors(rule.selector)) {
    if (selector === ':root' || selector === 'html' || selector === 'body') {
      scoped.push('.root');
    } else if (selector === '*') {
      scoped.push('.root', '.root *');
    } else {
      const normalized = selector
        .replace(/^html\s+body\s*/, '')
        .replace(/^html\s*/, '')
        .replace(/^body\s*/, '')
        .replace(/^body(?=[.#[:])/, '');
      scoped.push(`.root :global(${normalized})`);
    }
  }
  rule.selector = [...new Set(scoped)].join(', ');
});

// Cafe24 Air only ships as weight 400. Prevent browser-dependent synthetic bold.
root.walkRules((rule) => {
  const usesDisplayFont = rule.nodes?.some((node) => node.type === 'decl' && node.prop === 'font-family' && node.value.includes('var(--font-display)'));
  if (!usesDisplayFont) return;
  const weight = rule.nodes?.find((node) => node.type === 'decl' && node.prop === 'font-weight');
  if (weight) weight.value = '400';
  else rule.append({ prop: 'font-weight', value: '400' });
  rule.append({ prop: 'font-synthesis', value: 'none' });
});

let main = mainMatch[1].trim();
const missingIds = [
  ['<section class="section section--blue">', '<section class="section section--blue" id="why">'],
  ['<section class="section section--white">', '<section class="section section--white" id="spomove-system">'],
  ['<section class="section section--blue connection-section">', '<section class="section section--blue connection-section" id="play-spomove">'],
  ['<section class="section section--dark">', '<section class="section section--dark" id="audience">'],
];
for (const [before, after] of missingIds) main = main.replace(before, after);
main = main.replace('<section class="section section--blue">\n<div class="container">\n<span class="eyebrow">서비스 차별점</span>', '<section class="section section--blue" id="differentiators">\n<div class="container">\n<span class="eyebrow">서비스 차별점</span>');
main = main.replace('<section class="section section--white">\n<div class="container">\n<span class="eyebrow">자주 묻는 질문</span>', '<section class="section section--white" id="faq">\n<div class="container">\n<span class="eyebrow">자주 묻는 질문</span>');
main = main.replace('<section class="cta-section" id="contact">', '<section class="cta-section" id="final-cta">');

// Current public product does not expose these old numeric claims.
main = main
  .replaceAll('144개+', '수업자료')
  .replaceAll('144개', '전체 수업자료')
  .replaceAll('7개 시리즈 · 88개', '7개 시리즈 · 단계별 실행 구성')
  .replaceAll('총 88개 프로그램·난이도별 실행 구성', '7개 시리즈·난이도별 실행 구성')
  .replaceAll('2026년 8월 최신 프로그램 목차 기준', '현재 공개 프로그램 체계 기준')
  .replaceAll('7개 시리즈와 88개 실행 구성을 제공합니다.', '7개 시리즈와 난이도별 실행 구성을 제공합니다.')
  .replaceAll('7개 시리즈 · 총 88개', '7개 시리즈 · 단계별 실행 구성')
  .replaceAll('7개 시리즈와 총 88개의 실행 구성으로 정리되어 있습니다.', '7개 시리즈와 난이도별 실행 구성으로 정리되어 있습니다.')
  .replaceAll('따라서 88개는 서로 완전히 다른 게임만을 뜻하는 수치가 아니라', '각 구성은 서로 완전히 다른 게임 수만을 뜻하는 것이 아니라')
  .replaceAll('SPOMOVE의 88개는 모두 완전히 다른 게임인가요?', 'SPOMOVE 실행 구성은 모두 완전히 다른 게임인가요?')
  .replaceAll('88개는 7개 시리즈에 포함된 프로그램과 난이도별 실행 구성을 합한 수치입니다.', '실행 구성은 7개 시리즈에 포함된 프로그램과 난이도별 단계를 함께 정리한 체계입니다.')
  .replaceAll('SPOMOVE 7개 시리즈·88개 실행 구성', 'SPOMOVE 7개 시리즈와 난이도별 실행 구성')
  .replaceAll('이번 주 추천 프로그램 1개와 수업도구 6종', '무료 수업도구')
  .replaceAll('이번 주 추천 프로그램 1개', '무료 수업도구')
  .replaceAll('나머지 놀이체육·수업기록·SPOMOVE는 유료 구독', '놀이체육·수업기록·SPOMOVE는 현재 플랜별 이용 범위 적용')
  .replaceAll('무료 이용자는 무료 수업도구를 이용할 수 있습니다. 놀이체육 전체 수업자료와 수업기록과 SPOMOVE 전체 콘텐츠는 유료 구독에 포함됩니다.', '무료 이용 범위는 로그인 후 수업 도구입니다. 놀이체육·수업기록·SPOMOVE는 현재 플랜별 이용 범위가 적용됩니다.');

const sections = main
  .split(/(?=<section\b)/i)
  .map((part) => part.trim())
  .filter(Boolean);
if (sections.length !== 19) throw new Error(`Expected 19 sections, received ${sections.length}.`);
const manifest = sections.map((html, index) => ({
  number: index + 1,
  id: html.match(/<section[^>]*\sid="([^"]+)"/)?.[1] ?? null,
  eyebrow: html.match(/class="eyebrow"[^>]*>([\s\S]*?)<\//)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? null,
  heading: html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? null,
  childBlocks: [...html.matchAll(/class="([^"]+)"/g)].map((match) => match[1]),
  mediaCount: (html.match(/<(?:img|video|figure)\b/g) ?? []).length,
}));
// The plans section is rendered with the same reference classes from the live public contract.
sections[15] = '<section class="section section--white" id="plans"><div id="subscription-v17-plans-portal" class="subscription-v17-portal"></div></section>';

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(`${outputDir}/subscription-v17.module.css`, `/* Mechanical port from spokedu_subscription_intro_v17.html. Preserve source order. */\n${root.toString()}\n.root :global(.subscription-v17-portal) { display: contents; }\n`, 'utf8');
fs.writeFileSync(`${outputDir}/subscription-v17-source.ts`, `/* Generated by scripts/port-subscription-v17.mjs from the approved source HTML. */\nexport const subscriptionV17Sections = ${JSON.stringify(sections, null, 2)} as const;\n`, 'utf8');
fs.writeFileSync(`${outputDir}/subscription-v17-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ sections: sections.length, cssRules: root.nodes.length, outputDir }, null, 2));
