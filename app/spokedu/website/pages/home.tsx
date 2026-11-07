import Image from 'next/image';
import Link from 'next/link';
import { getFieldRecordCatalogItem } from '../../data/field-records-catalog';
import { HomeStructuredData } from '../../components/home-structured-data';
import { PUBLIC_LEADERSHIP_INTRO } from '../../data/public-brand-copy';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';
import { SPOKEDU_IMAGES } from '../../data/images';
import { ActionLink, SectionHeading, CaseCard } from '../components/shared';
import { OperatingMetrics, PageCTA } from '../components/content-sections';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { homeRefinement } from '../data/home';
import '../styles/home-refinement.css';

export default function HomePage() {
  const stories = (['maedong-sports-stepup', 'dongjak-spomove', 'donghaeng-special-pe'] as const).map(slug => {
    const record = getFieldRecordCatalogItem(slug);
    return { ...record, trackLabel: record.recordsTrackLabel };
  });
  return <main id="main-content" className="website-page web-stitch web-home w-full bg-surface">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <div className="flex flex-col w-full">
      <section id="brand" className="w-full bg-surface-container-lowest py-20 lg:py-32 flex flex-col items-center justify-center web-home-hero">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full text-center flex flex-col items-center">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-primary font-label-md text-label-md mb-8"><span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />{PUBLIC_LEADERSHIP_INTRO}</p>
          <h1 className="font-display-hero text-headline-lg lg:text-display-hero text-on-surface font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-8 web-home-headline"><span>아이와 현장의 조건에 맞춰</span><span className="text-primary-container">움직이고 싶게 만드는</span><span>체육수업을 설계합니다.</span></h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">{homeRefinement.lead}</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 lg:mb-20">
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2" href={paths.contact}>수업 상담하기<WebsiteIcon name="arrow_forward" /></Link>
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-all flex items-center justify-center" href={paths.education}>수업 유형 살펴보기</Link>
          </div>
          <figure className="w-full max-w-5xl rounded-3xl bg-surface-container-lowest shadow-[0_20px_50px_rgba(19,27,46,0.06)] overflow-hidden">
            <div className="relative w-full aspect-[16/9] lg:aspect-[21/10] overflow-hidden bg-surface-container-low">
              <Image unoptimized loading="eager" className="w-full h-full object-cover" src={homeRefinement.hero.src} alt={homeRefinement.hero.alt} width={2400} height={1800} fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
              <figcaption className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-12 lg:right-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-sm text-label-sm font-bold shadow-sm">SPOKEDU</span>
                  <span className="text-on-surface font-body-sm text-body-sm font-medium">학교·기관에서 직접 운영하는 SPOKEDU 체육수업</span>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-primary font-label-sm text-label-sm font-bold bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">프로그램·운영 안내<WebsiteIcon name="verified" /></span>
              </figcaption>
            </div>
          </figure>
        </div>
      </section>
      <section id="service-paths" className="web-home-services w-full bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="web-home-services-heading">
            <p className="font-label-sm text-label-sm text-primary font-bold">OUR SERVICES</p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">무엇을 찾고 계신가요?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">교육 대상과 운영 목적에 맞는 SPOKEDU 서비스를 확인해 보세요.</p>
          </div>
          <div className="web-home-service-grid">{homeRefinement.services.map(service => <article className="web-home-service-card" key={service.title}>
            <div className="web-home-service-heading">
              <div className="web-home-service-icon"><WebsiteIcon name={service.icon} /></div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{service.label}</p>
            </div>
            <h3 className="font-headline-sm text-on-surface font-bold">{service.title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{service.body}</p>
            <Link className="text-primary-container font-label-md text-label-md" href={service.href}>{service.action}<WebsiteIcon name="arrow_forward" /></Link>
          </article>)}</div>
        </div>
      </section>
      <section id="showcase" className="w-full bg-surface-container-low py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-24 lg:space-y-32">
          {homeRefinement.showcases.map((item, i) => <article className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center" key={item.number}>
            <div className={`lg:col-span-5 web-home-showcase-copy${i === 1 ? ' lg:order-2' : ''}`}>
              <span className="font-watermark-number text-watermark-number text-primary-fixed font-black select-none block" aria-hidden="true">{item.number}</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{item.title[0]}<br /><span className="text-primary-container">{item.title[1]}</span></h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{item.body}</p>
              <div className="flex flex-wrap gap-2 web-home-showcase-tags">{item.tags.map(tag => <span key={tag} className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>)}</div>
              <div><Link className="inline-flex items-center gap-2 text-primary-container font-label-md text-label-md hover:underline" href={item.href}>{item.action}<WebsiteIcon name="arrow_forward" /></Link></div>
            </div>
            <figure className={`lg:col-span-7${i === 1 ? ' lg:order-1' : ''}`}>
              <div className={`relative w-full aspect-[4/3] rounded-3xl${i === 2 ? ' web-home-lab-frame' : ''} overflow-hidden bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)]`}>
                <Image unoptimized className={`w-full ${i === 2 ? 'web-home-lab-image' : 'h-full object-cover'}`} src={item.photo.src} alt={item.photo.alt} loading="lazy" width={i === 2 ? 1536 : 900} height={i === 2 ? 1004 : 1200} />
              </div>
            </figure>
          </article>)}
        </div>
      </section>
    <section id="spomove-experience" className="web-spomove-experience w-full py-24 lg:py-32"><div className="max-w-7xl mx-auto px-6 lg:px-12">
      <SectionHeading eyebrow="SPOMOVE EXPERIENCE" title={<><span>화면의 시각 자극이</span><span>실제 움직임으로 이어지는 체육활동</span></>}>SPOMOVE는 화면에 제시되는 시각정보와 과제를 인지하고 판단한 뒤 신체 움직임으로 반응하는 프로그램입니다. 과제에 따라 4색 매트 SPOMAT을 활용할 수 있으며 지도자는 참여자의 수행 수준에 맞춰 활동을 조정합니다.</SectionHeading>
      <div className="web-spomove-experience-media">
        <figure><div className="web-spomove-experience-image"><Image src={SPOKEDU_IMAGES.programs.spomoveScreenDirection.src} alt={SPOKEDU_IMAGES.programs.spomoveScreenDirection.alt} fill unoptimized sizes="(max-width:767px) 100vw, 50vw" /></div><figcaption>실행 화면 예시 · 4색 배치와 방향별 시각 자극</figcaption></figure>
        <figure><div className="web-spomove-experience-image"><Image src={SPOKEDU_IMAGES.programs.spomoveClassConnected.src} alt={SPOKEDU_IMAGES.programs.spomoveClassConnected.alt} fill unoptimized sizes="(max-width:767px) 100vw, 50vw" /></div><figcaption>별도 수업 사례 · 화면의 이미지 과제를 보며 움직이는 아동과 지도자</figcaption></figure>
      </div>
      <ol className="web-spomove-experience-process">{homeRefinement.spomoveSteps.map(step => <li key={step.label}><span className="web-spomove-step-label">{step.number} {step.label}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
      <p className="web-spomove-experience-note">SPOMAT을 활용하는 과제에서는 색상에 대응하는 위치 이동과 스텝 등을 수행할 수 있습니다. SPOMAT은 전자 센서나 압력 감지 기능이 없는 물리적 4색 매트입니다.</p>
      <div className="web-actions"><ActionLink href={paths.spomove}>SPOMOVE 자세히 보기</ActionLink><ActionLink href={paths.spomoveCatalog} secondary>프로그램 카탈로그 보기</ActionLink></div>
      <Link className="web-text-link" href={paths.spomat}>SPOMAT 알아보기 →</Link>
    </div></section>
      <section id="field-stories" className="w-full bg-surface py-20 lg:py-28 web-home-proof">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div id="operating-metrics"><OperatingMetrics /></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 web-home-proof-heading">
            <div><p className="font-label-sm text-label-sm text-primary font-bold mb-2">FIELD HIGHLIGHTS &amp; STORIES</p><h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">현장에서 운영한 수업 사례</h2></div>
            <Link className="text-primary-container font-label-md text-label-md" href={paths.records}>수업 사례 전체 보기 →</Link>
          </div>
          <div className="web-home-cases">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{stories.map(record => <CaseCard key={record.slug} record={record} />)}</div>
          </div>
        </div>
      </section>
      <PageCTA page="home" />
    </div>
  </main>;
}
