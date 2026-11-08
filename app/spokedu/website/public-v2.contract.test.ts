import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Window } from 'happy-dom';
import HomePage from './pages/home';
import PrivatePage from './pages/private';
import EducationPage from './pages/education';
import AboutPage from './pages/about';
import SpomovePage from './pages/spomove';
import { PUBLIC_OPERATING_METRICS } from '../data/marketing-public-metrics';
import { PUBLIC_TEAM_ROLES, PUBLIC_PROGRAM_COPY } from '../data/public-brand-copy';
import { aboutPage } from '../data/about-page';
import { getFieldRecordCatalogItem } from '../data/field-records-catalog';
import { SPOKEDU_IMAGES } from '../data/images';
import { educationPrograms } from './data/education';
import { siteNav, footerNavGroups, siteHeaderLabCta } from '../data/site';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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
    ['home', ['brand', 'service-paths', 'showcase', 'field-stories', 'next-step']],
    ['private', ['brand', 'showcase', 'class-types', 'inquiry']],
    ['education', ['brand', 'program-grid', 'process-showcase', 'inquiry-intro', 'inquiry']],
    ['about', ['brand', 'showcase', 'team', 'inquiry']],
    ['spomove', ['brand', 'showcase', 'task-examples', 'inquiry']],
  ] as const)('%s renders the approved section order without appended legacy sections', (page, sections) => {
    const doc = render(page);
    expect([...doc.querySelectorAll('main section')].filter(section => !section.parentElement?.closest('section')).map(section => section.id)).toEqual(sections);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('main')?.id).toBe('main-content');
    if (page === 'education') expect(doc.querySelector('#inquiry form')).not.toBeNull();
    else expect(doc.querySelector('form')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/쿨다운 및 피드백|99\.8%|45,000\+|12,000\+|99\.4%|4\.9\/5|2,500\+/);
  });

  it.each(['home'] as const)('%s keeps all official figures and their exact meanings', page => {
    const doc = render(page);
    expect(PUBLIC_OPERATING_METRICS.map(item => [item.value, item.label])).toEqual([
      ['10,000+', '누적 운영 수업'], ['500+', '출강 학교·기관'], ['30+', '전문 지도자'], ['98%', '파트너 기관 재계약률'],
    ]);
    for (const metric of PUBLIC_OPERATING_METRICS) {
      const term = [...doc.querySelectorAll('dt')].find(node => node.textContent === metric.label);
      expect(term?.parentElement?.querySelector('dd')?.textContent).toBe(metric.value);
    }
  });

  it('keeps About metrics removed and presents three operators with individual credentials', () => {
    const doc = render('about');
    expect(doc.querySelectorAll('#brand dd')).toHaveLength(0);
    expect(aboutPage.team.members.map(person => person.name)).toEqual(['최지훈', '김윤기', '김구민']);
    expect(aboutPage.team.members.map(person => person.role)).toEqual(Object.values(PUBLIC_TEAM_ROLES));
    expect(aboutPage.team.members[2].credentials.join(' ')).toContain('강원대학교');
    expect(doc.querySelectorAll('#team .web-about-person-card')).toHaveLength(3);
    expect(doc.querySelectorAll('#team .web-about-person-details > summary')).toHaveLength(3);
    expect(doc.querySelector('#team')?.textContent).toContain(aboutPage.team.description);
  });

  it('keeps education preparation, field operation, case links and program inquiry entry', () => {
    const doc = render('education');
    expect([...doc.querySelectorAll('#process-showcase h3')].map(node => node.textContent)).toEqual([
      '기관 조건 확인과 수업 구성', '현장 운영과 수업 기록', '실제 기관 운영 사례',
    ]);
    const text = doc.querySelector('#process-showcase')?.textContent ?? '';
    for (const phrase of ['지도자', '수업을 진행', '관찰', '다음 회차', '기관별 협의 범위']) expect(text).toContain(phrase);
    expect(doc.querySelectorAll('.web-education-case-links a')).toHaveLength(3);
    expect(doc.querySelector('#process-follow-up')).toBeNull();
    expect(doc.querySelectorAll('#process-showcase img')).toHaveLength(2);
    expect(doc.querySelectorAll('#program-grid .web-program-card')).toHaveLength(6);
    expect([...doc.querySelectorAll('#program-grid .web-program-card h3')].map(node => node.textContent)).toEqual(educationPrograms.map(program => program.name));
    expect(doc.querySelectorAll('#program-grid button[aria-haspopup="dialog"]')).toHaveLength(educationPrograms.length);
  });

  it.each([['private', 'private'], ['education', 'dispatch'], ['spomove', 'spomove']] as const)('%s keeps its typed consultation destination', (page, type) => {
    const doc = render(page);
    if (page === 'education') {
      expect(doc.querySelector('#inquiry-intro a[href="#inquiry"]')).not.toBeNull();
      expect(doc.querySelector('#inquiry form')).not.toBeNull();
    } else expect(doc.querySelector(`#inquiry a[href="/contact?type=${type}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('#inquiry')).toHaveLength(1);
    if (page === 'private') expect(doc.querySelector('#apply #inquiry')).not.toBeNull();
  });

  it('keeps Home product and case destinations without the SPOMOVE EXPERIENCE section', () => {
    const doc = render('home');
    for (const href of ['/contact', '/education', '/about', '/records']) expect(doc.querySelector(`a[href="${href}"]`)).not.toBeNull();
    const sharedDestinations = JSON.stringify([siteNav, footerNavGroups, siteHeaderLabCta]);
    for (const href of ['/private', '/spokedu-lab', '/spomove', '/spomove/catalog', '/spomat']) expect(sharedDestinations).toContain(href);
    for (const slug of ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const) expect(doc.querySelector(`a[href="${getFieldRecordCatalogItem(slug).href}"]`)).not.toBeNull();
    expect(doc.querySelector('#spomove-experience')).toBeNull();
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
