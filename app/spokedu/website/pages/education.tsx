import Image from 'next/image';
import Link from 'next/link';
import { listPublicRecordCards } from '@/app/lib/server/fieldRecords';
import type { RecordCard } from '@/app/lib/field-records/cards';
import { FIELD_RECORD_CATALOG } from '../../data/field-records-catalog';
import { HeroBadge } from '../components/HeroBadge';
import { SPOKEDU_IMAGES } from '../../data/images';
import { educationOperatingSteps } from '../data/education';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { EducationPrograms } from '../components/content-sections';
import { OperatingMetrics } from '../components/content-sections';
import '../styles/education-showcase.css';

export function EducationContent({ stories = [] }: { stories?: RecordCard[] }) {
  const caseLinks = [
    { slug: 'maedong-sports-stepup', context: '늘봄 스포츠 교육', description: '기본 움직임에서 종목별 활동으로 확장한 학교 연계 스포츠 교육 사례' },
    { slug: 'dongjak-spomove', context: 'SPOMOVE 교육', description: '화면의 시각정보를 확인하고 반응을 선택해 움직이는 수업 사례' },
    { slug: 'donghaeng-special-pe', context: '특수·포용 체육', description: '학생별 수행 수준에 맞춰 과제의 규칙과 난이도를 조정한 체육교육 사례' },
  ].flatMap(item => {
    const record = FIELD_RECORD_CATALOG.find(record => record.slug === item.slug);
    const published = stories.find(record => record.slug === item.slug);
    // A withdrawn CMS record or removed photo must never fall back to the catalog.
    return record && published ? [{ ...item, title: published.venue, href: record.href,
      image: published.thumbnailSrc === record.thumbnailSrc ? record.thumbnailSrc : published.thumbnailSrc,
      alt: published.imageAlt || `${published.venue} 체육수업 현장` }] : [];
  });
  return (<main className="website-page web-stitch web-education-page w-full bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest pt-24 pb-20 lg:pt-32 lg:pb-28 relative overflow-hidden">
<div className="web-education-hero-grid max-w-7xl mx-auto px-6 lg:px-12">
<div className="web-education-hero-copy">
<HeroBadge>학교·기관 체육교육</HeroBadge>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight mb-6">
          학교와 기관의 체육교육<br />
<span className="text-primary-container">설계부터 현장 운영까지.</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed mb-6">학교와 기관의 교육 대상과 참여 인원 및 수업 공간을 확인해 활동을 구성합니다. 정기수업부터 방과후·특강·행사와 특수·포용 체육까지 전문 지도자가 현장에서 직접 운영합니다.</p>
<div className="pt-4 flex flex-wrap items-center justify-center gap-4">
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-md" href="#inquiry">기관 수업 문의하기</a>
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" href="#program-grid">
            운영 프로그램 살펴보기
          </a>
</div>
</div>
<figure className="web-education-hero-photo"><Image unoptimized src={SPOKEDU_IMAGES.dispatch.groupClass.src} alt={SPOKEDU_IMAGES.dispatch.groupClass.alt} width={1600} height={1200} priority /></figure>
</div>
</section>

<section id="education-metrics" className="web-education-metrics"><div className="max-w-7xl mx-auto px-6 lg:px-12"><p>SPOKEDU 전체 운영 실적</p><OperatingMetrics /></div></section>

<section className="w-full bg-surface-container-low/70 py-24 relative" id="program-grid">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">OUR PROGRAMS</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">기관의 목적에 맞춰 구성하는 체육수업</h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md">기관의 일정과 참여 대상에 맞춰 운영 형태를 정하고 필요한 프로그램을 조합합니다. 각 프로그램을 선택하면 실제 활동 구성과 운영 방식을 확인할 수 있습니다.</p>
</div>
<EducationPrograms />
<p className="web-education-group-note">아래 구분은 대표적인 운영 예시입니다. 각 프로그램의 운영 형태는 기관 조건에 따라 달라질 수 있습니다.</p>
</div>
</section>

<section className="web-education-process w-full bg-surface-container-lowest py-24 lg:py-32" id="process-showcase">
<div className="max-w-7xl mx-auto px-6 lg:px-12">

<div className="web-education-process-heading"><p className="font-label-sm text-label-sm text-primary font-bold">HOW WE OPERATE</p><h2>수업 준비부터 현장 운영까지</h2><p>기관의 목적과 운영 조건을 확인한 다음 수업을 구성하고 현장 상황에 맞춰 조정합니다. 수업 기록과 결과 공유의 범위는 기관별 협의를 따릅니다.</p></div>
<ol className="web-education-operating-steps">{educationOperatingSteps.map((step, index) => <li key={step.title}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p><p className="web-education-step-keys">{step.keys}</p></li>)}</ol>
</div>
</section>
<section id="field-stories" className="web-education-case-links py-24"><div className="max-w-7xl mx-auto px-6 lg:px-12">
<p className="font-label-sm text-label-sm text-primary font-bold">FIELD RECORDS</p>
<h2 className="font-headline-md text-headline-md text-on-surface font-bold">실제 기관 수업에서 확인하는 운영 방식</h2>
<p className="font-body-md text-body-md text-on-surface-variant">학교와 기관에서 진행한 수업을 통해 프로그램 구성과 참여 방식 그리고 현장 조정 과정을 소개합니다.</p>
{caseLinks.length > 0 ? <ul>{caseLinks.map(item => <li key={item.slug} data-record-slug={item.slug}>
{item.image && <Image unoptimized src={item.image} alt={item.alt} width={720} height={480} loading="lazy" />}
<div className="web-education-case-body"><p className="web-education-case-type">{item.context}</p><h3>{item.title}</h3><p>{item.description}</p>
<Link href={item.href} {...(item.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>사례 자세히 보기<span className="sr-only"> — {item.title}{item.href.startsWith('https://') ? ' (새 창)' : ''}</span><WebsiteIcon name="arrow_forward" /></Link>
</div></li>)}</ul> : <p className="web-education-empty">공개된 기관 수업 사례를 준비하고 있습니다.</p>}
<Link className="web-education-records-link" href="/records">전체 수업 사례 보기<WebsiteIcon name="arrow_forward" /></Link>
</div>
</section>

<div className="web-education-consult"><div className="web-education-consult-grid max-w-7xl mx-auto px-6 lg:px-12">
<div className="web-education-consult-copy"><p className="font-label-sm text-label-sm text-primary font-bold">INQUIRY</p><h2>우리 기관에 맞는 체육수업을<br />함께 구성해 보세요.</h2><p>대상과 일정이 모두 정해지지 않았더라도 현재 계획하고 있는 내용을 남겨주세요. 교육 목적과 운영 조건을 확인한 뒤 안내드립니다.</p><div><h3>상담 전 알려주시면 좋은 내용</h3><p>참여 대상과 인원, 수업 장소, 희망 시기와 운영 형태를 알려주시면 상담에 도움이 됩니다.</p><p>수업 운영 범위와 견적은 기관 조건을 확인한 뒤 협의합니다.</p></div></div>
<InlineConsultForm type="dispatch" educationProgramSelection />
</div></div>
</div></main>);
}

export default async function EducationPage() {
  return <EducationContent stories={await listPublicRecordCards()} />;
}
