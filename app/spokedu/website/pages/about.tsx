import Image from 'next/image';
import Link from 'next/link';
import { PUBLIC_LEADERSHIP_INTRO } from '../../data/public-brand-copy';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { AboutPeople, OperatingMetrics } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';

export default function AboutPage() {
  return (<main className="website-page web-stitch w-full  bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm mb-8 shadow-sm">
<span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
<span>ABOUT SPOKEDU</span>
</div>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight max-w-4xl mb-8">움직임으로{' '}<br /><span className="text-primary-container">아이의 성장을 설계합니다.</span></h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">아이들의 발달 수준과 특성을 고려한 체육수업을 운영하며, 현장의 경험을 교육 콘텐츠와 기술로 확장합니다.</p>

<div className="w-full max-w-4xl mt-16 pt-10 border-t border-outline-variant/30"><OperatingMetrics about /></div>
</div>
</section>

<section id="showcase" className="w-full bg-surface-container-low py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28 lg:space-y-36">

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative flex flex-col justify-center">
<span className="font-watermark-number text-watermark-number font-black text-secondary-fixed opacity-60 select-none absolute -top-16 -left-2 z-0 leading-none" aria-hidden="true">01</span>
<div className="relative z-10 space-y-6">
<div className="flex flex-wrap gap-2">
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#아이이해</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#움직임관찰</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">OUR APPROACH</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight">현장에서 쌓은 <br />
<span className="text-primary-container">체육교육 전문성</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">학교·기관·개인 수업을 직접 운영하며 아이의 특성과 움직임 수준을 살핍니다.</p>
<div className="pt-2">
<Link className="inline-flex items-center gap-2 font-label-md text-label-md text-primary-container hover:text-primary transition-colors group" href="/education">수업 유형 살펴보기<span></span><WebsiteIcon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" /></Link>
</div>
</div>
</div>
<div className="lg:col-span-7">
<div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
<Image unoptimized width={2000} height={1500} className="w-full h-full object-cover" src="/images/spokedu/dispatch/dispatch-group-class.jpg" alt="학교·기관 체육수업 운영" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md shadow-sm flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
<WebsiteIcon name="analytics" className="text-[20px]" />
</span>
<div>
<div className="font-label-md text-label-md text-on-surface font-bold">SPOKEDU</div>
<div className="font-label-sm text-label-sm text-on-surface-variant">학교·기관·개인 맞춤형 체육수업을 운영합니다.</div>
</div>
</div>
<span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-label-sm font-semibold">현장 수업</span>
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 lg:order-1 order-2">
<div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
<Image unoptimized width={900} height={1200} className="w-full h-full object-cover" src="/images/spokedu/private/private-coaching.jpg" alt="공원에서 지도자가 아동의 움직임을 지도하는 모습" loading="lazy" decoding="async" />
<div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
<span className="font-label-sm text-label-sm text-on-surface font-bold">1:1 맞춤형 라포 형성 프로그램 운영</span>
</div>
</div>
</div>
<div className="lg:col-span-5 lg:order-2 order-1 relative flex flex-col justify-center">
<span className="font-watermark-number text-watermark-number font-black text-secondary-fixed opacity-60 select-none absolute -top-16 -left-2 z-0 leading-none" aria-hidden="true">02</span>
<div className="relative z-10 space-y-6">
<div className="flex flex-wrap gap-2">
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#진정성</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#안전제일</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">#자신감향상</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight">참여 수준에 맞춘 <br />
<span className="text-primary-container">포용적 교육 설계</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">발달 수준과 교육 목적에 맞게 활동의 규칙, 수행 속도와 지도 방법을 조정합니다.</p>
<div className="pt-2">
<Link className="inline-flex items-center gap-2 font-label-md text-label-md text-primary-container hover:text-primary transition-colors group" href="/records">
<span>생생한 현장 수업 스토리 확인하기</span>
<WebsiteIcon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />
</Link>
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative flex flex-col justify-center">
<span className="font-watermark-number text-watermark-number font-black text-secondary-fixed opacity-60 select-none absolute -top-16 -left-2 z-0 leading-none" aria-hidden="true">03</span>
<div className="relative z-10 space-y-6">
<div className="flex flex-wrap gap-2">
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#참여관찰</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#교육나눔</span>
<span className="px-3.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">#수업발전</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight">수업 경험을 넓히는 <br />
<span className="text-primary-container">콘텐츠·기술 개발</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">현장에서 쌓은 경험을 4MOVE 커리큘럼, SPOMOVE와 지도자용 플랫폼 SPOKEDU LAB으로 확장합니다.</p>
<div className="pt-2">
<Link className="inline-flex items-center gap-2 font-label-md text-label-md text-primary-container hover:text-primary transition-colors group" href="/contact">문의·상담하기<span></span><WebsiteIcon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" /></Link>
</div>
</div>
</div>
<div className="lg:col-span-7">
<div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
<Image unoptimized width={2400} height={1800} className="w-full h-full object-cover" src="/images/spokedu/home/field-editorial/home-hero-field.webp" alt="학교·기관 체육수업 운영" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md shadow-sm flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary-container">
<WebsiteIcon name="school" className="text-[20px]" />
</span>
<div>
<div className="font-label-md text-label-md text-on-surface font-bold">학교·기관·개인 맞춤형 체육수업을 운영합니다.</div>
<div className="font-label-sm text-label-sm text-on-surface-variant">참여 과정과 움직임의 변화를 살피며 수업을 발전시킵니다.</div>
</div>
</div>
<WebsiteIcon name="verified" className="text-primary-container text-xl" />
</div>
</div>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest py-24 lg:py-32" id="team">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold mb-4">
<span>OUR PEOPLE</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">교육을 설계하고 현장을 움직이는 사람들</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">{PUBLIC_LEADERSHIP_INTRO}</p>
</div>
<div className="flex items-center gap-3">프로그램·운영 안내<span className="font-label-sm text-label-sm text-on-surface-variant"></span></div>
</div>
<AboutPeople />
</div>
</section>

<PageCTA page="about" />
</div></main>);
}
