import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Window } from 'happy-dom';
import HomePage from './pages/home';
import PrivatePage from './pages/private';
import EducationPage from './pages/education';
import AboutPage from './pages/about';
import SpomovePage from './pages/spomove';
import { PUBLIC_OPERATING_METRICS } from '../data/marketing-public-metrics';
import { PUBLIC_LEADERSHIP_INTRO, PUBLIC_TEAM_ROLES, PUBLIC_PROGRAM_COPY } from '../data/public-brand-copy';
import { aboutPage } from '../data/about-page';
import { getFieldRecordCatalogItem } from '../data/field-records-catalog';
import { SPOKEDU_IMAGES } from '../data/images';
import { educationPrograms } from './data/education';
import { siteNav, footerNavGroups, siteHeaderLabCta } from '../data/site';

const pages = { home: HomePage, private: PrivatePage, education: EducationPage, about: AboutPage, spomove: SpomovePage };
const windows: Window[] = [];
function render(page: keyof typeof pages) {
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = renderToStaticMarkup(createElement(pages[page]));
  return window.document;
}
afterEach(async () => { await Promise.all(windows.splice(0).map(window => window.happyDOM.close())); });

describe('Canonical Stitch public page structure and preserved handoffs', () => {
  it.each([
    ['home', ['brand', 'service-paths', 'showcase', 'spomove-experience', 'field-stories', 'next-step']],
    ['private', ['brand', 'showcase', 'class-types', 'inquiry']],
    ['education', ['brand', 'program-grid', 'process-showcase', 'operating-metrics', 'inquiry']],
    ['about', ['brand', 'showcase', 'team', 'inquiry']],
    ['spomove', ['brand', 'showcase', 'task-examples', 'inquiry']],
  ] as const)('%s renders the approved section order without appended legacy sections', (page, sections) => {
    const doc = render(page);
    expect([...doc.querySelectorAll('main section')].map(section => section.id)).toEqual(sections);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('main')?.id).toBe('main-content');
    expect(doc.querySelector('form')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/쿨다운 및 피드백|99\.8%|45,000\+|12,000\+|99\.4%|4\.9\/5|2,500\+/);
  });

  it.each(['home', 'education'] as const)('%s keeps all official figures and their exact meanings', page => {
    const doc = render(page);
    expect(PUBLIC_OPERATING_METRICS.map(item => [item.value, item.label])).toEqual([
      ['10,000+', '누적 운영 수업'], ['500+', '출강 학교·기관'], ['30+', '전문 지도자'], ['98%', '파트너 기관 재계약률'],
    ]);
    for (const metric of PUBLIC_OPERATING_METRICS) {
      const term = [...doc.querySelectorAll('dt')].find(node => node.textContent === metric.label);
      expect(term?.parentElement?.querySelector('dd')?.textContent).toBe(metric.value);
    }
  });

  it('uses business metrics on About, retains three real operators and their individual credentials', () => {
    const doc = render('about');
    expect([...doc.querySelectorAll('dt')].map(node => node.textContent)).toEqual([
      'SPOKEDU 설립', '출강 학교·기관', '전문 지도자', '파트너 기관 재계약률',
    ]);
    expect([...doc.querySelectorAll('dd')].map(node => node.textContent)).toEqual(['2020', '500+', '30+', '98%']);
    expect(aboutPage.team.members.map(person => person.name)).toEqual(['최지훈', '김윤기', '김구민']);
    expect(aboutPage.team.members.map(person => person.role)).toEqual(Object.values(PUBLIC_TEAM_ROLES));
    expect(aboutPage.team.members[2].credentials.join(' ')).toContain('강원대학교');
    expect(doc.querySelectorAll('#team .web-person-card')).toHaveLength(3);
    expect(doc.body.textContent).toContain(PUBLIC_LEADERSHIP_INTRO);
  });

  it('keeps the two education steps and all valid follow-up information', () => {
    const doc = render('education');
    expect([...doc.querySelectorAll('#process-showcase h3')].map(node => node.textContent)).toEqual([
      '기관 환경과 교육 목표 파악', '수업 운영 및 결과 공유',
    ]);
    const text = doc.querySelector('#process-showcase')?.textContent ?? '';
    for (const phrase of ['지도자', '수업을 운영', '관찰 내용', '운영 피드백', '다음 회차 조정점', '행정 지원 범위는 사전에 협의']) expect(text).toContain(phrase);
    expect(doc.querySelector('#process-follow-up')).toBeNull();
    expect(doc.querySelectorAll('#process-showcase img')).toHaveLength(2);
    expect(doc.querySelectorAll('#program-grid .web-program-card')).toHaveLength(6);
    for (const program of educationPrograms) expect(doc.querySelector(`a[href="/contact?type=dispatch&program=${program.id}"]`)).not.toBeNull();
  });

  it.each([['private', 'private'], ['education', 'dispatch'], ['spomove', 'spomove']] as const)('%s keeps its typed consultation destination', (page, type) => {
    const doc = render(page);
    expect(doc.querySelector(`#inquiry a[href="/contact?type=${type}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('#inquiry')).toHaveLength(1);
    if (page === 'private') expect(doc.querySelector('#apply #inquiry')).not.toBeNull();
  });

  it('keeps Home product and case destinations with the restored SPOMOVE section', () => {
    const doc = render('home');
    for (const href of ['/contact', '/education', '/about', '/records']) expect(doc.querySelector(`a[href="${href}"]`)).not.toBeNull();
    const sharedDestinations = JSON.stringify([siteNav, footerNavGroups, siteHeaderLabCta]);
    for (const href of ['/private', '/spokedu-lab', '/spomove', '/spomove/catalog', '/spomat']) expect(sharedDestinations).toContain(href);
    for (const slug of ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const) expect(doc.querySelector(`a[href="${getFieldRecordCatalogItem(slug).href}"]`)).not.toBeNull();
    expect(doc.querySelector('#spomove-experience')).not.toBeNull();
    expect(doc.querySelector('#service-paths')).not.toBeNull();
    expect(getFieldRecordCatalogItem('maedong-sports-stepup').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src);
    expect(getFieldRecordCatalogItem('dongjak-spomove').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseSpomove.src);
    expect(getFieldRecordCatalogItem('donghaeng-special-pe').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseAdapted.src);
  });

  it('shows four task examples without claiming they are the full feature count or measured results', () => {
    const doc = render('spomove');
    expect([...doc.querySelectorAll('#task-examples h3')].map(node => node.textContent)).toEqual(['사이먼 효과', '플랭커', '스트룹 과제', 'DIVE']);
    expect(doc.body.textContent).toContain(PUBLIC_PROGRAM_COPY.spomat);
    expect(doc.querySelector('#task-examples')?.textContent).toContain('과제 유형의 예시');
    for (const href of ['/spomat', '/spomove/catalog', '/spokedu-lab']) expect(doc.querySelector(`a[href="${href}"]`)).not.toBeNull();
  });

  it('does not silently apply the unapproved replacement photos or remove the documented duplicates', () => {
    const doc = render('private');
    const photos = [...doc.querySelectorAll('main img')].map(img => img.getAttribute('src'));
    expect(photos.filter(src => src === '/images/spokedu/private/private-coaching.jpg')).toHaveLength(3);
    expect(photos).not.toContain('/images/spokedu/private/private-small-group.jpg');
    expect(photos).not.toContain('/images/spokedu/private/class-flow-02.jpg');
    expect(photos).not.toContain('/images/spokedu/private/class-flow-03.jpg');
    expect(render('about').querySelector('#team img')?.getAttribute('src')).toBe('/images/spokedu/private/instructor-choi.jpg');
  });
});
