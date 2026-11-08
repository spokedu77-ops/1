import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import seed from './approved-seed.json';
import { publicRecordContent, recordContentSchema, safeRecordHref, validatePublication } from './contract';
import { cmsRecordCard } from './cards';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { FieldRecordDetail } from '@/app/spokedu/website/components/FieldRecordDetail';
import HomePage from '@/app/spokedu/website/pages/home';

describe('approved field record content and publication boundaries', () => {
  it('preserves the approved source fingerprint and all six manuscript sections', () => {
    const source = readFileSync('docs/field-records/approved-request.md', 'utf8').replaceAll('\r\n', '\n');
    expect(createHash('sha256').update(source).digest('hex')).toBe(seed.sourceSha256);
    for (const item of seed.records) {
      const content = recordContentSchema.parse(item.content);
      expect(content.sections).toHaveLength(6);
      expect(content.sections.every(section => section.blocks.length > 0)).toBe(true);
      for (const section of content.sections) for (const block of section.blocks) {
        const text = typeof block.content === 'string' ? block.content : block.content.map(item => item.type === 'text' ? item.text : '').join('');
        if (text) expect(source).toContain(text);
      }
      expect(content.period).toBe('');
      expect(validatePublication(content)).toContain('사진의 외부 게시 동의를 확인해 주세요.');
    }
  });
  it('strips hidden observations and editorial instructions from the public snapshot', () => {
    const content = recordContentSchema.parse(seed.records[1].content);
    expect(content.sections.find(section => section.id === 'observations')?.visible).toBe(false);
    const output = publicRecordContent(content);
    expect(output.sections.some(section => section.id === 'observations')).toBe(false);
    expect(output.editorialNotes).toBe('');
    expect(JSON.stringify(output)).not.toContain('실제 회차 기록을 확보하기 전에는');
    const markup = renderToStaticMarkup(createElement(FieldRecordDetail, { content: output }));
    expect(markup).not.toContain('record-observations');
    expect(markup).not.toContain('※');
  });
  it('requires explicit consent and alt for every image, not only a document-level checkbox', () => {
    const content = recordContentSchema.parse(seed.records[0].content);
    content.imagePublicConfirmed = true;
    expect(validatePublication(content)).toContain('모든 공개 사진의 동의 확인과 대체 텍스트가 필요합니다.');
    content.hero!.publicConfirmed = true;
    expect(validatePublication(content)).toEqual([]);
    content.gallery.push({ localKey: 'maedong', alt: '', caption: '', publicConfirmed: true });
    expect(validatePublication(content)).not.toEqual([]);
  });
  it('uses one public summary for home cards, list cards, and the same detail URL', () => {
    const content = publicRecordContent(recordContentSchema.parse(seed.records[0].content));
    const card = cmsRecordCard({ id: 'id', slug: seed.records[0].slug, content, featuredSlot: 1, publishedAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z' });
    expect(card.description).toBe(content.summary);
    expect(card.venue).toBe(content.venue);
    expect(card.href).toBe('/records/maedong-sports-stepup');
    expect(card.categories).toEqual(content.categories);
  });
  it('renders all three approved manuscripts with the existing home card template', () => {
    const records = seed.records.map((item, index) => ({ id: String(index), slug: item.slug, content: publicRecordContent(recordContentSchema.parse(item.content)), featuredSlot: index + 1, publishedAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z' }));
    for (const record of records) {
      const markup = renderToStaticMarkup(createElement(FieldRecordDetail, { content: record.content, preview: true }));
      expect(markup).toContain(record.content.venue);
      expect(markup).not.toContain('editorialNotes');
      if (process.env.FIELD_RECORDS_RENDER_QA === 'true') {
        mkdirSync('.tmp/field-records-qa', { recursive: true });
        writeFileSync(`.tmp/field-records-qa/${record.slug}.html`, markup);
      }
    }
    const home = renderToStaticMarkup(HomePage({ stories: records.map(cmsRecordCard) }));
    expect(home.match(/class="web-case-card"/g)).toHaveLength(3);
    if (process.env.FIELD_RECORDS_RENDER_QA === 'true') writeFileSync('.tmp/field-records-qa/home.html', home);
  });
  it.each(['javascript:alert(1)', 'data:text/html,evil', '//evil.test', '/\\evil.test', 'https://user:pass@evil.test', '/path\nheader'])('rejects unsafe link %s', href => expect(safeRecordHref(href)).toBe(false));
  it('rejects duplicate sections and non-text block payloads', () => {
    const content = structuredClone(seed.records[0].content);
    content.sections[1].id = content.sections[0].id;
    expect(recordContentSchema.safeParse(content).success).toBe(false);
    const unsafe = structuredClone(seed.records[0].content);
    unsafe.sections[0].blocks = [{ type: 'image', content: 'https://private.example' }] as never;
    expect(recordContentSchema.safeParse(unsafe).success).toBe(false);
  });
  it('keeps approved unpublished manuscripts out of client entry points', () => {
    expect(readFileSync('app/admin/field-records/page.tsx', 'utf8')).not.toContain('approved-seed');
    expect(readFileSync('app/admin/field-records/FieldRecordEditor.tsx', 'utf8')).not.toContain('approved-seed');
  });
});
