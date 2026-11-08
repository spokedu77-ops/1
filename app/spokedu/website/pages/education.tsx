import Image from 'next/image';
import Link from 'next/link';
import { FIELD_RECORD_CATALOG } from '../../data/field-records-catalog';
import { HeroBadge } from '../components/HeroBadge';
import { InlineConsultForm } from '../../contact/inline-consult-form';
import { WebsiteIcon } from '../components/WebsiteIcon';
import { EducationPrograms } from '../components/content-sections';
import { PageCTA } from '../components/content-sections';
import '../styles/education-showcase.css';

export default function EducationPage() {
  const caseLinks = [
    { slug: 'maedong-sports-stepup', context: '늘봄 스포츠 교육', description: '기본운동기술에서 종목별 스포츠 활동으로 확장한 교육 사례' },
    { slug: 'dongjak-spomove', context: 'SPOMOVE 교육', description: '화면의 시각정보를 활용한 선택반응·움직임 활동 사례' },
    { slug: 'donghaeng-special-pe', context: '특수체육', description: '학생별 수행 수준에 맞춘 과제 조정과 참여 중심 체육교육 사례' },
  ].flatMap(item => {
    const record = FIELD_RECORD_CATALOG.find(record => record.slug === item.slug);
    return record ? [{ ...item, title: record.venue, href: record.href }] : [];
  });
  return (<main className="website-page web-stitch w-full  bg-surface" id="main-content"><div className="flex flex-col w-full">

<section id="brand" className="w-full bg-surface-container-lowest pt-24 pb-20 lg:pt-32 lg:pb-28 relative overflow-hidden">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="max-w-4xl mx-auto text-center flex flex-col items-center">
<HeroBadge>SPOKEDU · 기관 체육교육</HeroBadge>
<h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight mb-6">
          학교와 기관의 체육교육,<br />
<span className="text-primary-container">설계부터 현장 운영까지.</span>
</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed mb-6">정기수업과 특강부터 특수체육 및 행사까지 기관의 목적과 수업 환경에 맞춰 직접 구성하고 운영합니다.</p>
<div className="pt-4 flex flex-wrap items-center justify-center gap-4">
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-all shadow-md" href="#program-grid">프로그램 살펴보기</a>
<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" href="#inquiry">
            기관 수업 문의하기
          </a>
</div>
</div>
</div>
</section>

<section className="w-full bg-surface-container-low/70 py-24 relative" id="program-grid">
<div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold block mb-2">OUR PROGRAMS</span>
<h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">기관·학교 체육교육 프로그램</h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md">교육 대상과 운영 목적에 맞춰 정기 스포츠 교육부터 시지각 움직임 활동, 특수체육, 행사 프로그램까지 구성합니다.</p>
</div>
<EducationPrograms />
</div>
</section>

<section className="web-education-process w-full bg-surface-container-lowest py-24 lg:py-32" id="process-showcase">
<div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-28">

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="web-education-showcase-copy lg:col-span-5 relative z-10">
<p className="font-label-sm text-label-sm text-primary font-bold">01. 수업 구성</p>
<div className="font-watermark-number text-watermark-number text-primary-fixed font-black select-none block" aria-hidden="true">
            01
          </div>
<h3 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-4">기관 조건 확인과 수업 구성</h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">교육 대상과 참여 인원, 수업 공간, 운영 목적을 확인합니다. 이를 바탕으로 활동의 난이도와 진행 방식, 교구 및 준비 범위를 구성합니다.</p>
<div className="flex flex-wrap gap-2 mb-8">
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#대상</span>
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#공간</span>
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#수업구성</span>
</div>
</div>
<div className="lg:col-span-7">
<div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container shadow-[0_20px_35px_-10px_rgba(15,23,42,0.06)] relative group">
<Image unoptimized width={1024} height={795} className="web-education-lab-screen w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" src="/images/spokedu/home/field-editorial/home-master-ui.png" alt="수업 활동 자료를 살펴보고 준비할 때 참고하는 SPOKEDU LAB 콘텐츠 화면 예시" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm text-outline font-semibold">STEP 01 · CLASS PREPARATION</p>
<p className="font-headline-sm text-headline-sm font-bold text-on-surface">SPOKEDU LAB · 수업 활동 자료</p>
</div>
<WebsiteIcon name="assignment_turned_in" className="text-primary text-[28px]" />
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
<div className="lg:col-span-7 order-2 lg:order-1">
<div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container shadow-[0_20px_35px_-10px_rgba(15,23,42,0.06)] relative group">
<Image unoptimized width={2000} height={1500} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" src="/images/spokedu/dispatch/dispatch-group-class.jpg" alt="학교·기관 체육수업 운영" loading="lazy" decoding="async" />
<div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between">
<div>
<p className="font-label-sm text-label-sm text-outline font-semibold">STEP 02 · FIELD CLASS</p>
<p className="font-headline-sm text-headline-sm font-bold text-on-surface">화면 신호를 활용한 실제 체육수업</p>
</div>
<WebsiteIcon name="verified_user" className="text-primary text-[28px]" />
</div>
</div>
</div>
<div className="web-education-showcase-copy lg:col-span-5 order-1 lg:order-2 relative z-10">
<p className="font-label-sm text-label-sm text-primary font-bold">02. 현장 운영</p>
<div className="font-watermark-number text-watermark-number text-primary-fixed font-black select-none block" aria-hidden="true">
            02
          </div>
<h3 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-4">현장 운영과 수업 기록</h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-6">기관과 협의한 기준에 맞춰 지도자가 수업을 진행합니다. 참여 방식과 움직임 수행, 규칙 이해 등을 관찰하고 필요한 사항을 다음 회차의 활동 구성에 반영합니다. 기록과 결과 공유는 기관별 협의 범위에 따라 진행합니다.</p>
<div className="flex flex-wrap gap-2 mb-8">
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#수업운영</span>
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#참여관찰</span>
<span className="web-education-showcase-tag font-label-sm text-label-sm font-semibold">#기록공유</span>
</div>
</div>
</div>
{caseLinks.length > 0 && <div className="web-education-case-links">
<p className="font-label-sm text-label-sm text-primary font-bold">FIELD RECORDS</p>
<h3 className="font-headline-md text-headline-md text-on-surface font-bold">실제 기관 운영 사례</h3>
<p className="font-body-md text-body-md text-on-surface-variant">학교와 기관에서 진행한 수업의 구성과 지도 방식을 실제 사례로 확인할 수 있습니다.</p>
<ul>{caseLinks.map(item => <li key={item.slug}>
<p className="web-education-case-type">{item.context}</p><h4>{item.title}</h4><p>{item.description}</p>
<Link href={item.href} {...(item.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>사례 자세히 보기<span className="sr-only"> — {item.title}{item.href.startsWith('https://') ? ' (새 창)' : ''}</span><WebsiteIcon name="arrow_forward" /></Link>
</li>)}</ul>
</div>}
</div>
</section>

<PageCTA page="education" />
<InlineConsultForm type="dispatch" educationProgramSelection />
</div></main>);
}
