import Link from 'next/link';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { PUBLIC_PROGRAM_COPY } from '../../data/public-brand-copy';
import { spomoveProgramPage } from '../../data/spomove-program-page';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { SpomoveFieldPhoto, SpomatProductPhoto, SpomoveProcessingFlow } from '../components/SpomoveVisual';
import { PageCTA } from '../components/content-sections';

export default function SpomovePage() {
  return (<main className="website-page web-spomove w-full bg-surface" id="main-content"><div className="flex flex-col w-full">

<section className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-primary mb-8 shadow-sm">
<WebsiteIcon name="verified" className="text-[18px]" />
<span className="font-label-sm text-label-sm uppercase tracking-wider">SPOMOVE</span>
</div>
<h1 className="font-display-hero text-headline-lg lg:text-display-hero text-on-surface font-bold tracking-tight max-w-4xl whitespace-pre-line leading-tight">화면을 보고 판단하고 <span className="text-primary-container">움직이는 체육활동</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-8 leading-relaxed">{PUBLIC_PROGRAM_COPY.spomove}</p>
<div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
<Link className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:bg-primary transition-all duration-200" href="/contact?type=spomove">SPOMOVE 도입 상담하기</Link>
<a className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-all duration-200" href="#showcase">SPOMOVE 수업 구조 보기</a>
</div>
</div>
</section>

<section className="w-full" id="showcase">

<div className="w-full bg-surface-container-low py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative">
<span className="font-watermark-number text-watermark-number text-primary-fixed block select-none pointer-events-none -mb-4 lg:-mb-8 opacity-70">01</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">보고, 판단하고, <span className="text-primary-container">움직입니다.</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-6 leading-relaxed">화면의 자극을 보고 판단하고 움직이는 SPOKEDU의 디지털 움직임 프로그램입니다.</p>
<div className="flex flex-wrap gap-2 mt-8">
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#화면신호</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#시지각반응</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#신체수행</span>
</div>
<div className="mt-8 pt-4">
<Link className="inline-flex items-center text-primary-container font-label-md text-label-md font-bold group" href="/spomove/catalog">프로그램 구성 보기</Link>
</div>
</div>
<div className="lg:col-span-7">
<SpomoveFieldPhoto />
</div>
</div>
</div>
</div>

<div className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 order-2 lg:order-1">
<SpomatProductPhoto />
</div>
<div className="lg:col-span-5 order-1 lg:order-2 relative">
<span className="font-watermark-number text-watermark-number text-primary-fixed block select-none pointer-events-none -mb-4 lg:-mb-8 opacity-70">02</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">네 가지 색으로 구분하는 <span className="text-primary-container">SPOMAT</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-6 leading-relaxed">{PUBLIC_PROGRAM_COPY.spomat}</p>
<div className="flex flex-wrap gap-2 mt-8">
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#4색매트</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#2×2배치</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#화면연계</span>
</div>
<div className="mt-8 pt-4">
<Link className="inline-flex items-center text-primary-container font-label-md text-label-md font-bold group" href="/spomove/catalog">프로그램 구성 보기</Link>
</div>
</div>
</div>
</div>
</div>

<div className="w-full bg-surface-container-low py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative">
<span className="font-watermark-number text-watermark-number text-primary-fixed block select-none pointer-events-none -mb-4 lg:-mb-8 opacity-70">03</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">같은 활동도 다르게 <span className="text-primary-container">설계할 수 있습니다.</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-6 leading-relaxed">대상과 수행 수준에 맞춰 자극 시간, 과제 구조, 참여 방식과 움직임을 조합합니다.</p>
<div className="flex flex-wrap gap-2 mt-8">
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#맞춤커리큘럼</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#난이도조절</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">#과제구성</span>
</div>
<div className="mt-8 pt-4">
<Link className="inline-flex items-center text-primary-container font-label-md text-label-md font-bold group" href="/education">수업 유형 살펴보기<WebsiteIcon name="arrow_forward" className="ml-1 group-hover:translate-x-1 transition-transform text-[18px]" /></Link>
</div>
</div>
<div className="lg:col-span-7">
<div className="web-spomove-process-card"><SpomoveProcessingFlow /><div className="web-spomove-levels">{spomoveProgramPage.content.levels.map(level => <div key={level.id}><h3>{level.title}</h3><p>{level.body}</p></div>)}</div></div>
</div>
</div>
</div>
</div>
<div className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 order-2 lg:order-1">
<div className="w-full rounded-3xl bg-inverse-surface text-inverse-on-surface p-8 shadow-[0_24px_50px_rgba(40,48,68,0.18)]"><div className="flex items-center justify-between gap-4 pb-6"><span className="font-headline-sm text-headline-sm font-bold">SPOMOVE 수업 구조</span><span className="font-label-sm text-label-sm text-outline-variant">프로그램 안내 · 측정 결과 아님</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="p-6 rounded-2xl bg-surface-container-highest/10"><h3 className="font-label-md text-label-md text-outline-variant mb-4">화면 신호 · 반응 선택</h3><p className="font-headline-sm text-headline-sm font-bold text-primary-fixed mb-4">SEE · THINK</p><p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">화면에서 색상·방향·형태·동작 자극을 확인합니다. 자극을 구분하고 어떤 움직임을 할지 판단합니다.</p></div><div className="p-6 rounded-2xl bg-surface-container-highest/10"><h3 className="font-label-md text-label-md text-outline-variant mb-4">신체 수행</h3><p className="font-headline-sm text-headline-sm font-bold text-primary-fixed mb-4">MOVE</p><p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">SPOMAT과 공간 위에서 실제 움직임을 수행합니다.</p></div></div><div className="mt-4 p-5 rounded-2xl bg-surface-container-highest/10"><p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">화면에서 목표를 확인하는 것만으로 끝나지 않습니다. 선택한 반응을 몸으로 실행해야 SPOMOVE 활동이 완성됩니다.</p></div></div>
</div>
<div className="lg:col-span-5 order-1 lg:order-2 relative">
<span className="font-watermark-number text-watermark-number text-primary-fixed block select-none pointer-events-none -mb-4 lg:-mb-8 opacity-70">04</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">화면 신호는 실제 움직임 수행으로 이어집니다</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-6 leading-relaxed">화면의 색과 길을 보고 바닥에서 움직여 반응하는 콘텐츠입니다. 기관 수업에서 활용하고, 지도자는 SPOKEDU LAB에서 이용 조건을 확인할 수 있습니다.</p><p className="font-body-sm text-body-sm text-on-surface-variant mt-4">SPOKEDU LAB · {PUBLIC_PROGRAM_COPY.lab}</p>
<div className="flex flex-wrap gap-2 mt-8">
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#화면신호</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#반응선택</span>
<span className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">#신체수행</span>
</div>
<div className="mt-8 pt-4">
<Link className="inline-flex items-center text-primary-container font-label-md text-label-md font-bold group" href="/spokedu-lab">SPOKEDU LAB 둘러보기</Link>
</div>
</div>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest py-24 lg:py-32">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="text-center max-w-2xl mx-auto mb-20">
<span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">과제 예시</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mt-3">규칙에 맞는 반응을 선택하도록 구성합니다</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 text-center">

<div className="flex flex-col items-center"><h3 className="font-headline-sm text-headline-sm text-primary font-bold">사이먼 효과</h3><p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">자극이 나타난 위치와 정답 위치가 다를 때, 보이는 위치로 바로 움직이려는 반응을 멈추고 색 규칙에 맞는 패드를 선택합니다.</p></div>

<div className="flex flex-col items-center"><h3 className="font-headline-sm text-headline-sm text-primary font-bold">플랭커</h3><p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">가운데 목표 주변의 방해 자극에 흔들리지 않고 중심 목표만 찾아 움직입니다.</p></div>

<div className="flex flex-col items-center"><h3 className="font-headline-sm text-headline-sm text-primary font-bold">스트룹 과제</h3><p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">글자의 의미, 글자색, 화살표 방향처럼 충돌하는 정보 중 정해진 기준만 선택해 수행합니다.</p></div>

<div className="flex flex-col items-center"><h3 className="font-headline-sm text-headline-sm text-primary font-bold">DIVE</h3><p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">화면 속 대상에 전신으로 반응합니다.</p></div>
</div>
</div>
</section>

<InlineConsultForm type="spomove" />
<PageCTA page="spomove" />
</div></main>);
}
