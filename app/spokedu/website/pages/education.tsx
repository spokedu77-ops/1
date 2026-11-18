import Image from 'next/image';
import Link from 'next/link';
import { FIELD_RECORD_CATALOG } from '../../data/field-records-catalog';
import { HeroBadge } from '../components/HeroBadge';
import { SPOKEDU_IMAGES } from '../../data/images';
import { educationOperatingSteps } from '../data/education';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { EducationPrograms } from '../components/content-sections';
import { PageCTA, OperatingMetrics } from '../components/content-sections';
import '../styles/education-showcase.css';

export default function EducationPage() {
  const caseLinks = [
    { slug: 'maedong-sports-stepup', context: '늘봄 스포츠 교육', description: '기본운동기술에서 종목별 스포츠 활동으로 확장한 교육 사례' },
    { slug: 'dongjak-spomove', context: 'SPOMOVE 교육', description: '화면의 시각정보를 활용한 선택반응·움직임 활동 사례' },
    { slug: 'donghaeng-special-pe', context: '특수체육', description: '학생별 수행 수준에 맞춘 과제 조정과 참여 중심 체육교육 사례' },
  ].flatMap(item => {
    const record = FIELD_RECORD_CATALOG.find(record => record.slug === item.slug);
    return record ? [{ ...item, title: record.venue, href: record.href }] : [];
  });
  return (<main className="website-page web-stitch web-education-page w-full bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest pt-24 pb-20 lg:pt-32 lg:pb-28 relative overflow-hidden">
<div className="web-education-hero-grid max-w-7xl mx-auto px-6 lg:px-12">
<div className="web-education-hero-copy">
<HeroBadge>SPOKEDU · 기관 체육교육</HeroBadge>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight mb-6">
          학교와 기관의 체육교육,<br />
<span className="text-primary-container">설계부터 현장 운영까지.</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed mb-6">정기수업과 특강부터 특수체육 및 행사까지 기관의 목적과 수업 환경에 맞춰 직접 구성하고 운영합니다.</p>
<div className="pt-4 flex flex-wrap items-center justify-center gap-4">
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-md" href="#program-grid">프로그램 살펴보기</a>
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" href="#inquiry">
            기관 수업 문의하기
          </a>
</div>
</div>
<figure className="web-education-hero-photo"><Image unoptimized src={SPOKEDU_IMAGES.dispatch.groupClass.src} alt={SPOKEDU_IMAGES.dispatch.groupClass.alt} width={1600} height={1200} priority /><figcaption>학교·기관에서 직접 운영하는 실제 체육수업</figcaption></figure>
</div>
</section>

<section id="education-metrics" className="web-education-metrics"><div className="max-w-7xl mx-auto px-6 lg:px-12"><p>SPOKEDU 전체 운영 실적</p><OperatingMetrics /></div></section>

<section className="w-full bg-surface-container-low/70 py-24 relative" id="program-grid">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">OUR PROGRAMS</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">기관·학교 체육교육 프로그램</h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md">교육 대상과 운영 목적에 맞춰 정기 스포츠 교육부터 시지각 움직임 활동, 특수체육, 행사 프로그램까지 구성합니다.</p>
</div>
<EducationPrograms />
<p className="web-education-group-note">위 구분은 대표적인 운영 예시입니다. 프로그램은 기관의 대상·일정·공간에 따라 다른 운영 형태에서도 조합할 수 있습니다.</p>
</div>
</section>

<section className="web-education-process w-full bg-surface-container-lowest py-24 lg:py-32" id="process-showcase">
<div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28">

<div className="web-education-process-heading"><p className="font-label-sm text-label-sm text-primary font-bold">HOW WE WORK</p><h2>수업 조건부터 현장 운영까지</h2></div>
<ol className="web-education-operating-steps">{educationOperatingSteps.map((step, index) => <li key={step.title}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
<div className="web-education-process-photos">
<figure><Image unoptimized width={1024} height={795} className="web-education-lab-screen" src="/images/spokedu/home/field-editorial/home-master-ui.png" alt="수업 활동 자료를 살펴보고 준비할 때 참고하는 SPOKEDU LAB 콘텐츠 화면 예시" loading="lazy" /><figcaption>수업 준비에 활용하는 실제 콘텐츠 화면</figcaption></figure>
<figure><Image unoptimized width={1600} height={1200} src={SPOKEDU_IMAGES.dispatch.groupClass.src} alt={SPOKEDU_IMAGES.dispatch.groupClass.alt} loading="lazy" /><figcaption>SPOKEDU FIELD</figcaption></figure>
</div>
{caseLinks.length > 0 && <div className="web-education-case-links">
<p className="font-label-sm text-label-sm text-primary font-bold">FIELD RECORDS</p>
<h3 className="font-headline-md text-headline-md text-on-surface font-bold">실제 기관 운영 사례</h3>
<p className="font-body-md text-body-md text-on-surface-variant">학교와 기관에서 진행한 수업의 구성과 지도 방식을 실제 사례로 확인할 수 있습니다.</p>
<ul>{caseLinks.map(item => <li key={item.slug}>
<p className="web-education-case-type">{item.context}</p><h4>{item.title}</h4><p>{item.description}</p>
<Link href={item.href} {...(item.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>사례 자세히 보기<span className="sr-only"> — {item.title}{item.href.startsWith('https://') ? ' (새 창)' : ''}</span><WebsiteIcon name="arrow_forward" /></Link>
</li>)}</ul>
</div>}
</div>
</section>

<PageCTA page="education" />
<InlineConsultForm type="dispatch" educationProgramSelection />
</div></main>);
}
