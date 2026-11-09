import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, LockKeyhole } from 'lucide-react';
import { legacyRecordCards, type RecordCard } from '@/app/lib/field-records/cards';
import { MIGRATED_RECORD_SLUGS } from '@/app/lib/field-records/contract';
import { HomeStructuredData } from '../../components/home-structured-data';
import { HeroBadge } from '../components/HeroBadge';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';

import { CaseCard } from '../components/shared';
import { OperatingMetrics } from '../components/content-sections';
import { homeRefinement } from '../data/home';
import '../styles/home-refinement.css';

export default function HomePage({ stories = MIGRATED_RECORD_SLUGS.flatMap(slug => legacyRecordCards().filter(item => item.slug === slug)) }: { stories?: RecordCard[] } = {}) {
  return <main id="main-content" className="website-page web-stitch web-home home-v2">
    <HomeStructuredData heroSrc={homeRefinement.hero.src} />
    <div className="flex flex-col w-full">
      <section id="brand" className="home-v2-hero">
        <div className="home-v2-container home-v2-hero-content">
          <HeroBadge>체육교육 전문 솔루션</HeroBadge>
          <h1 className="web-home-headline"><span>아이와 현장의 조건에 맞춰</span><span>움직이고 싶게 만드는</span><span>체육수업을 설계합니다.</span></h1>
          <p className="home-v2-lead">{homeRefinement.lead}</p>
          <div className="home-v2-actions"><Link className="home-v2-button" href={paths.contact}>수업 상담하기<ArrowRight size={18} aria-hidden /></Link><Link className="home-v2-button home-v2-secondary" href={paths.education}>수업 유형 살펴보기</Link></div>
          <figure className="home-v2-hero-frame"><div className="home-v2-hero-photo">
            <Image unoptimized loading="eager" src={homeRefinement.hero.src} alt={homeRefinement.hero.alt} width={2400} height={1800} fetchPriority="high" />
            <figcaption className="home-v2-hero-overlay"><div className="home-v2-field-badge"><strong>SPOKEDU FIELD</strong><span>학교·기관에서 직접 운영하는 체육수업</span></div><span className="home-v2-verified"><BadgeCheck size={18} aria-hidden />실제 현장 수업</span></figcaption>
          </div></figure>
        </div>
      </section>
      <section id="service-paths" className="home-v2-services"><div className="home-v2-container">
        <div className="home-v2-section-heading"><p className="home-v2-eyebrow">OUR SERVICES</p><h2>무엇을 찾고 계신가요?</h2><p>교육 대상과 이용 목적에 맞는 SPOKEDU의 서비스를 확인해 보세요.</p></div>
        <div className="web-home-service-grid">{homeRefinement.services.map(service => <article className="web-home-service-card" key={service.title}>
          <span className="home-v2-pill">{service.label}</span><h3>{service.title}</h3><p>{service.body}</p><Link className="home-v2-link" href={service.href}>{service.action}<ArrowRight size={18} aria-hidden /></Link>
        </article>)}</div>
        <div className="home-v2-spomove"><div><p className="home-v2-pill">SPOKEDU 자체 개발 프로그램</p><div className="home-v2-spomove-title"><h3>SPOMOVE</h3><strong>시지각·인지·운동을 연결하는 움직임 교육</strong></div><p>화면에 제시되는 시각정보를 인식하고 적절한 반응을 선택해 신체 움직임으로 수행하는 SPOKEDU의 자체 개발 교육 프로그램입니다.</p></div><Link href={paths.spomove} className="home-v2-button">SPOMOVE 프로그램 상세 보기<ArrowRight size={18} aria-hidden /></Link></div>
      </div></section>
      <section id="showcase" className="home-v2-showcases"><div className="home-v2-container">
        {homeRefinement.showcases.map((item, i) => <article className={`home-v2-showcase home-v2-showcase-${i + 1}`} key={item.number}>
          <div className="web-home-showcase-copy"><span className="home-v2-number" aria-hidden="true">{item.number}</span><div className="home-v2-showcase-text"><span className="home-v2-pill">{item.label}</span><h2><span>{item.title[0]}</span><span>{item.title[1]}</span></h2><p>{item.body}</p><div className="web-home-showcase-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><Link className="home-v2-link" href={item.href}>{item.action}<ArrowRight size={18} aria-hidden /></Link></div></div>
          <figure className={i === 2 ? 'home-v2-lab-frame' : 'home-v2-showcase-photo'}>
            {i === 2 && <div className="home-v2-browser"><span className="home-v2-browser-dots" aria-hidden="true"><i /><i /><i /></span><span><LockKeyhole size={12} aria-hidden />SPOKEDU LAB</span><span className="home-v2-pill">지도자 전용</span></div>}
            <Image unoptimized src={item.photo.src} alt={item.photo.alt} loading="lazy" width={i === 2 ? 1536 : 900} height={i === 2 ? 1004 : 1200} />
            {i < 2 && <><span className="home-v2-photo-badge">{i === 0 ? '실제 체육수업 현장' : '시지각 움직임·맞춤형 체육'}</span><figcaption className="home-v2-photo-caption"><span><BadgeCheck size={18} aria-hidden />{i === 0 ? '교구를 활용한 움직임·민첩성 놀이체육' : '참여 수준에 맞춰 조정하는 실제 수업'}</span><small>FIELD RECORD #{item.number}</small></figcaption></>}
          </figure>
        </article>)}
      </div></section>
      <section id="field-stories" className="w-full bg-surface py-20 lg:py-28 web-home-proof">
        <div className="home-v2-container">
          <div id="operating-metrics"><OperatingMetrics /></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 web-home-proof-heading">
            <div><p className="font-label-sm text-label-sm text-primary font-bold mb-2">SPOKEDU 현장 기록</p><h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">다양한 교육 현장에서 이어온 SPOKEDU의 수업</h2></div>
            <Link className="text-primary-container font-label-md text-label-md" href={paths.records}>수업 사례 전체 보기 →</Link>
          </div>
          <div className="web-home-cases">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{stories.map(record => <CaseCard key={record.slug} record={record} />)}</div>
          </div>
        </div>
      </section>
      <section id="next-step" className="home-v2-final"><div className="home-v2-container"><div className="home-v2-final-panel"><h2><span>지금, 우리 학교와 아이를 위한</span><span>최고의 스포츠 교육을 만나보세요.</span></h2><p>대상 연령과 참여 인원, 수업 공간과 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.</p><div className="home-v2-actions"><Link className="home-v2-button" href={paths.contact}>수업 상담하기<ArrowRight size={18} aria-hidden /></Link><Link className="home-v2-button home-v2-secondary" href={paths.records}>전체 수업 사례 보기</Link></div></div></div></section>
    </div>
  </main>;
}
