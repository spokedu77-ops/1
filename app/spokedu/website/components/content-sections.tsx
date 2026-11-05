import Image from 'next/image';
import Link from 'next/link';
import { educationHubPage as education } from '../../data/education-hub';
import { aboutPage } from '../../data/about-page';
import { aboutFounder } from '../../data/about-founder';
import { privatePage } from '../../data/private-page';
import { educationPrograms } from '../data/education';
import { PUBLIC_METRICS, PUBLIC_OPERATING_METRICS } from '../../data/marketing-public-metrics';
import { PUBLIC_PROGRAM_COPY } from '../../data/public-brand-copy';
import { WebsiteIcon } from './WebsiteIcon';
import { ConsultationLink } from './ConsultationLink';

export function PageCTA({ page }: { page: 'home' | 'education' | 'private' | 'about' | 'spomove' }) {
  const actions = {
    home: { title: '지금, 우리 학교와 아이를 위한 최고의 스포츠 교육을 만나보세요.', description: '대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.', href: '/contact', label: '수업 상담하기', secondary: { href: '/records', label: '실제 수업사례 보기' } },
    education: { title: '우리 학교·기관에 들어맞는 스포츠 교육을 설계해보세요', description: education.hero.lead, href: '/contact?type=dispatch', label: '기관 수업 상담하기', secondary: { href: '/records', label: '실제 학교 운영 사례 확인' } },
    private: { title: '지금 우리 아이에게 꼭 맞는 전담 코치님을 만나보세요', description: privatePage.finalCta.description, href: '/contact?type=private', label: '아이 조건으로 수업 방향 상담하기', secondary: undefined },
    about: { title: aboutPage.closing.tagline, description: aboutPage.intro.body, href: '/contact', label: '문의·상담하기', secondary: { href: '/education', label: '수업 유형 살펴보기' } },
    spomove: { title: 'SPOMOVE를 학교와 교육 현장에 도입하세요', description: PUBLIC_PROGRAM_COPY.spomove, href: '/contact?type=spomove', label: 'SPOMOVE 도입 상담하기', secondary: { href: '/contact?type=other', label: '라이선스·협업 문의' } },
  };
  const action = actions[page];
  const layouts = {
    home: { section: 'w-full py-16 lg:py-24 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary py-16 lg:py-20 px-8 text-center shadow-[0_20px_50px_rgba(37,99,235,0.25)]', heading: 'font-headline-lg text-headline-lg lg:text-display-hero text-on-primary font-extrabold leading-tight' },
    private: { section: 'w-full bg-surface py-20 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 lg:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-extrabold text-on-primary-container tracking-tight' },
    education: { section: 'w-full bg-surface-container-lowest py-20 lg:py-24', rail: 'max-w-7xl mx-auto px-6 lg:px-12', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 lg:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-bold text-white tracking-tight leading-snug' },
    about: { section: 'w-full bg-surface-container-lowest pb-24 lg:pb-32', rail: 'max-w-7xl mx-auto px-6 lg:px-12', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 md:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-bold tracking-tight text-on-primary' },
    spomove: { section: 'w-full bg-surface-container-lowest pb-24 lg:pb-32 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary py-16 lg:py-20 px-8 lg:px-16 text-center shadow-[0_20px_50px_rgba(37,99,235,0.28)] relative overflow-hidden', heading: 'font-headline-lg text-headline-lg lg:text-display-hero text-on-primary font-extrabold tracking-tight leading-snug' },
  };
  const layout = layouts[page];
  return <section id={page === 'home' ? 'next-step' : 'inquiry'} className={layout.section}>
    <div className={layout.rail}><div className={layout.panel}>
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
      <h2 className={`${layout.heading} max-w-3xl mb-6`}>{action.title}</h2>
      <p className="font-body-md text-body-md text-on-primary-container max-w-xl mx-auto mb-10 leading-relaxed">{action.description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
        <ConsultationLink className="w-full sm:w-auto bg-surface-container-lowest text-primary font-label-md text-label-md font-bold px-8 py-4 rounded-full hover:bg-surface-container-low transition-all shadow-lg flex items-center justify-center gap-2" href={action.href}>{action.label}<WebsiteIcon name="arrow_forward" /></ConsultationLink>
        {action.secondary && <Link className="w-full sm:w-auto border border-on-primary/60 text-on-primary font-label-md text-label-md font-semibold px-8 py-4 rounded-full hover:bg-on-primary/10 transition-all flex items-center justify-center" href={action.secondary.href}>{action.secondary.label}</Link>}
      </div>
      </div>
    </div></div>
  </section>;
}

export function OperatingMetrics({ about = false }: { about?: boolean }) {
  const metrics = about
    ? [{ value: '2020', label: 'SPOKEDU 설립' }, PUBLIC_METRICS.institutions, PUBLIC_METRICS.instructors, PUBLIC_METRICS.renewal]
    : PUBLIC_OPERATING_METRICS;
  return <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-center" aria-label="SPOKEDU 공식 운영 실적">
    {metrics.map(metric => {
      const suffix = /[+%]$/.exec(metric.value)?.[0] ?? '';
      return <div key={metric.label} className="flex flex-col items-center">
        <dt className="font-body-sm text-body-sm font-medium text-on-surface-variant mt-2 order-2">{metric.label}</dt>
        <dd className="font-display-metric text-display-hero-mobile sm:text-display-metric-mobile xl:text-display-metric text-on-surface font-extrabold flex items-baseline"><span>{suffix ? metric.value.slice(0, -1) : metric.value}</span><span className="text-primary-container">{suffix}</span></dd>
      </div>;
    })}
  </dl>;
}

export function PrivateSummary() {
  return <dl className="web-private-summary">{privatePage.trustMetrics.items.map(item => <div key={item.id}><dt>{item.value}</dt><dd>{item.label}</dd></div>)}</dl>;
}

export function EducationPrograms() {
  return <div className="web-card-grid">{educationPrograms.map(program => <article className="web-program-card" key={program.id}>
    <Image unoptimized src={program.image} alt={`${program.name} 수업 현장`} loading="lazy" width={720} height={480} />
    <div className="web-program-body"><span className="web-tag">{program.use.join(' · ')}</span><h3>{program.name}</h3><p>{program.description}</p>
      <details><summary>활동과 운영 대상</summary><p>{program.details.intro}</p><p>{program.details.recommendedFor.join(' · ')}</p><ul>{program.details.activities.map(activity => <li key={activity}>{activity}</li>)}</ul></details>
      <ConsultationLink className="web-text-link" href={`/contact?type=dispatch&program=${program.id}`}>기관 수업 상담 →</ConsultationLink>
    </div>
  </article>)}</div>;
}

export function AboutPeople() {
  return <div className="web-card-grid">{aboutPage.team.members.map(person => <article className="web-person-card" key={person.id}>
    <Image unoptimized src={person.photo} alt={`${person.name} ${person.role}`} style={{ objectPosition: person.photoObjectPosition }} loading="lazy" width={600} height={750} />
    <div><p className="web-eyebrow">{person.role}</p><h3>{person.name}</h3><ul>{person.credentials.map(credential => <li key={credential}>{credential}</li>)}</ul>{person.id === 'choi' && <details><summary>대표 약력</summary><ul>{aboutFounder.credentials.map(item => <li key={item}>{item}</li>)}</ul></details>}</div>
  </article>)}</div>;
}
