import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import HomePage from './pages/home';
import { PUBLIC_OPERATING_METRICS } from '../data/marketing-public-metrics';
import { PUBLIC_LEADERSHIP_INTRO, PUBLIC_TEAM_ROLES } from '../data/public-brand-copy';
import { aboutPage } from '../data/about-page';
import { getFieldRecordCatalogItem } from '../data/field-records-catalog';
import { SPOKEDU_IMAGES } from '../data/images';

describe('Public V2 approved content and handoffs', () => {
  const html = renderToStaticMarkup(createElement(HomePage));

  it('renders all approved operating figures without rewriting their meaning', () => {
    expect(PUBLIC_OPERATING_METRICS.map(item => [item.value, item.label])).toEqual([
      ['10,000+', '누적 운영 수업'], ['500+', '출강 학교·기관'], ['30+', '전문 지도자'], ['98%', '파트너 기관 재계약률'],
    ]);
    for (const metric of PUBLIC_OPERATING_METRICS) {
      expect(html).toContain(`<dt>${metric.label}</dt><dd>${metric.value}</dd>`);
    }
    expect(html).not.toMatch(/본사 직영 관리|2,500\+/);
    expect(html).toContain(PUBLIC_LEADERSHIP_INTRO);
    expect(aboutPage.team.members.map(person => person.role)).toEqual(Object.values(PUBLIC_TEAM_ROLES));
    expect(aboutPage.team.members[2].credentials.join(' ')).toContain('강원대학교');
  });

  it('keeps consultation intent, product distinction and real case destinations', () => {
    for (const href of ['/contact', '/education', '/private', '/spokedu-lab', '/spomove', '/spomove/catalog', '/spomat']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('전자 센서나 압력 감지 기능이 없는 물리적 4색 매트');
    expect(html).toContain('과제에 따라 4색 매트 SPOMAT을 활용할 수 있으며');
    for (const slug of ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const) {
      expect(html).toContain(`href="${getFieldRecordCatalogItem(slug).href}"`);
    }
  });

  it('uses the established institution-image mapping rather than private-coaching thumbnails', () => {
    expect(getFieldRecordCatalogItem('maedong-sports-stepup').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src);
    expect(getFieldRecordCatalogItem('dongjak-spomove').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseSpomove.src);
    expect(getFieldRecordCatalogItem('donghaeng-special-pe').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseAdapted.src);
  });
});

describe('Public V2.1 Before design structure (separate from functional contracts)', () => {
  it('retains the original compositions and adds only the SPOMOVE area', () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect([...html.matchAll(/<section id="([^"]+)"/g)].map(match => match[1])).toEqual([
      'brand', 'service-paths', 'showcase', 'spomove-experience', 'field-stories', 'next-step',
    ]);
    expect(html).toContain('web-home-hero');
    expect(html).toContain('web-audience-icon');
    expect(html).toContain('web-watermark');
    expect(html).toContain('web-showcase-reverse');
    expect(html).toContain('web-operating-metrics');
    expect(html).toContain('web-case-card');
    expect(html).toContain('web-cta');
    expect(html).not.toContain('id="education-system"');
  });
});
