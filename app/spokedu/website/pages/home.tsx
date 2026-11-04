import Link from 'next/link';
import Image from 'next/image';
import { Building2, Users, BookOpen } from 'lucide-react';
import { getFieldRecordCatalogItem } from '../../data/field-records-catalog';
import { HomeStructuredData } from '../../components/home-structured-data';
import { PUBLIC_LEADERSHIP_INTRO } from '../../data/public-brand-copy';
import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';
import { Section, SectionHeading, ActionLink, CaseCard } from '../components/shared';
import { homeRefinement } from '../data/home';
import '../styles/spomove-experience.css';

const audienceIcons = [Building2, Users, BookOpen];

export default function HomePage() {
  const stories = (['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const).map(slug => {
    const record = getFieldRecordCatalogItem(slug);
    return { ...record, trackLabel: record.recordsTrackLabel };
  });

  return <main id="main-content" className="website-page web-home">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <Section id="brand" tone="web-home-hero">
      <p className="web-pill">{PUBLIC_LEADERSHIP_INTRO} <span aria-hidden="true" /></p>
      <h1><span>아이와 현장의 조건에 맞춰</span><span className="web-blue">움직이고 싶게 만드는</span><span>체육수업을 설계합니다.</span></h1>
      <p className="web-hero-lead">전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.</p>
      <div className="web-actions"><ActionLink href={paths.contact}>수업 상담하기</ActionLink><ActionLink href={paths.education} secondary>수업 유형 살펴보기</ActionLink></div>
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
        <div><span className="web-watermark" aria-hidden="true">{showcase.number}</span><h2>{showcase.title[0]}<span className="web-blue">{showcase.title[1]}</span></h2><p>{showcase.body}</p><div className="web-tags">{showcase.tags.map(tag => <span key={tag}>{tag}</span>)}</div><Link className="web-text-link" href={showcase.href}>{showcase.action} →</Link></div>
        <figure className={`web-showcase-photo web-home-showcase-photo-${i + 1}`}><img src={showcase.photo.src} alt={showcase.photo.alt} loading="lazy" width={900} height={1200} style={i === 2 ? { objectFit: 'contain' } : undefined} /></figure>
      </article>)}
    </Section>

    <Section id="spomove-experience" tone="web-spomove-experience">
      <SectionHeading eyebrow="SPOMOVE EXPERIENCE" title="화면의 시각 자극이 실제 움직임으로 이어지는 체육활동">SPOMOVE는 화면에 제시되는 시각정보와 과제를 인지하고 판단한 뒤 신체 움직임으로 반응하는 프로그램입니다. 과제에 따라 4색 매트 SPOMAT을 활용할 수 있으며 지도자는 참여자의 수행 수준에 맞춰 활동을 조정합니다.</SectionHeading>
      <div className="web-spomove-experience-media">
        <figure><div className="web-spomove-experience-image"><Image src={SPOKEDU_IMAGES.programs.spomoveScreenColor.src} alt={SPOKEDU_IMAGES.programs.spomoveScreenColor.alt} fill unoptimized sizes="(max-width:767px) 100vw, 50vw" /></div><figcaption>실행 화면 · 색 반응 과제 예시</figcaption></figure>
        <figure><div className="web-spomove-experience-image"><Image src={SPOKEDU_IMAGES.programs.spomoveClassConnected.src} alt={SPOKEDU_IMAGES.programs.spomoveClassConnected.alt} fill unoptimized sizes="(max-width:767px) 100vw, 50vw" /></div><figcaption>수업 현장 · 화면의 과제를 보고 움직이는 아동과 지도자</figcaption></figure>
      </div>
      <ol className="web-spomove-experience-process">{homeRefinement.spomoveSteps.map(step => <li key={step.label}><span className="web-spomove-step-label">{step.number} {step.label}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
      <p className="web-spomove-experience-note">SPOMAT을 활용하는 과제에서는 색상에 대응하는 위치 이동과 스텝 등을 수행할 수 있습니다. SPOMAT은 전자 센서나 압력 감지 기능이 없는 물리적 4색 매트입니다.</p>
      <div className="web-actions"><ActionLink href={paths.spomove}>SPOMOVE 자세히 보기</ActionLink><ActionLink href={paths.spomoveCatalog} secondary>프로그램 카탈로그 보기</ActionLink></div>
      <Link className="web-text-link" href={paths.spomat}>SPOMAT 알아보기 →</Link>
    </Section>

    <Section id="field-stories" tone="web-home-proof">
      <dl className="web-operating-metrics" aria-label="SPOKEDU 공식 운영 실적">{homeRefinement.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
      <div className="web-home-cases"><div className="web-heading-row"><SectionHeading eyebrow="PROVEN IN THE FIELD" title="현장에서 운영한 수업 사례">학교와 키움센터, 복지관 등 다양한 현장에서 쌓은 경험을 실제 수업 사례로 확인해 보세요.</SectionHeading><Link className="web-text-link" href={paths.records}>수업 사례 전체 보기 →</Link></div><div className="web-card-grid">{stories.map(record => <CaseCard key={record.slug} record={record} />)}</div></div>
    </Section>

    <div className="web-home-final-cta"><Section id="next-step"><div className="web-cta"><h2><span>지금, 우리 학교와 아이를 위한</span><span>최고의 스포츠 교육을 만나보세요.</span></h2><p>대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.</p><div className="web-actions"><ActionLink href={paths.contact}>수업 상담하기</ActionLink><ActionLink href={paths.records} secondary>실제 수업사례 보기</ActionLink></div></div></Section></div>
  </main>;
}
