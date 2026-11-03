import Link from 'next/link';
import { Building2, Users, BookOpen } from 'lucide-react';
import { recordsPage } from '../../data/records-page';
import { HomeStructuredData } from '../../components/home-structured-data';
import { Section, SectionHeading, ActionLink, CTASection, CaseCard } from '../components/shared';
import { SpomoveFieldPhoto } from '../components/SpomoveVisual';
import { homeRefinement } from '../data/home';

const audienceIcons = [Building2, Users, BookOpen];
const impactMetrics = homeRefinement.metrics.map((metric, index) => ({
  value: index === 2 ? metric.value.replace('명', '') : metric.value,
  label: index === 2 ? '본사 직영 관리 전문 지도자' : index === 3 ? '파트너 기관 재계약률' : metric.label,
}));

export default function HomePage() {
  return <main id="main-content" className="website-page web-home">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <Section tone="web-home-hero">
      <p className="web-pill">SPOKEDU · 아동·청소년 맞춤 체육교육 <span aria-hidden="true" /></p>
      <h1><span>아이와 현장의 조건에 맞춰</span><span className="web-blue">움직이고 싶게 만드는</span><span>체육수업을 설계합니다.</span></h1>
      <p className="web-hero-lead">전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.</p>
      <div className="web-actions"><ActionLink href="/contact">수업 상담하기</ActionLink><ActionLink href="/education" secondary>수업 유형 살펴보기</ActionLink></div>
      <figure className="web-hero-photo"><img src={homeRefinement.hero.src} alt={homeRefinement.hero.alt} width={2400} height={1800} fetchPriority="high" /><figcaption>학교·기관에서 직접 운영하는 SPOKEDU 체육수업</figcaption></figure>
    </Section>

    <Section tone="web-blue-wash web-service-hub" id="service-paths">
      <SectionHeading eyebrow="OUR SERVICES" title="무엇을 찾고 계신가요?">교육 대상과 운영 목적에 맞는 SPOKEDU 서비스를 확인해 보세요.</SectionHeading>
      <div className="web-card-grid">{homeRefinement.audiences.map((audience, i) => {
        const Icon = audienceIcons[i];
        return <Link key={audience.href} href={audience.href} className="web-audience-card">
          <span className="web-audience-icon"><Icon size={27} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className="web-eyebrow">{audience.title}</span><h3>{audience.name}</h3><p>{audience.body}</p><span className="web-text-link">{audience.action} →</span>
        </Link>;
      })}</div>
    </Section>

    <Section tone="web-showcases" id="showcase">
      {homeRefinement.showcases.map((showcase, i) => <article className={`web-showcase${i === 1 ? ' web-showcase-reverse' : ''}`} key={showcase.number}>
        <div><span className="web-watermark" aria-hidden="true">{showcase.number}</span><h2>{i === 2 ? <><span>시지각을 깨우는 <span className="web-blue">SPOMOVE</span> ·</span><span>체계적인 수업 운영 도구</span></> : <>{showcase.title[0]}<span className="web-blue">{showcase.title[1]}</span></>}</h2><p>{showcase.body}</p><div className="web-tags">{showcase.tags.map(tag => <span key={tag}>{tag}</span>)}</div><Link className="web-text-link" href={showcase.href}>{showcase.action} →</Link></div>
        {'photo' in showcase ? <figure className={`web-showcase-photo web-home-showcase-photo-${i + 1}`}><img src={showcase.photo.src} alt={showcase.photo.alt} loading="lazy" width={900} height={1200} /></figure> : <SpomoveFieldPhoto home />}
      </article>)}
    </Section>

    <Section id="operating-scale" tone="web-operating-scale">
      <dl className="web-operating-metrics" aria-label="SPOKEDU 운영 실적">{impactMetrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
    </Section>

    <Section tone="web-blue-wash web-home-cases"><div className="web-heading-row"><SectionHeading eyebrow="FIELD HIGHLIGHTS & STORIES" title="현장에서 운영한 수업 사례" /><Link className="web-text-link" href="/records">수업 사례 전체 보기 →</Link></div><div className="web-card-grid">{['dongjak-spomove', 'yangcheon-paps', 'maedong-sports-stepup'].map(slug => {
      const record = recordsPage.fieldRecords.find(item => item.slug === slug);
      return record ? <CaseCard key={slug} record={{ ...record, thumbnailSrc: homeRefinement.casePhotos[slug] ?? record.thumbnailSrc }} /> : null;
    })}</div></Section>

    <div className="web-home-final-cta"><CTASection title={<><span>지금, 우리 학교와 아이를 위한</span><span>최고의 스포츠 교육을 만나보세요.</span></>} description="대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다." href="/contact" label="수업 상담하기" secondary={{ href: '/records', label: '실제 수업사례 보기' }} /></div>
  </main>;
}
