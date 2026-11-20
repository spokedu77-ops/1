import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Window } from 'happy-dom';
import HomePage from './pages/home';
import PrivatePage from './pages/private';
import EducationServerPage, { EducationContent } from './pages/education';
import AboutPage from './pages/about';
import SpomoveServerPage, { SpomoveContent as SpomovePage } from './pages/spomove';
import { listPublicRecordCards } from '@/app/lib/server/fieldRecords';
import { legacyRecordCards } from '@/app/lib/field-records/cards';
import { PUBLIC_OPERATING_METRICS } from '../data/marketing-public-metrics';
import { PUBLIC_TEAM_ROLES, PUBLIC_PROGRAM_COPY } from '../data/public-brand-copy';
import { aboutPage } from '../data/about-page';
import { getFieldRecordCatalogItem } from '../data/field-records-catalog';
import { SPOKEDU_IMAGES } from '../data/images';
import { educationPrograms, educationProgramGroups } from './data/education';
import { siteNav, footerNavGroups, siteHeaderLabCta } from '../data/site';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/lib/server/fieldRecords', () => ({ listPublicRecordCards: vi.fn(async () => []) }));

const EducationPage = () => createElement(EducationContent, { stories: legacyRecordCards() });
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
    ['home', ['brand', 'operating-metrics', 'service-paths', 'showcase', 'four-move', 'field-stories', 'next-step']],
    ['private', ['brand', 'showcase', 'class-types', 'private-faq', 'inquiry']],
    ['education', ['brand', 'education-metrics', 'program-grid', 'process-showcase', 'field-stories', 'inquiry']],
    ['about', ['brand', 'approach', 'what-we-do', 'history', 'team', 'inquiry']],
    ['spomove', ['spomove-hero', 'how-it-works', 'task-examples', 'levels', 'spomat', 'applications', 'field-case', 'lab', 'inquiry']],
  ] as const)('%s renders the approved section order without appended legacy sections', (page, sections) => {
    const doc = render(page);
    expect([...doc.querySelectorAll('main section')].filter(section => !section.parentElement?.closest('section')).map(section => section.id)).toEqual(sections);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('main')?.id).toBe('main-content');
    if (page === 'education' || page === 'spomove') expect(doc.querySelector('#inquiry form')).not.toBeNull();
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

  it('keeps metrics out of the About hero and presents three operators with individual credentials', () => {
    const doc = render('about');
    expect(doc.querySelectorAll('#brand dd')).toHaveLength(0);
    expect(aboutPage.team.members.map(person => person.name)).toEqual(['최지훈', '김윤기', '김구민']);
    expect(aboutPage.team.members.map(person => person.role)).toEqual(Object.values(PUBLIC_TEAM_ROLES));
    expect(aboutPage.team.members[2].credentials.join(' ')).toContain('강원대학교');
    expect(doc.querySelectorAll('#team .web-about-person-card')).toHaveLength(3);
    expect(doc.querySelectorAll('#team .web-about-person-details > summary')).toHaveLength(3);
    expect(doc.querySelector('#team')?.textContent).toContain(aboutPage.team.description);
    expect([...doc.querySelectorAll('#team .web-about-person-degree')].map(node => node.textContent)).toEqual([
      '연세대학교 체육교육학과', '연세대학교 체육교육학과', '강원대학교 레저스포츠학과',
    ]);
    const cards = [...doc.querySelectorAll('#team .web-about-person-card')];
    aboutPage.team.members.forEach((person, index) => {
      const card = cards[index];
      expect(card.querySelector('h3')?.textContent).toBe(person.name);
      expect(card.querySelector('.web-about-person-role')?.textContent).toBe(person.role);
      expect(card.querySelector('.web-about-person-responsibility')?.textContent).toBe(person.mainRole);
      expect(card.querySelector('img')?.getAttribute('src')).toBe(person.photo);
      const details = card.querySelector('details.web-about-person-details');
      expect(details).not.toBeNull();
      expect(details?.hasAttribute('open')).toBe(false);
      expect(details?.querySelector('summary .web-about-person-expand-label')?.textContent).toBe('상세 약력 보기');
      expect(details?.querySelector('summary .web-about-person-collapse-label')?.textContent).toBe('상세 약력 접기');
      expect(details?.querySelector('.web-about-person-biography section p')?.textContent).toBe(person.detailEducation);
      expect([...details!.querySelectorAll('.web-about-person-biography li')].map(node => node.textContent)).toEqual([
        ...person.qualifications, ...person.experience,
      ]);
    });
  });

  it('keeps the fixed Home copy and exactly one independent four-area 4MOVE section', () => {
    const doc = render('home');
    expect([...doc.querySelectorAll('#brand h1 > span')].map(node => node.textContent)).toEqual([
      '아이와 현장의 조건에 맞춰', '움직이고 싶게 만드는', '체육수업을 설계합니다.',
    ]);
    expect([...doc.querySelectorAll('#next-step h2 > span')].map(node => node.textContent)).toEqual([
      '지금, 우리 학교와 아이를 위한', '최고의 스포츠 교육을 만나보세요.',
    ]);
    expect([...doc.querySelectorAll('#next-step a')].map(node => [node.textContent, node.getAttribute('href')])).toEqual([
      ['수업 상담하기', '/contact'], ['전체 수업 사례 보기', '/records'],
    ]);
    expect(doc.querySelectorAll('#operating-metrics')).toHaveLength(1);
    expect(doc.querySelectorAll('#field-stories #operating-metrics')).toHaveLength(0);
    expect(doc.querySelectorAll('section#four-move')).toHaveLength(1);
    expect(doc.querySelectorAll('.home-v2-move-grid')).toHaveLength(1);
    expect(doc.querySelectorAll('#showcase .home-v2-move-grid')).toHaveLength(0);
    expect(doc.querySelector('#four-move .home-v2-move-grid')?.tagName).toBe('DL');
    expect([...doc.querySelectorAll('#four-move dt')].map(node => node.textContent)).toEqual([
      'BASE MOVE', 'SPORTS MOVE', 'PLAY MOVE', 'SPOMOVE',
    ]);
    expect(doc.querySelectorAll('#four-move dd')).toHaveLength(4);
    expect(doc.querySelector('#four-move')?.textContent).toContain('고정된 순서가 아닌');
    expect(doc.querySelector('#four-move')?.textContent).not.toMatch(/\b0[1-4]\b|STEP\s*[1-4]|[1-4]단계/i);
  });

  it('renders all six About history years and eighteen source items without duplicating Home metrics', () => {
    const doc = render('about');
    expect(doc.querySelectorAll('section#history')).toHaveLength(1);
    const groups = [...doc.querySelectorAll('#history [data-history-year]')];
    expect(groups).toHaveLength(6);
    expect(groups.map(node => node.getAttribute('data-history-year'))).toEqual([
      '2026', '2025', '2024', '2023', '2021', '2020',
    ]);
    aboutPage.history.yearGroups.forEach((group, index) => {
      expect(groups[index].querySelector('.web-about-timeline-year')?.textContent).toBe(group.year);
      expect(groups[index].querySelector('h3')?.textContent).toBe(group.theme);
      expect([...groups[index].querySelectorAll('ul > li')].map(node => node.textContent)).toEqual([...group.items]);
    });
    expect(doc.querySelectorAll('#history [data-history-year] ul > li')).toHaveLength(18);
    expect(doc.querySelectorAll('#about-metrics')).toHaveLength(0);
  });

  it('keeps education preparation, field operation, case links and program inquiry entry', () => {
    const doc = render('education');
    expect([...doc.querySelectorAll('#process-showcase h3')].map(node => node.textContent)).toEqual([
      '조건 확인', '수업안 및 준비 범위 구성', '현장 운영 및 활동 조정', '필요한 사항 기록·공유',
    ]);
    const text = doc.querySelector('#process-showcase')?.textContent ?? '';
    for (const phrase of ['지도자', '수업을 진행', '관찰', '다음 회기', '기관과 협의한 범위']) expect(text).toContain(phrase);
    expect(doc.querySelectorAll('#field-stories [data-record-slug] a')).toHaveLength(3);
    expect(doc.querySelectorAll('#field-stories img')).toHaveLength(3);
    expect(doc.querySelector('#field-stories a[href="/records"]')?.textContent).toContain('전체 수업 사례 보기');
    for (const slug of ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const) {
      const link = doc.querySelector(`#field-stories [data-record-slug="${slug}"] a`);
      const record = getFieldRecordCatalogItem(slug);
      expect(link?.getAttribute('href')).toBe(record.href);
      if (record.href.startsWith('https://')) {
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      }
    }
    expect(doc.querySelector('#process-follow-up')).toBeNull();
    expect(doc.querySelectorAll('#process-showcase img')).toHaveLength(0);
    expect(doc.querySelectorAll('#program-grid .web-program-card')).toHaveLength(6);
    const groupedPrograms = educationProgramGroups.flatMap(group => group.programIds.map(id => educationPrograms.find(program => program.id === id)!));
    expect([...doc.querySelectorAll('#program-grid .web-program-card h4')].map(node => node.textContent)).toEqual(groupedPrograms.map(program => program.name));
    expect(doc.querySelectorAll('#program-grid button[aria-haspopup="dialog"]')).toHaveLength(educationPrograms.length);
  });

  it('groups all six education programs once without replacing their content or inquiry entry', () => {
    const doc = render('education');
    const groups = [...doc.querySelectorAll('.web-education-program-group')];
    expect(groups).toHaveLength(3);
    expect(groups.map(group => group.querySelector('header h3')?.textContent)).toEqual([
      '정기·방과후 수업', '특수·포용 및 맞춤 체육', '특강·캠프 및 행사',
    ]);
    const cards = [...doc.querySelectorAll('[data-program-id]')];
    expect(cards.map(card => card.getAttribute('data-program-id')).sort()).toEqual(educationPrograms.map(program => program.id).sort());
    educationPrograms.forEach(program => {
      const card = doc.querySelector(`[data-program-id="${program.id}"]`);
      expect(card?.querySelector('img')?.getAttribute('src')).toBe(program.image);
      expect(card?.querySelector('.web-education-program-description')?.textContent).toBe(program.description);
      expect(card?.querySelector('.web-education-program-application')?.textContent).toBe(program.application);
    });
    expect(doc.querySelector('.web-education-group-note')?.textContent).toContain('운영 형태는 기관 조건에 따라 달라질 수 있습니다');
    expect(groups.map(group => [...group.querySelectorAll('[data-program-id]')].map(card => card.getAttribute('data-program-id')))).toEqual([
      ['monthly-sports', 'spomove'], ['inclusive', 'custom-class'], ['mini-olympics', 'custom-booth'],
    ]);
    expect(doc.querySelectorAll('#process-showcase .web-education-operating-steps > li')).toHaveLength(4);
    expect(doc.querySelector('#brand a[href="#program-grid"]')).not.toBeNull();
    expect(doc.querySelector('#brand a[href="#inquiry"]')).not.toBeNull();
    expect(doc.querySelectorAll('#inquiry form')).toHaveLength(1);
    expect([...doc.querySelectorAll('#education-metrics dl > div')].map(node => [node.querySelector('dd')?.textContent, node.querySelector('dt')?.textContent])).toEqual(PUBLIC_OPERATING_METRICS.map(metric => [metric.value, metric.label]));
  });

  it('keeps private formats, consultation anchors and conditional FAQ without adding a form or new prefill', () => {
    const doc = render('private');
    expect([...doc.querySelectorAll('#class-types h3')].map(node => node.textContent)).toEqual(['1:1 개인수업', '2~4명 소그룹', '종목 준비']);
    expect(doc.querySelectorAll('.web-private-comparison-points')).toHaveLength(2);
    expect(doc.querySelectorAll('.web-private-comparison-points li')).toHaveLength(6);
    expect(doc.querySelector('.web-private-hero-photo img')?.getAttribute('src')).toBe('/images/spokedu/private/private-coaching.jpg');
    expect(doc.querySelectorAll('#showcase h2')).toHaveLength(3);
    expect(doc.querySelectorAll('#private-faq details')).toHaveLength(6);
    expect(doc.querySelectorAll('#private-faq details > summary')).toHaveLength(6);
    expect(doc.querySelector('#private-faq')?.textContent).not.toMatch(/익일 오전|여자 선생님 희망 시에도 배정 가능|평일 및 주말.*모두 수업 가능/);
    for (const id of ['apply', 'booking-form', 'inquiry']) expect(doc.querySelectorAll(`#${id}`)).toHaveLength(1);
    expect(doc.querySelector('#apply #inquiry a[href="/contact?type=private"]')).not.toBeNull();
    expect(doc.querySelector('a[href*="classType="]')).toBeNull();
    expect(doc.querySelector('form')).toBeNull();
  });

  it.each([['private', 'private'], ['education', 'dispatch'], ['spomove', 'spomove']] as const)('%s keeps its typed consultation destination', (page, type) => {
    const doc = render(page);
    if (page === 'education') {
      expect(doc.querySelector('#inquiry-intro')).toBeNull();
      expect(doc.querySelector('.web-education-consult-copy h2')?.textContent).toBe('우리 기관에 맞는 체육수업을함께 구성해 보세요.');
      expect(doc.querySelector('#brand a.bg-primary-container')?.getAttribute('href')).toBe('#inquiry');
      expect(doc.querySelector('#brand a[href="#program-grid"]')?.textContent?.trim()).toBe('운영 프로그램 살펴보기');
      expect(doc.querySelector('#inquiry form')).not.toBeNull();
    } else if (page === 'spomove') expect(doc.querySelector(`.spmi-consult a[href="/contact?type=${type}"]`)).not.toBeNull();
    else expect(doc.querySelector(`#inquiry a[href="/contact?type=${type}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('#inquiry')).toHaveLength(1);
    if (page === 'private') expect(doc.querySelector('#apply #inquiry')).not.toBeNull();
  });

  it('keeps Home product and case destinations without the SPOMOVE EXPERIENCE section', () => {
    const doc = render('home');
    for (const href of ['/contact', '/education', '/records']) expect(doc.querySelector(`a[href="${href}"]`)).not.toBeNull();
    const sharedDestinations = JSON.stringify([siteNav, footerNavGroups, siteHeaderLabCta]);
    expect(sharedDestinations).toContain('/about');
    for (const href of ['/private', '/spokedu-lab', '/spomove', '/spomove/catalog', '/spomat']) expect(sharedDestinations).toContain(href);
    for (const slug of ['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const) expect(doc.querySelector(`a[href="${getFieldRecordCatalogItem(slug).href}"]`)).not.toBeNull();
    expect(doc.querySelector('#spomove-experience')).toBeNull();
    expect(doc.querySelector('#service-paths')).not.toBeNull();
    expect(getFieldRecordCatalogItem('maedong-sports-stepup').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src);
    expect(getFieldRecordCatalogItem('dongjak-spomove').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseSpomove.src);
    expect(getFieldRecordCatalogItem('donghaeng-special-pe').thumbnailSrc).toBe(SPOKEDU_IMAGES.home.fieldEditorialCaseAdapted.src);
  });

  it('shows four actual activities, three processing steps and the real typed form', () => {
    const doc = render('spomove');
    expect([...doc.querySelectorAll('#task-examples h3')].map(node => node.textContent)).toEqual(['색상 반응', '방향 반응', '연상 반응', '모션게이트']);
    expect(doc.body.textContent).toContain(PUBLIC_PROGRAM_COPY.spomat);
    expect(doc.querySelectorAll('#task-examples img')).toHaveLength(4);
    expect([...doc.querySelectorAll('.spmi-step')].map(node => node.textContent)).toEqual(['SEE', 'THINK', 'MOVE']);
    for (const href of ['/spomat', '/spomove/catalog', '/spokedu-lab?view=landing']) expect(doc.querySelector(`a[href="${href}"]`)).not.toBeNull();
  });

  it('renders only SPOMOVE cases returned by the existing public-case resolver', async () => {
    const cards = legacyRecordCards();
    vi.mocked(listPublicRecordCards).mockResolvedValueOnce(cards);
    const populated = renderToStaticMarkup(await SpomoveServerPage());
    expect(populated).toContain('data-record-slug="dongjak-spomove"');
    expect(populated).not.toContain('data-record-slug="maedong-sports-stepup"');
    vi.mocked(listPublicRecordCards).mockResolvedValueOnce([]);
    const unpublished = renderToStaticMarkup(await SpomoveServerPage());
    expect(unpublished).not.toContain('data-record-slug=');
    expect(unpublished).toContain('공개된 SPOMOVE 현장 사례를 준비하고 있습니다.');
  });

  it('shows only published EDUCATION cases and never restores a removed CMS image', async () => {
    const cards = legacyRecordCards();
    vi.mocked(listPublicRecordCards).mockResolvedValueOnce(cards);
    expect(renderToStaticMarkup(await EducationServerPage())).toContain('data-record-slug="dongjak-spomove"');
    vi.mocked(listPublicRecordCards).mockResolvedValueOnce(cards.filter(record => record.slug !== 'dongjak-spomove'));
    expect(renderToStaticMarkup(await EducationServerPage())).not.toContain('data-record-slug="dongjak-spomove"');
    vi.mocked(listPublicRecordCards).mockResolvedValueOnce([]);
    const empty = renderToStaticMarkup(await EducationServerPage());
    expect(empty).not.toContain('data-record-slug=');
    expect(empty).toContain('공개된 기관 수업 사례를 준비하고 있습니다.');
    const withoutPhoto = cards.filter(record => record.slug === 'dongjak-spomove').map(record => ({ ...record, thumbnailSrc: undefined }));
    const window = new Window();
    windows.push(window);
    window.document.body.innerHTML = renderToStaticMarkup(createElement(EducationContent, { stories: withoutPhoto }));
    expect(window.document.querySelector('[data-record-slug="dongjak-spomove"] img')).toBeNull();
    expect(window.document.querySelectorAll('#inquiry')).toHaveLength(1);
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
