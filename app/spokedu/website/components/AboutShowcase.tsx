import Image from 'next/image';
import Link from 'next/link';
import { SPOKEDU_IMAGES } from '../../data/images';
import { WebsiteIcon } from './WebsiteIcon';
import '../styles/about-showcase.css';

const sections = [
  {
    number: '01', label: '01. 우리의 시작',
    title: ['아이의 움직임을\n바라보는 시선에서', 'SPOKEDU의 교육은 시작되었습니다.'],
    body: '아이마다 다른 발달과 움직임을 존중하는 교육 철학을 바탕으로 아동·청소년 체육교육의 방향을 만들어왔습니다.',
    keywords: ['#교육철학', '#아동청소년체육', '#움직임의이해'],
    image: SPOKEDU_IMAGES.home.fieldEditorialHero,
    // No rendered company-history destination exists on this page yet.
    cta: null,
  },
  {
    number: '02', label: '02. 우리의 사람들',
    title: ['교육의 전문성을 바탕으로', '현장을 함께 만들어가는 사람들.'],
    body: '연세대학교 체육교육학과 출신 운영진을 중심으로 교육과정 설계부터 지도자 교육과 현장 운영까지 함께 책임집니다.',
    keywords: ['#전문운영진', '#교육과정설계', '#현장운영'],
    image: SPOKEDU_IMAGES.curriculum.instructorTraining,
    cta: { href: '#team', label: 'SPOKEDU 운영진 알아보기' },
  },
  {
    number: '03', label: '03. 우리의 발전',
    title: ['현장의 경험을 축적하고', '우리만의 교육 체계로 발전시킵니다.'],
    body: '현장에서 축적한 경험을 4MOVE 교육과정과 시지각 움직임 프로그램 SPOMOVE, 지도자용 플랫폼 SPOKEDU LAB으로 확장하고 있습니다.',
    keywords: ['#자체교육과정', '#SPOMOVE', '#SPOKEDULAB'],
    image: SPOKEDU_IMAGES.dispatch.groupClass,
    cta: { href: '/spomove', label: 'SPOKEDU의 교육 체계 살펴보기' },
  },
] as const;

export function AboutShowcase() {
  return <section id="showcase" className="web-about-showcase w-full bg-surface-container-low py-24 lg:py-32">
    <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28 lg:space-y-36">
      {sections.map((section, index) => <article key={section.number} className={`web-about-showcase-item${index === 1 ? ' web-about-showcase-reversed' : ''}`} aria-labelledby={`about-showcase-${section.number}`}>
        <div className="web-about-showcase-copy">
            <p className="web-about-showcase-label font-label-sm text-label-sm text-primary font-bold">{section.label}</p>
            <span className="web-about-showcase-number font-watermark-number text-watermark-number font-black text-primary-fixed select-none block" aria-hidden="true">{section.number}</span>
            <h2 id={`about-showcase-${section.number}`} className="font-headline-lg text-headline-lg text-on-surface leading-tight"><span>{section.title[0]}</span><span className="text-primary-container">{section.title[1]}</span></h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{section.body}</p>
            <ul className="web-about-showcase-keywords">{section.keywords.map(keyword => <li key={keyword} className="font-label-sm text-label-sm font-semibold">{keyword}</li>)}</ul>
            {section.cta && <Link className="inline-flex items-center gap-2 font-label-md text-label-md text-primary-container hover:text-primary transition-colors group" href={section.cta.href}>{section.cta.label}<WebsiteIcon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" /></Link>}
        </div>
        <figure className="web-about-showcase-media">
          <div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
            <Image unoptimized src={section.image.src} alt={section.image.alt} width={index === 1 ? 1280 : 2400} height={index === 1 ? 960 : 1800} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            <span className="web-about-showcase-photo-label font-label-sm text-label-sm font-semibold">SPOKEDU</span>
          </div>
        </figure>
      </article>)}
    </div>
  </section>;
}
