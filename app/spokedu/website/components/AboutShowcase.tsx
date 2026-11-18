import Image from 'next/image';
import Link from 'next/link';
import { aboutPage, isAboutHubBranchWithLinks } from '../../data/about-page';
import '../styles/about-showcase.css';

export function AboutShowcase() {
  return <div id="showcase" className="web-about-showcase">
    <section id={aboutPage.approach.id} className="web-about-section"><div className="web-about-container">
      <p className="web-about-eyebrow">{aboutPage.approach.eyebrow}</p><h2>{aboutPage.approach.title}</h2>
      <div className="web-about-principles">{aboutPage.approach.principles.map(principle => <article key={principle.title}><h3>{principle.title}</h3><p>{principle.body}</p></article>)}</div>
      <div className="web-about-field-photos">{aboutPage.showcase.slice(0, 2).map(item => <figure key={item.number}><Image unoptimized src={item.image.src} alt={item.image.alt} width={1600} height={1200} loading="lazy" /><figcaption>{item.title.join(' ')}</figcaption></figure>)}</div>
    </div></section>
    <section id={aboutPage.whatWeDo.id} className="web-about-section web-about-system"><div className="web-about-container">
      <p className="web-about-eyebrow">{aboutPage.whatWeDo.eyebrow}</p><h2>{aboutPage.whatWeDo.title}</h2>
      <div className="web-about-branches">{aboutPage.whatWeDo.branches.map(branch => <article key={branch.id}><h3>{branch.title}</h3><p>{branch.body}</p><div className="web-about-branch-links">{isAboutHubBranchWithLinks(branch) ? branch.links.map(link => <Link key={link.href} href={link.href} data-track={link.trackLabel}>{link.label} →</Link>) : <Link href={branch.href} data-track={branch.trackLabel}>{branch.title} 살펴보기 →</Link>}</div></article>)}</div>
    </div></section>
    <section id={aboutPage.history.id} className="web-about-section"><div className="web-about-container">
      <p className="web-about-eyebrow">{aboutPage.history.eyebrow}</p><h2>{aboutPage.history.title}</h2>
      <ol className="web-about-timeline" aria-label="SPOKEDU 주요 연혁">{aboutPage.history.yearGroups.map(group => <li key={group.year} data-history-year={group.year}><p className="web-about-timeline-year">{group.year}</p><div><h3>{group.theme}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></div></li>)}</ol>
    </div></section>
  </div>;
}
