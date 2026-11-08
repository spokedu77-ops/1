// Deterministically transfer the approved manuscript. Does not connect to any DB.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const source = readFileSync(new URL('../docs/field-records/approved-request.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const chapterIds = ['introduction', 'background', 'activities', 'teaching', 'observations', 'gallery'];
const config = [
  { slug: 'maedong-sports-stepup', image: 'maedong', categories: ['institution'], operator: '종로거점형 우리동네키움센터 연계 · 매동초등학교 늘봄 스포츠 교육', cta: '학교와 기관의 환경에 맞는 체육교육을 설계합니다.', program: '/education', programLabel: '기관 체육교육 알아보기', contact: '/contact?type=dispatch', contactLabel: '수업 상담하기' },
  { slug: 'dongjak-spomove', image: 'dongjak', categories: ['institution', 'spomove'], audience: '초등학생', operator: '동작거점형 우리동네키움센터 · SPOMOVE 활용 수업', cta: '시각정보를 움직임으로 연결하는 SPOKEDU의 자체 개발 프로그램을 살펴보세요.', program: '/spomove', programLabel: 'SPOMOVE 알아보기', contact: '/contact?type=spomove', contactLabel: '프로그램 도입 문의' },
  { slug: 'donghaeng-special-pe', image: 'donghaeng', categories: ['institution', 'special', 'spomove'], audience: '특수교육 대상 학생', operator: '서울 중구 · 학교 특수학급 및 지역 복지기관 등 찾아가는 맞춤형 체육교육', cta: '학생의 발달 수준과 교육 환경에 맞는 체육수업을 설계합니다.', program: '/education', programLabel: '특수체육 프로그램 알아보기', contact: '/contact?type=dispatch', contactLabel: '기관 수업 상담하기' },
];
const cases = [...source.matchAll(/^# 사례 \d+\. (.+)\n([\s\S]*?)(?=^# 사례 |^# PART 3)/gm)];
if (cases.length !== 3) throw new Error('Exactly three approved manuscripts required');
const field = (text, label) => text.match(new RegExp(`\\*\\*${label}\\*\\*\\n\\n([^\\n]+)`))?.[1]?.trim() ?? '';
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part => ({ type: 'text', text: part.startsWith('**') ? part.slice(2, -2) : part, styles: part.startsWith('**') ? { bold: true } : {} }));
}
function blocks(text) {
  return text.trim().split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(paragraph => paragraph && paragraph !== '---' && !paragraph.startsWith('※')).map(paragraph => {
    if (paragraph.startsWith('### ')) return { type: 'heading', props: { level: 2 }, content: paragraph.slice(4) };
    if (/^\*\*[^*]+\*\*$/.test(paragraph)) return { type: 'heading', props: { level: 3 }, content: paragraph.slice(2, -2) };
    return { type: 'paragraph', content: inline(paragraph) };
  });
}
const seeds = cases.map((match, index) => {
  const raw = match[2]; const settings = config[index];
  const admin = raw.split('## 01.')[0]; const venue = match[1];
  const sections = [...raw.matchAll(/^## (\d\d)\. ([^\n]+)\n([\s\S]*?)(?=^## \d\d\.|(?![\s\S]))/gm)];
  if (sections.length !== 6) throw new Error(`Six sections required: ${venue}`);
  const badge = field(admin, '교육 유형 배지').split(' · ');
  const title = field(admin, '대표 제목');
  const content = {
    title, venue, subtitle: field(admin, '부제'), operationType: badge[0], programLabel: badge.slice(1).join(' · '), summary: field(admin, '카드 요약'),
    audience: field(admin, '교육 대상') || settings.audience, operator: settings.operator, period: '', categories: settings.categories,
    keywords: field(admin, '교육 키워드').split(' · '),
    sections: sections.map((section, sectionIndex) => ({ id: chapterIds[sectionIndex], title: section[2], visible: !(index === 1 && sectionIndex === 4),
      blocks: sectionIndex === 5 ? [{ type: 'paragraph', content: field(section[3], '갤러리 제목') }] : blocks(section[3]) })),
    hero: { localKey: settings.image, alt: `${venue} 실제 체육수업 현장`, caption: '', publicConfirmed: false }, gallery: [], imagePublicConfirmed: false,
    relatedProgram: settings.program, ctaTitle: settings.cta, programCtaLabel: settings.programLabel, contactCtaLabel: settings.contactLabel, contactHref: settings.contact,
    seoTitle: `${venue} · ${title}`, seoDescription: field(admin, '카드 요약'),
    editorialNotes: `승인 원고를 그대로 이관한 초안입니다. 사진 공개 동의와 기관 일치 여부를 확인한 후 게시하세요.\n\n${sections.filter((_, sectionIndex) => sectionIndex === 5 || index === 1 && sectionIndex === 4).map(section => section[3].trim()).join('\n\n')}\n\n${raw.match(/^※.+/gm)?.join('\n') ?? ''}`,
  };
  return { slug: settings.slug, content };
});
const output = `${JSON.stringify({ sourceSha256: createHash('sha256').update(source).digest('hex'), records: seeds }, null, 2)}\n`;
const target = new URL('../app/lib/field-records/approved-seed.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Approved seed drift detected');
} else writeFileSync(target, output);
console.log(`Approved draft seed: ${seeds.length} records (${fileURLToPath(target)})`);
