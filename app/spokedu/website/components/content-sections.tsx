import { aboutPage } from '../../data/about-page';
import Link from 'next/link';
import { AboutPeopleCards } from './AboutPeopleCards';
import { privatePage } from '../../data/private-page';
export { EducationPrograms } from './EducationPrograms';
import { PUBLIC_METRICS, PUBLIC_OPERATING_METRICS } from '../../data/marketing-public-metrics';
import { PUBLIC_PROGRAM_COPY } from '../../data/public-brand-copy';
import { WebsiteIcon } from './WebsiteIcon';
import { ConsultationLink } from './ConsultationLink';

export function PageCTA({ page }: { page: 'home' | 'education' | 'private' | 'about' | 'spomove' }) {
  const actions = {
    home: { title: '아이의 움직임과 성장에 맞는 체육교육을 함께 설계합니다.', description: '교육 대상과 수업 환경을 고려해 적합한 프로그램과 운영 방식을 제안합니다.', href: '/contact', label: '수업 상담하기', secondary: { href: '/records', label: '전체 수업 사례 보기' } },
    education: { title: '우리 기관에서 가능한 수업을 구체적으로 상담해 보세요.', description: '대상·인원·공간·희망 일정을 알려주시면 적합한 프로그램과 운영 범위를 안내합니다.', href: '#inquiry', label: '기관 수업 문의 작성', secondary: { href: '#program-grid', label: '프로그램 다시 살펴보기' } },
    private: { title: '지금 우리 아이에게 꼭 맞는 전담 코치님을 만나보세요', description: privatePage.finalCta.description, href: '/contact?type=private', label: '아이 조건으로 수업 방향 상담하기', secondary: undefined },
    about: { ...aboutPage.classGuide, title: aboutPage.classGuide.titleLines.join(' ') },
    spomove: { title: 'SPOMOVE를 학교와 교육 현장에 도입하세요', description: PUBLIC_PROGRAM_COPY.spomove, href: '/contact?type=spomove', label: 'SPOMOVE 도입 상담하기', secondary: { href: '/contact?type=other', label: '라이선스·협업 문의' } },
  };
  const action = actions[page];
  const layouts = {
    home: { section: 'w-full py-16 lg:py-24 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary py-16 lg:py-20 px-8 text-center shadow-[0_20px_50px_rgba(37,99,235,0.25)]', heading: 'font-headline-lg text-headline-lg lg:text-display-hero text-on-primary font-extrabold leading-tight' },
    private: { section: 'w-full bg-surface py-20 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 lg:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-extrabold text-on-primary-container tracking-tight' },
    education: { section: 'w-full bg-surface-container-lowest pt-16 pb-12 lg:pt-20 lg:pb-16', rail: 'max-w-7xl mx-auto px-6 lg:px-12', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 lg:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-bold text-white tracking-tight leading-snug' },
    about: { section: 'w-full bg-surface-container-lowest pb-24 lg:pb-32', rail: 'max-w-7xl mx-auto px-6 lg:px-12', panel: 'rounded-3xl bg-primary-container text-on-primary-container py-16 px-8 md:px-16 text-center shadow-xl relative overflow-hidden', heading: 'font-headline-lg text-headline-lg font-bold tracking-tight text-on-primary' },
    spomove: { section: 'w-full bg-surface-container-lowest pb-24 lg:pb-32 px-6 lg:px-12', rail: 'max-w-7xl mx-auto', panel: 'rounded-3xl bg-primary-container text-on-primary py-16 lg:py-20 px-8 lg:px-16 text-center shadow-[0_20px_50px_rgba(37,99,235,0.28)] relative overflow-hidden', heading: 'font-headline-lg text-headline-lg lg:text-display-hero text-on-primary font-extrabold tracking-tight leading-snug' },
  };
  const layout = layouts[page];
  return <section id={page === 'home' ? 'next-step' : page === 'education' ? 'inquiry-intro' : 'inquiry'} className={`${layout.section}${page === 'about' ? ' web-about-class-guide' : ''}`}>
    <div className={layout.rail}><div className={layout.panel}>
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
      <h2 className={`${layout.heading} max-w-3xl mb-6`}>{page === 'home' ? <><span>아이의 움직임과 성장에 맞는</span><span>체육교육을 함께 설계합니다.</span></> : page === 'about' ? <>{aboutPage.classGuide.titleLines.map(line => <span className="web-about-cta-title-line" key={line}>{line}</span>)}</> : page === 'education' ? <>우리 기관에서 가능한 수업을<br />구체적으로 상담해 보세요.</> : action.title}</h2>
      <p className={`font-body-md text-body-md text-on-primary-container max-w-xl mx-auto mb-10 leading-relaxed${page === 'about' || page === 'education' ? ' whitespace-pre-line' : ''}`}>{action.description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
        {page === 'about' ? <Link className="w-full sm:w-auto bg-surface-container-lowest text-primary font-label-md text-label-md font-bold px-8 py-4 rounded-full hover:bg-surface-container-low transition-all shadow-lg flex items-center justify-center gap-2" href={action.href}>{action.label}<WebsiteIcon name="arrow_forward" /></Link> : page === 'education' ? <a className="w-full sm:w-auto bg-surface-container-lowest text-primary font-label-md text-label-md font-bold px-8 py-4 rounded-full hover:bg-surface-container-low transition-all shadow-lg flex items-center justify-center gap-2" href="#inquiry">{action.label}<WebsiteIcon name="arrow_forward" /></a> : <ConsultationLink className="w-full sm:w-auto bg-surface-container-lowest text-primary font-label-md text-label-md font-bold px-8 py-4 rounded-full hover:bg-surface-container-low transition-all shadow-lg flex items-center justify-center gap-2" href={action.href}>{action.label}<WebsiteIcon name="arrow_forward" /></ConsultationLink>}
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

export function AboutPeople() {
  return <AboutPeopleCards />;
}
