import { aboutPage } from '../../data/about-page';
import { HeroBadge } from '../components/HeroBadge';
import { AboutShowcase } from '../components/AboutShowcase';
import { AboutPeople } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';

export default function AboutPage() {
  return (<main className="website-page web-stitch w-full  bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
<HeroBadge>SPOKEDU 소개</HeroBadge>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight max-w-4xl mb-8">아이의 움직임을 이해하는 것에서<br /><span className="text-primary-container">우리의 체육교육은 시작됩니다.</span></h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">아이마다 다른 발달과 움직임을 고려해<br />체육교육을 설계하고 운영합니다.</p>
</div>
</section>

<AboutShowcase />

<section className="web-about-team w-full bg-surface-container-lowest" id="team">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
<div>
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold mb-4">
<span>우리의 사람들</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">교육을 설계하고 현장을 움직이는 사람들</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">{aboutPage.team.description}</p>
</div>
</div>
<AboutPeople />
</div>
</section>

<PageCTA page="about" />
</div></main>);
}
