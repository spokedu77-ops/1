import Link from 'next/link';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { EducationPrograms, EducationDetails, EducationFAQ, EducationCases, EducationSystem, ClassConditions } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';

export default function EducationPage() {
  return (<main className="website-page w-full  bg-surface" id="main-content"><div className="flex flex-col w-full">

<section className="w-full bg-surface-container-lowest py-20 lg:py-28 relative overflow-hidden">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="max-w-3xl space-y-6">
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm">SPOKEDU<span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span><span></span></div>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight">
          학교와 기관을 위한{' '}<br />
<span className="text-primary-container">맞춤형 스포츠 커리큘럼</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">학교·키움센터·복지관 등 기관의 대상, 인원, 공간에 맞춰 지도자가 현장에서 직접 체육수업을 운영합니다.</p>
<div className="pt-4 flex flex-wrap items-center gap-4">
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-md" href="#program-grid">수업 유형 살펴보기</a>
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" href="#process-showcase">
            도입 절차 안내
          </a>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-low/70 py-24 relative" id="program-grid">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">CURRICULUM ARCHITECTURE</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">기관·학교 수업</h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md">하나를 상품처럼 고르는 목록이 아니라, 대상과 운영 목적에 맞춰 수업 안에 조합하는 범위입니다.</p>
</div>
<EducationPrograms />
</div>
</section>

<section className="w-full bg-surface-container-lowest py-24 lg:py-32" id="process-showcase">
<div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28">

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-5 relative z-10">
<div className="font-watermark-number text-watermark-number text-surface-container-highest/60 font-bold select-none -mb-8 lg:-mb-10 block">
            01
          </div>
<h3 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-4">기관 환경과 교육 목표 파악</h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">기관의 운영 목적과 수업 환경을 확인합니다.</p>
<div className="flex flex-wrap gap-2 mb-8">
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">대상</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">인원</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">공간</span>
</div>
<Link className="inline-flex items-center gap-2 text-primary font-label-md text-label-md hover:underline font-semibold group" href="/contact?type=dispatch">기관 체육수업 상담하기</Link>
</div>
<div className="lg:col-span-7">
<div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container shadow-[0_20px_35px_-10px_rgba(15,23,42,0.06)] relative group">
<img className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" src="/images/spokedu/home/field-editorial/home-master-ui.png" alt="SPOKEDU LAB의 수업 콘텐츠·프로그램 화면" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm text-outline font-semibold">STEP 01 DELIVERABLE</p>
<p className="font-headline-sm text-headline-sm font-bold text-on-surface">확인한 조건에 따라 수업 구성과 준비 범위를 달리합니다.</p>
</div>
<WebsiteIcon name="assignment_turned_in" className="text-primary text-[28px]" />
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 order-2 lg:order-1">
<div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container shadow-[0_20px_35px_-10px_rgba(15,23,42,0.06)] relative group">
<img className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" src="/images/spokedu/dispatch/dispatch-group-class.jpg" alt="학교·기관 체육수업 운영" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm text-outline font-semibold">STEP 02 OPERATION</p>
<p className="font-headline-sm text-headline-sm font-bold text-on-surface">이렇게 운영할 수 있습니다</p>
</div>
<WebsiteIcon name="verified_user" className="text-primary text-[28px]" />
</div>
</div>
</div>
<div className="lg:col-span-5 order-1 lg:order-2 relative z-10">
<div className="font-watermark-number text-watermark-number text-surface-container-highest/60 font-bold select-none -mb-8 lg:-mb-10 block">
            02
          </div>
<h3 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-4">수업 운영 및 지도 인력 배정</h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">수업 기준과 운영 범위를 공유한 뒤 기관 조건에 맞춰 배정합니다.</p>
<div className="flex flex-wrap gap-2 mb-8">
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">강사</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">일정</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">프로그램</span>
</div>
<Link className="inline-flex items-center gap-2 text-primary font-label-md text-label-md hover:underline font-semibold group" href="/contact?type=dispatch">기관 체육수업 상담하기</Link>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center" id="process-follow-up">
<div className="lg:col-span-5 relative z-10">
<div className="font-watermark-number text-watermark-number text-surface-container-highest/60 font-bold select-none -mb-8 lg:-mb-10 block">03</div>
<h3 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-4">운영 후 결과 공유·행정 지원</h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">필요 시 관찰 내용, 운영 피드백, 다음 회차 조정점을 정리해 공유합니다. 기관별 결과 공유와 행정 지원 범위는 사전에 협의합니다.</p>
<div className="flex flex-wrap gap-2 mb-8">
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">관찰 내용</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">운영 피드백</span>
<span className="px-3 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">다음 회기</span>
</div>
<Link className="inline-flex items-center gap-2 text-primary font-label-md text-label-md hover:underline font-semibold group" href="/contact?type=dispatch">기관 체육수업 상담하기</Link>
</div>
<div className="lg:col-span-7">
<div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container shadow-[0_20px_35px_-10px_rgba(15,23,42,0.06)] relative group">
<img className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" src="/images/spokedu/dispatch/dispatch-group-class.jpg" alt="학교·기관 체육수업 운영" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm text-outline font-semibold">STEP 03 FOLLOW-UP</p>
<p className="font-headline-sm text-headline-sm font-bold text-on-surface">필요 시 관찰 내용과 다음 회기 조정사항을 공유합니다.</p>
</div>
<WebsiteIcon name="assignment_turned_in" className="text-primary text-[28px]" />
</div>
</div>
</div>
</div></div>
</section>

<section className="w-full bg-surface-container-lowest py-20 lg:py-24 border-y border-outline-variant/20">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="text-center max-w-2xl mx-auto mb-16">
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">운영 조건</span>
<h2 className="font-headline-md text-headline-md text-on-surface font-bold">수업 방식의 차이를 먼저 확인하세요</h2>
</div>
<ClassConditions />
<EducationDetails /></div>
</section>

<EducationSystem /><EducationCases /><EducationFAQ /><InlineConsultForm type="dispatch" />
<PageCTA page="education" />
</div></main>);
}
