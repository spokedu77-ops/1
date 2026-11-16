import { aboutPage } from '../../data/about-page';
import { HeroBadge } from '../components/HeroBadge';
import { AboutShowcase } from '../components/AboutShowcase';
import { AboutPeople } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';

export default function AboutPage() {
  return (<main className="website-page web-stitch web-about-page w-full  bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
<HeroBadge>{aboutPage.intro.eyebrow}</HeroBadge>
<h1 className="web-about-hero-title font-display-hero text-display-hero text-on-surface tracking-tight mb-8"><span>{aboutPage.intro.titleLines[0]}</span><span className="text-primary-container">{aboutPage.intro.titleLines[1]}</span></h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl leading-relaxed">{aboutPage.intro.body}</p>
</div>
</section>

<AboutShowcase />

<section className="web-about-team w-full bg-surface-container-lowest" id="team">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
<div>
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold mb-4">
<span>{aboutPage.team.eyebrow}</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">{aboutPage.team.title}</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">{aboutPage.team.description}</p>
</div>
</div>
<AboutPeople />
</div>
</section>

<PageCTA page="about" />
</div></main>);
}
