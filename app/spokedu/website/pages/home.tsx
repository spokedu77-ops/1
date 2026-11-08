import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { legacyRecordCards, type RecordCard } from '@/app/lib/field-records/cards';
import { MIGRATED_RECORD_SLUGS } from '@/app/lib/field-records/contract';
import { HomeStructuredData } from '../../components/home-structured-data';
import { HeroBadge } from '../components/HeroBadge';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';

import { CaseCard } from '../components/shared';
import { OperatingMetrics, PageCTA } from '../components/content-sections';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { homeRefinement } from '../data/home';
import '../styles/home-refinement.css';

export default function HomePage({ stories = MIGRATED_RECORD_SLUGS.flatMap(slug => legacyRecordCards().filter(item => item.slug === slug)) }: { stories?: RecordCard[] } = {}) {
  return <main id="main-content" className="website-page web-stitch web-home w-full bg-surface">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <div className="flex flex-col w-full">
      <section id="brand" className="w-full bg-surface-container-lowest py-20 lg:py-32 flex flex-col items-center justify-center web-home-hero">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full text-center flex flex-col items-center">
          <HeroBadge>SPOKEDU 체육교육</HeroBadge>
          <h1 className="font-display-hero text-headline-lg lg:text-display-hero text-on-surface font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-8 web-home-headline"><span>아이와 현장의 조건에 맞춰</span><span className="text-primary-container">움직이고 싶게 만드는</span><span>체육수업을 설계합니다.</span></h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">{homeRefinement.lead}</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 lg:mb-20">
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2" href={paths.contact}>수업 상담하기<WebsiteIcon name="arrow_forward" /></Link>
            <Link className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-all flex items-center justify-center" href={paths.education}>수업 유형 살펴보기</Link>
          </div>
          <figure className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-lg border border-slate-200/80">
            <div className="relative w-full aspect-[16/9] lg:aspect-[21/10] overflow-hidden bg-surface-container-low">
              <Image unoptimized loading="eager" className="w-full h-full object-cover" src={homeRefinement.hero.src} alt={homeRefinement.hero.alt} width={2400} height={1800} fetchPriority="high" />
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
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs web-home-service-diagram">
          <div className="web-home-service-grid">{homeRefinement.services.map(service => <article className="web-home-service-card" key={service.title}>
            <div className="web-home-service-heading">
              <div className="web-home-service-icon"><WebsiteIcon name={service.icon} /></div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{service.label}</p>
            </div>
            <h3 className="font-headline-sm text-on-surface font-bold">{service.title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{service.body}</p>
            <Link className="text-primary-container font-label-md text-label-md" href={service.href}>{service.action}<WebsiteIcon name="arrow_forward" /></Link>
          </article>)}</div>
          <div className="my-5 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs"><ArrowDown size={18} strokeWidth={1.8} /></span>
          </div>
          <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-6 sm:p-8 flex flex-col items-center text-center gap-6">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-blue-600">SPOKEDU 자체 개발 프로그램</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">SPOMOVE</h3>
              <p className="text-base sm:text-lg font-bold text-slate-800 mt-2">시지각·인지·운동을 연결하는 움직임 교육</p>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl mx-auto leading-relaxed break-keep">화면에 제시되는 시각정보를 인식하고 적절한 움직임을 선택해 수행하는 교육 프로그램입니다.<br />유아부터 청소년까지 다양한 발달 수준과 교육 환경에 맞춰 활용할 수 있습니다.</p>
            </div>
            <Link href={paths.spomove} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-xs shrink-0 transition-colors">SPOMOVE 자세히 보기<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          </div>
        </div>
      </section>
      <section id="showcase" className="w-full bg-surface-container-low py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-24 lg:space-y-32">
          {homeRefinement.showcases.map((item, i) => <article className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center" key={item.number}>
            <div className={`lg:col-span-5 web-home-showcase-copy${i === 1 ? ' lg:order-2' : ''}`}>
              <p className="font-label-sm text-label-sm text-primary font-bold">{item.number}. {item.label}</p>
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
      <section id="field-stories" className="w-full bg-surface py-20 lg:py-28 web-home-proof">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div id="operating-metrics"><OperatingMetrics /></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 web-home-proof-heading">
            <div><p className="font-label-sm text-label-sm text-primary font-bold mb-2">SPOKEDU 현장 기록</p><h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">다양한 교육 현장에서 이어온 SPOKEDU의 수업</h2></div>
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
