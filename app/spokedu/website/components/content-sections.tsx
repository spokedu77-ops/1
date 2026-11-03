import Link from 'next/link';
import { educationHubPage as education } from '../../data/education-hub';
import { aboutPage } from '../../data/about-page';
import { aboutFounder } from '../../data/about-founder';
import { aboutHistory } from '../../data/about-history';
import { privatePage } from '../../data/private-page';
import { educationPrograms } from '../data/education';
import { buildRecordsHeroSummary } from '../../data/field-records-catalog';
import { Section, SectionHeading, CaseCard, CTASection } from './shared';
import { spomoveProgramPage } from '../../data/spomove-program-page';
import { recordsPage } from '../../data/records-page';
import { MapPin, Users, HeartHandshake, CalendarDays } from 'lucide-react';

const conditionIcons = [MapPin, Users, HeartHandshake, CalendarDays];

export function PageCTA({ page }: { page: 'education' | 'private' | 'about' | 'spomove' }) {
  const actions = {
    education: { title: <>우리 학교·기관에 완벽히 들어맞는<br />스포츠 교육을 지금 바로 설계해보세요</>, description: education.hero.lead, href: '/contact?type=dispatch', label: '수업 상담하기', secondary: { href: '/records', label: '실제 학교 운영 사례 확인' } },
    private: { title: '지금 우리 아이에게 꼭 맞는 전담 코치님을 만나보세요', description: privatePage.finalCta.description, href: '/contact?type=private', label: '아이 조건으로 수업 방향 상담하기' },
    about: { title: aboutPage.closing.tagline, description: aboutPage.intro.body, href: '/contact', label: '문의·상담하기', secondary: { href: '/education', label: '수업 유형 살펴보기' } },
    spomove: { title: 'SPOMOVE 도입 문의', description: spomoveProgramPage.hero.subtitle, href: '/contact?type=spomove', label: 'SPOMOVE 도입 상담하기', secondary: { href: '/contact?type=other', label: '라이선스·협업 문의' } },
  };
  return <CTASection {...actions[page]} />;
}

export function ClassConditions() {
  return <dl className="web-conditions">{education.fit.items.map((item, i) => { const Icon = conditionIcons[i]; return <div key={item.label}><Icon size={25} aria-hidden="true" /><dt>{item.label}</dt><dd><p>{item.condition.join(' · ')}</p><p>{item.response}</p></dd></div>; })}</dl>;
}

export function PrivateSummary() {
  return <dl className="web-private-summary">{privatePage.trustMetrics.items.map(item => <div key={item.id}><dt>{item.value}</dt><dd>{item.label}</dd></div>)}</dl>;
}

export function EducationPrograms() {
  return <div className="web-card-grid">{educationPrograms.map(program => <article className="web-program-card" key={program.id}>
    <img src={program.image} alt={`${program.name} 수업 현장`} loading="lazy" width={720} height={480} />
    <div className="web-program-body"><span className="web-tag">{program.use.join(' · ')}</span><h3>{program.name}</h3><p>{program.description}</p>
    <details><summary>활동과 운영 대상</summary><p>{program.details.intro}</p><p>{program.details.recommendedFor.join(' · ')}</p><ul>{program.details.activities.map(activity => <li key={activity}>{activity}</li>)}</ul></details>
    <Link className="web-text-link" href={`/contact?type=dispatch&program=${program.id}`}>기관 수업 상담 →</Link></div>
  </article>)}</div>;
}

export function EducationDetails() {
  return <div className="web-education-details" id="institution-operating-criteria">
    <SectionHeading title={education.comparison.title}>{education.comparison.lead}</SectionHeading>
    <div className="web-comparison" role="region" aria-label="기관 수업 운영 방식 비교" tabIndex={0}><table><thead><tr><th>{education.comparison.axisLabel}</th><th>{education.comparison.ours}</th><th>{education.comparison.theirs}</th></tr></thead><tbody>{education.comparison.rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.spokedu}</td><td>{row.other}</td></tr>)}</tbody></table></div>
    <div className="web-institutions"><h3>{education.fit.title}</h3><p>{education.fit.institutions.join(' · ')}</p><p>{education.fit.smallSpace}</p></div>
    <SectionHeading title={education.operating.title}>{education.operating.lead}</SectionHeading>
    <div className="web-card-grid web-operation-formats">{education.operating.formats.map(format => <article className="web-info-card" key={format.id}><h3>{format.title}</h3><p>{format.body}</p><p>{format.example}</p></article>)}</div>
  </div>;
}

export function EducationFAQ() {
  return <Section tone="web-blue-wash" id="faq"><SectionHeading title={education.faq.title} /><div className="web-faq">{education.faq.items.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></Section>;
}

export function EducationCases() {
  return <Section id="cases"><SectionHeading title={education.cases.title}>{education.cases.lead}</SectionHeading><div className="web-card-grid">{education.cases.cards.map(item => { const record = recordsPage.fieldRecords.find(record => record.slug === item.slug); return record ? <CaseCard record={record} key={record.slug} /> : null; })}</div></Section>;
}

export function PrivatePracticalInfo() {
  return <Section><SectionHeading title={privatePage.classFormat.title}>{privatePage.classFormat.lead}</SectionHeading><div className="web-small-grid web-practical-info">{privatePage.classFormat.locations.map(location => <article key={location.title}><h3>{location.title}</h3><p>{location.description}</p></article>)}</div><SectionHeading title={privatePage.sessionCycles.title}>{privatePage.sessionCycles.lead}</SectionHeading><div className="web-card-grid web-practical-info">{privatePage.sessionCycles.items.map(cycle => <article className="web-info-card" key={cycle.label}><h3>{cycle.label}</h3><p>{cycle.description}</p></article>)}</div><SectionHeading title={privatePage.faq.title} /><div className="web-faq">{privatePage.faq.items.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></Section>;
}

export function AboutPeople() {
  return <div className="web-card-grid">{aboutPage.team.members.map(person => <article className="web-person-card" key={person.id}>
    <img src={person.photo} alt={`${person.name} ${person.role}`} style={{ objectPosition: person.photoObjectPosition }} loading="lazy" width={600} height={750} />
    <div><p className="web-eyebrow">{person.role}</p><h3>{person.name}</h3><ul>{person.credentials.map(credential => <li key={credential}>{credential}</li>)}</ul>{person.id === 'choi' && <details><summary>대표 약력</summary><ul>{aboutFounder.credentials.map(item => <li key={item}>{item}</li>)}</ul></details>}</div>
  </article>)}</div>;
}

export function AboutHistory() {
  return <Section id="history" tone="web-blue-wash"><SectionHeading eyebrow="OUR HISTORY" title={aboutHistory.title}>{aboutHistory.lead}</SectionHeading><div className="web-history">{aboutHistory.periods.map(period => <article key={period.id}><h3>{period.label}</h3><ul>{period.milestones.map((milestone, i) => <li key={`${milestone.date}-${i}`}><time>{milestone.date}</time><p>{milestone.text}</p></li>)}</ul></article>)}</div></Section>;
}

export function AboutFacts() {
  const summary = buildRecordsHeroSummary();
  return <dl className="web-about-facts">{[
    ['2020', 'SPOKEDU 설립'], [String(summary.caseCount), '공개 운영 사례'],
    [String(summary.venueTypeCount), '기관 유형'], [String(summary.operationTypeCount), '운영 방식'],
  ].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function AboutIntroduction() {
  return <Section><SectionHeading eyebrow="SPORTS + KEY + EDUCATION" title="현장에서 시작해 교육의 가능성을 넓힙니다." /><div className="web-about-copy">{aboutFounder.message.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div><div className="web-card-grid web-brand-relations">{aboutPage.whatWeDo.branches.map(branch => <article key={branch.id}><h3>{branch.title}</h3><p>{branch.body}</p>{'links' in branch ? branch.links.map(link => <Link className="web-text-link" key={link.href} href={link.href}>{link.label} →</Link>) : <Link className="web-text-link" href={branch.href}>{branch.title} 안내 →</Link>}</article>)}</div><div className="web-contact-info"><h3>연락처 및 방문 안내</h3><p><a href="tel:01044379294">010-4437-9294</a> · <a href="mailto:spokedu77@gmail.com">spokedu77@gmail.com</a></p><p>방문을 원하시면 먼저 연락해 장소와 일정을 확인해 주세요.</p></div></Section>;
}

export function PrivateSupport() {
  return <Section tone="web-blue-wash" id="private-support"><SectionHeading eyebrow="아이의 속도에 맞춰" title="느린학습자·발달 수준을 고려한 수업"><p>아이의 움직임, 규칙 이해와 참여 속도를 확인해 과제와 진행 방식을 조정합니다. 필요한 지원 범위와 운영 가능 여부는 상담에서 함께 확인합니다.</p></SectionHeading><div className="web-card-grid">{privatePage.classCompare.items.map(item => <article className="web-info-card" key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}<article className="web-info-card"><h3>개별 수행에 맞춘 조정</h3><p>동작의 범위, 규칙의 수, 수행 속도를 나누어 안내합니다. 수업 후 관찰 내용과 다음 수업 방향을 공유합니다.</p></article></div><div className="web-private-curriculum"><SectionHeading title={privatePage.curriculumPrograms.title}>{privatePage.curriculumPrograms.lead}</SectionHeading><div className="web-small-grid">{privatePage.curriculumPrograms.items.map(item => <article key={item.title}><img src={item.img} alt={item.alt} loading="lazy" width={400} height={300} /><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></Section>;
}

export function SpomoveFlow() {
  return <ol className="web-spomove-flow" aria-label="SPOMOVE 활동 흐름">{[
    ['시각 자극 제시', '화면의 색·방향·형태를 봅니다.'],
    ['주의·규칙 이해', '이번 활동에서 지킬 기준을 확인합니다.'],
    ['반응 선택', '규칙에 맞는 반응을 고릅니다.'],
    ['움직임 수행', '선택한 반응을 몸으로 실행합니다.'],
    ['조건 조절', '지도자가 규칙과 수행 조건을 조정합니다.'],
  ].map(([title, body], i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><div><h4>{title}</h4><p>{body}</p></div></li>)}</ol>;
}
