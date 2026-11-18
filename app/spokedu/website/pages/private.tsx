import Image from 'next/image';
import Link from 'next/link';
import { ConsultationLink } from '../components/ConsultationLink';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { PrivateSummary } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';
import { privatePage } from '../../data/private-page';
import '../styles/private-showcase.css';

// Final PRIVATE copy slots P-Q-03 through P-Q-14; no timing or assignment guarantee.
const privateFaq = [
  { q: '운동을 어려워하는 아이도 참여할 수 있나요?', a: '가능합니다. 아이의 현재 참여 수준과 운동 경험을 살피고 부담이 적은 활동부터 시작합니다.' },
  { q: '1:1과 소그룹 중 어떤 수업이 적합할까요?', a: '아이의 운동 목표와 또래 활동 경험, 선호하는 환경을 확인한 뒤 수업 형태를 함께 결정합니다.' },
  { q: '수업 장소와 시간은 어떻게 정하나요?', a: '희망 지역·장소·시간을 먼저 확인하고 가능한 지도자 및 운영 조건에 맞춰 조율합니다.' },
  { q: '비가 오거나 일정이 변경되면 어떻게 하나요?', a: '날씨와 공간의 안전을 먼저 확인한 뒤 실내 수업이나 일정 변경 등 가능한 방식을 협의합니다.' },
  { q: '수업 후 피드백을 받을 수 있나요?', a: '수업에서 관찰한 참여 모습과 수행 내용, 다음 활동 방향을 공유합니다. 구체적인 전달 방식은 운영 조건에 따라 안내합니다.' },
  { q: '체형 진단이나 치료도 제공하나요?', a: '스포키듀는 움직임과 참여를 지원하는 체육교육 서비스입니다. 의료적 진단이나 치료 서비스를 제공하지 않습니다.' },
] as const;

export default function PrivatePage() {
  return (<main className="website-page web-stitch web-private-page w-full bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest py-24 lg:py-32 relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-b from-surface-container-low/40 via-transparent to-transparent pointer-events-none"></div>
<div className="web-private-hero-grid max-w-7xl mx-auto px-6 lg:px-12 relative z-10"><div className="web-private-hero-copy">
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container text-primary mb-8 shadow-sm">SPOKEDU<span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span><span className="font-label-md text-label-md"></span></div>
<h1 className="font-display-hero text-display-hero text-on-surface max-w-4xl tracking-tight leading-tight mb-8">현재 수준과 목표에 맞춰 <br /><span className="text-primary-container">개인·소그룹 수업을 안내합니다</span></h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-12">아이의 운동 경험, 수업 목표, 가능한 장소를 함께 확인하고 1:1·소그룹 수업 방향을 상담으로 정합니다. 치료·검사 서비스가 아닙니다.</p>
<div className="flex flex-col sm:flex-row items-center gap-4">
<ConsultationLink className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-[0_10px_25px_-5px_rgba(37,99,235,0.35)] hover:-translate-y-0.5" href="/contact?type=private">
          개인·소그룹 수업 상담하기
          <WebsiteIcon name="arrow_forward" className="ml-2 text-[20px]" />
</ConsultationLink>
<a className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-all font-label-md text-label-md" href="#showcase">수업 유형 살펴보기</a>
</div>

<PrivateSummary />
</div>
<figure className="web-private-hero-photo"><Image unoptimized src="/images/spokedu/private/private-coaching.jpg" alt="공원에서 지도자가 아동의 움직임을 지도하는 모습" width={900} height={1200} priority style={{ objectPosition: '50% 75%' }} /><figcaption>아이의 수행 수준과 목표에 맞춰 조정하는 실제 체육수업</figcaption></figure>
</div>
</section>

<section className="w-full bg-surface-container-low py-24 lg:py-32" id="showcase">
<div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28 lg:space-y-36">

<div className="web-private-first-step grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative">
<div className="font-watermark-number text-watermark-number text-surface-variant/80 select-none absolute -top-16 -left-2 z-0 font-black" aria-hidden="true">
            01
          </div>
<div className="relative z-10 space-y-6">
<div className="flex items-center gap-2">
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#운동자신감</span>
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#기초움직임</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">현재 상태와 수업 목표를 확인합니다</h2>
<p className="font-body-md text-body-md text-on-surface-variant">아이의 운동 경험과 현재 수행 수준, 수업에서 경험하고 싶은 목표를 살핍니다. 줄넘기·축구·농구 같은 종목은 목표를 위한 수단으로 활용합니다.</p>
<div className="pt-2">
<a className="inline-flex items-center text-primary-container font-label-md text-label-md group" href="#class-types">수업 유형 살펴보기<span className="group-hover:underline"></span><WebsiteIcon name="east" className="ml-1 text-[18px] group-hover:translate-x-1 transition-transform" /></a>
</div>
</div>
</div>

</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 order-2 lg:order-1">
<div className="relative rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
<div className="aspect-[16/10] w-full relative">
<Image unoptimized width={856} height={642} className="w-full h-full object-cover" src="/images/spokedu/private/class-flow-01.jpg" alt="아동이 야외에서 신체활동을 하는 모습" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary-container"><WebsiteIcon name="verified_user" className="" /></div>
<div>
<p className="font-label-md text-label-md text-on-surface">배정 규칙</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">상담에서 시작 방향·수업 형태·지역·시간을 확인합니다.</p>
</div>
</div>
<span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">전담 매칭</span>
</div>
</div>
</div>
</div>
<div className="lg:col-span-5 relative order-1 lg:order-2">
<div className="font-watermark-number text-watermark-number text-surface-variant/80 select-none absolute -top-16 -left-2 z-0 font-black" aria-hidden="true">
            02
          </div>
<div className="relative z-10 space-y-6">
<div className="flex items-center gap-2">
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#전문지도자</span>
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#밀착티칭</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">수업 조건에 맞춰 지도자와 활동을 조율합니다</h2>
<p className="font-body-md text-body-md text-on-surface-variant">시작 방향·지역·가능 시간을 확인한 뒤 지도자와 활동 구성을 협의합니다. 첫 수업에서 아이의 반응을 살피며 난이도와 진행 방식을 조정합니다.</p>
<div className="pt-2">
<Link className="inline-flex items-center text-primary-container font-label-md text-label-md group" aria-label="운영진 소개 보기" href="/about#team">운영진 소개 보기</Link>
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative">
<div className="font-watermark-number text-watermark-number text-surface-variant/80 select-none absolute -top-16 -left-2 z-0 font-black" aria-hidden="true">
            03
          </div>
<div className="relative z-10 space-y-6">
<div className="flex items-center gap-2">
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#회차피드백</span>
<span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">#학부모안심</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">실제 수업과 피드백을 이어갑니다</h2>
<p className="font-body-md text-body-md text-on-surface-variant">활동을 정리하고, 오늘 잘한 점과 다음 수업에서 이어갈 점을 짧게 나눈 뒤 마무리합니다.</p>
<div className="pt-2">
<span className="font-label-sm text-label-sm text-on-surface-variant">수업 후 관찰·다음 방향 공유</span>
</div>
</div>
</div>
<div className="lg:col-span-7">
<div className="relative rounded-3xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] bg-surface-container-lowest">
<div className="aspect-[16/10] w-full relative">
<Image unoptimized width={900} height={1200} className="w-full h-full object-cover" src="/images/spokedu/private/private-coaching.jpg" alt="공원에서 지도자가 아동의 움직임을 지도하는 모습" style={{"objectPosition":"50% 80%"}} loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-tertiary-container/10 flex items-center justify-center text-tertiary-container">
<WebsiteIcon name="mark_chat_unread" className="" />
</div>
<div>
<p className="font-label-md text-label-md text-on-surface">스포키듀 수업 스케치</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">아이 속도와 목표에 맞춰 준비·메인·마무리로 이어가는 수업 구조입니다.</p>
</div>
</div>
<span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">수업 흐름</span>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-lowest py-24 lg:py-32" id="class-types">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider block mb-2">Curriculum Pathways</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">아이 맞춤형 특화 레슨 과정</h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md">줄넘기·축구·농구 같은 종목은 목표를 위한 수단입니다. 먼저 아이가 어떤 경험을 쌓아야 하는지부터 정합니다.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

<div className="rounded-2xl bg-surface-container-lowest shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] overflow-hidden group hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="aspect-[16/10] overflow-hidden relative">
<Image unoptimized width={1080} height={1440} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/images/spokedu/복지관_민첩성 놀이체육.jpg" alt="지도자와 아동이 함께하는 체육수업 모습" loading="lazy" decoding="async" />
<div className="absolute top-4 left-4">
<span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm shadow-sm">1:1 개인수업</span>
</div>
</div>
<div className="p-6 space-y-3">
<h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">1:1 개인수업</h3>
<p className="font-body-md text-body-md text-on-surface-variant">아이의 속도에 맞춰 천천히 시작합니다. 개별 목표와 움직임 습관을 세밀하게 확인하며, 운동 부담을 낮추고 참여 경험을 만듭니다.</p>
<ul className="web-private-comparison-points"><li>개별 수행 수준과 개인 목표 확인</li><li>활동 난이도 조절</li><li>지도자의 밀착 관찰</li></ul>
</div>
</div>
<div className="px-6 pb-6 pt-2 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline">운동에 자신감을 쌓고 싶은 아이</span>
<ConsultationLink className="font-label-sm text-label-sm text-primary" href="/contact?type=private">1:1 개인수업 상담</ConsultationLink>
</div>
</div>

<div className="rounded-2xl bg-surface-container-lowest shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] overflow-hidden group hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="aspect-[16/10] overflow-hidden relative">
<Image unoptimized width={2000} height={1500} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/images/spokedu/dispatch/dispatch-group-class.jpg" alt="지도자와 아동이 함께하는 체육수업 모습" loading="lazy" decoding="async" />
<div className="absolute top-4 left-4">
<span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm shadow-sm">소그룹 수업</span>
</div>
</div>
<div className="p-6 space-y-3">
<h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">2~4명 소그룹</h3>
<p className="font-body-md text-body-md text-on-surface-variant">또래와 함께 움직이며 참여 경험을 넓힙니다. 규칙·순서·협동을 자연스럽게 경험하는, 즐겁게 이어지는 흐름입니다.</p>
<ul className="web-private-comparison-points"><li>또래 참여와 규칙·차례 경험</li><li>협동 활동</li><li>참여 수준에 따른 수업 조절</li></ul>
</div>
</div>
<div className="px-6 pb-6 pt-2 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline">또래와 함께 움직이는 경험을 넓히고 싶은 아이</span>
<ConsultationLink className="font-label-sm text-label-sm text-primary" href="/contact?type=private">2~4명 소그룹 상담</ConsultationLink>
</div>
</div>

<div className="rounded-2xl bg-surface-container-lowest shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] overflow-hidden group hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
<div>
<div className="aspect-[16/10] overflow-hidden relative">
<Image unoptimized width={900} height={1200} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/images/spokedu/private/private-coaching.jpg" alt="공원에서 지도자가 아동의 움직임을 지도하는 모습" style={{"objectPosition":"50% 80%"}} loading="lazy" decoding="async" />
<div className="absolute top-4 left-4">
<span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-primary font-label-sm text-label-sm shadow-sm">종목 준비</span>
</div>
</div>
<div className="p-6 space-y-3">
<h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">종목 준비</h3>
<p className="font-body-md text-body-md text-on-surface-variant">종목 기술보다 먼저 필요한 자세, 리듬, 공 감각을 분리해 연습합니다.</p>
</div>
</div>
<div className="px-6 pb-6 pt-2 flex items-center justify-between">
<span className="font-label-sm text-label-sm text-outline">대상: 전 연령 (성장기 맞춤)</span>
<ConsultationLink className="font-label-sm text-label-sm text-primary" href="/contact?type=private">종목 준비 수업 상담 →</ConsultationLink>
</div>
</div>
</div>
</div>
</section>


<section id="private-faq" className="web-private-faq"><div className="max-w-7xl mx-auto px-6 lg:px-12"><p className="web-private-eyebrow">{privatePage.faq.eyebrow}</p><h2>{privatePage.faq.title}</h2><div>{privateFaq.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></div></section>
<span id="booking-form" aria-hidden="true" />
<div id="apply">
<PageCTA page="private" /></div>
</div></main>);
}
