import Image from 'next/image';
import { Star, CheckCircle2, XCircle, Clock3, Plus } from 'lucide-react';
import { HeroBadge } from '../components/HeroBadge';
import { SPOKEDU_IMAGES } from '../../data/images';
import { educationOperatingSteps, educationReviews, educationComparison, educationFaq } from '../data/education';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { EducationPrograms } from '../components/content-sections';
import { OperatingMetrics } from '../components/content-sections';
import { EducationFloatingCTA } from '../components/EducationFloatingCTA';
import '../styles/education-showcase.css';

export function EducationContent() {
  return (<main className="website-page web-stitch web-education-page w-full bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest pt-24 pb-20 lg:pt-32 lg:pb-28 relative overflow-hidden">
<div className="web-education-hero-grid max-w-7xl mx-auto px-6">
<div className="web-education-hero-copy">
<HeroBadge>학교·기관 체육교육</HeroBadge>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight mb-6">
          아이들이 움직이고 싶어지는<br />
<span className="text-primary-container">체육교육, 현장에서 완성합니다.</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed mb-6">학교와 기관의 교육 대상과 참여 인원 및 수업 공간을 확인해 활동을 구성합니다. 정기수업부터 방과후·특강·행사와 특수·포용 체육까지 전문 지도자가 현장에서 직접 운영합니다.</p>
<div className="pt-4 flex flex-wrap items-center justify-center gap-4">
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-md" href="#inquiry">기관 수업 문의하기</a>
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" href="#comparison">
            스포키듀 차별성 보기
          </a>
</div>
</div>
<figure className="web-education-hero-photo"><Image unoptimized src={SPOKEDU_IMAGES.dispatch.groupClass.src} alt={SPOKEDU_IMAGES.dispatch.groupClass.alt} width={1600} height={1200} priority /></figure>
</div>
</section>

<section id="education-metrics" className="web-education-metrics"><div className="max-w-7xl mx-auto px-6"><p>SPOKEDU 전체 운영 실적</p><OperatingMetrics /></div></section>

<section id="reviews" className="web-education-reviews py-16 md:py-20"><div className="max-w-7xl mx-auto px-6">
<header className="web-education-section-heading"><p>PARTNER REVIEWS</p><h2>기관 담당자가 직접 말하는 도입 효과</h2></header>
<div className="web-education-review-grid grid grid-cols-1 md:grid-cols-3 gap-6">{educationReviews.map((review, index) => <figure key={review.author} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between border-l-4"><div className="web-education-review-stars" role="img" aria-label="별점 5점">{Array.from({ length: 5 }, (_, star) => <Star key={star} size={16} aria-hidden="true" />)}</div><h3 className="text-base font-bold text-slate-900 leading-snug mb-2.5 break-keep">{review.title}</h3><blockquote className="text-sm text-slate-600 leading-normal mb-5 break-keep">{review.body}</blockquote><figcaption><span className="web-education-review-avatar" aria-hidden="true">{['P', 'K', 'L'][index]}</span><div><strong>{review.author}</strong><span>{review.organization}</span></div></figcaption></figure>)}</div>
</div></section>
<section id="comparison" className="web-education-comparison py-16 md:py-20"><div className="max-w-7xl mx-auto px-6">
<header className="web-education-section-heading"><p>COMPARISON</p><h2>기관의 체육교육,<br />운영의 차이를 확인하세요.</h2><p>수업 설계부터 현장 소통까지, 기관에서 확인할 기준을 함께 살펴보세요.</p></header>
<table><caption className="sr-only">SPOKEDU 운영 방식과 기관에서 확인할 기준</caption><thead><tr className="grid grid-cols-12"><th scope="col" className="col-span-3">비교 항목</th><th scope="col" className="col-span-5">SPOKEDU <span className="web-education-tier">PREMIUM</span></th><th scope="col" className="col-span-4">일반 업체 <span className="web-education-tier web-education-tier-basic">BASIC</span></th></tr></thead><tbody>{educationComparison.map(row => <tr key={row.title} className="grid grid-cols-12"><th scope="row" className="col-span-3">{row.title}</th><td className="col-span-5"><span className="web-education-compare-label">SPOKEDU</span><CheckCircle2 className="web-education-check" size={16} aria-hidden="true" />{row.operation}</td><td className="col-span-4"><span className="web-education-compare-label">일반 업체</span><XCircle className="web-education-cross" size={16} aria-hidden="true" />{row.criteria}</td></tr>)}</tbody></table>
</div></section>
<section className="w-full bg-surface-container-low/70 py-16 md:py-20 relative" id="program-grid">
<div className="max-w-7xl mx-auto px-6">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">CUSTOMIZED LINE-UP</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">기관의 목적에 맞춰 구성하는 체육수업</h2>
</div>

</div>
<aside className="web-education-base-program"><div><span>BASE CURRICULUM</span><h3>모든 수업의 바탕, 펑셔널 무브 &amp; 팀빌딩</h3></div><p>기본 움직임과 협력 경험을 바탕으로 기관 목적에 맞는 활동을 조합합니다.</p></aside>
<EducationPrograms />
<p className="web-education-group-note">각 프로그램은 대표적인 운영 예시입니다. 각 프로그램의 운영 형태는 기관 조건에 따라 달라질 수 있습니다.</p>
</div>
</section>

<section className="web-education-process w-full bg-surface-container-lowest py-16 md:py-20" id="process-showcase">
<div className="max-w-7xl mx-auto px-6">

<div className="web-education-process-heading"><p className="font-label-sm text-label-sm text-primary font-bold">EASY ONBOARDING</p><h2>문의부터 첫 수업까지, 함께 준비합니다</h2><p>복잡한 절차 없이, 문의 접수 후 최단 7일 이내에 수업이 시작됩니다.</p></div>
<ol className="web-education-operating-steps grid grid-cols-1 md:grid-cols-5 gap-4">{educationOperatingSteps.map((step, index) => <li key={step.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center relative flex flex-col items-center"><p className="web-education-step-number">{String(index + 1).padStart(2, '0')}</p><span aria-hidden="true"><WebsiteIcon name={step.icon} /></span><h3>{step.title}</h3><p>{step.body}</p><p className="web-education-step-duration"><Clock3 size={14} aria-hidden="true" />{['당일~24시간', '1~2일', '1~3일', '3~5일', '7일 이내'][index]}</p></li>)}</ol><p className="web-education-process-note">※ 단계별 기간은 예상 일정이며, 첫 수업 일정은 기관의 요청과 운영 조건을 확인한 뒤 협의합니다.</p>
</div>
</section>
<section id="education-faq" className="web-education-faq py-16 md:py-20"><div className="max-w-7xl mx-auto px-6"><header className="web-education-section-heading"><p>FAQ</p><h2>기관 담당자분들이 자주 묻는 질문</h2></header><div className="web-education-faq-list">{educationFaq.map(item => <details key={item.question}><summary>{item.question}<span className="web-education-faq-toggle" aria-hidden="true"><Plus size={16} /></span></summary><p>{item.answer}</p></details>)}</div></div></section>
<div id="contact" className="web-education-consult"><div className="web-education-consult-grid max-w-7xl mx-auto px-6">
<div className="web-education-consult-copy"><p className="font-label-sm text-label-sm text-primary font-bold">PROPOSAL REQUEST</p><h2>우리 기관에 맞는 체육수업을<br />함께 구성해 보세요.</h2><p>대상과 일정이 모두 정해지지 않았더라도 현재 계획하고 있는 내용을 남겨주세요. 교육 목적과 운영 조건을 확인한 뒤 안내드립니다.</p></div>
<InlineConsultForm type="dispatch" educationProgramSelection />

</div></div>
</div><EducationFloatingCTA /></main>);
}

export default function EducationPage() {
  return <EducationContent />;
}
