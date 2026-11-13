import Image from 'next/image';
import { aboutPage, getAboutHistoryHighlights } from '../../data/about-page';
import '../styles/about-showcase.css';

export function AboutShowcase() {
  return <section id="showcase" className="web-about-showcase w-full bg-surface-container-low py-24 lg:py-32">
    <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28 lg:space-y-36">
      {aboutPage.showcase.map((section, index) => <article key={section.number} className={`web-about-showcase-item web-about-showcase-${section.number}${index === 1 ? ' web-about-showcase-reversed' : ''}`} aria-labelledby={`about-showcase-${section.number}`}>
        <div className="web-about-showcase-copy">
            <p className="web-about-showcase-label font-label-sm text-label-sm text-primary font-bold">{section.label}</p>
            <span className="web-about-showcase-number font-watermark-number text-watermark-number font-black text-primary-fixed select-none block" aria-hidden="true">{section.number}</span>
            <h2 id={`about-showcase-${section.number}`} className="font-headline-lg text-headline-lg text-on-surface leading-tight"><span>{section.title[0]}</span><span className="text-primary-container">{section.title[1]}</span></h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{section.body}</p>

        </div>
        <figure className="web-about-showcase-media">
          <div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
            <Image unoptimized src={section.image.src} alt={section.image.alt} width={index === 1 ? 1280 : 2400} height={index === 1 ? 960 : 1800} sizes="(min-width: 1024px) 55vw, 100vw" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        </figure>
        {section.number === '03' && <ol className="web-about-timeline" aria-label="SPOKEDU 주요 연혁">
          {getAboutHistoryHighlights().map(item => <li key={item.year}>
            <p className="web-about-timeline-year">{item.year}</p>
            <p className="web-about-timeline-description">{item.text}</p>
          </li>)}
        </ol>}
      </article>)}
    </div>
  </section>;
}
