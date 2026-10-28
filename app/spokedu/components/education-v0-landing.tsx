'use client';

import Image from 'next/image';
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Clock3,
  GraduationCap,
  HeartHandshake,
  MoveUpRight,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Suspense } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import { educationHubPage } from '../data/education-hub';
import {
  EDUCATION_V0_FIELD_RECORDS,
  EDUCATION_V0_HERO_IMAGE,
  EDUCATION_V0_PROGRAMS,
} from '../data/education-v0-media';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import { koreanLineBreak } from '../lib/ui-classes';
import { DispatchProposalForm } from './dispatch-proposal-form';

const comparison = [
  ['커리큘럼', '연세대 체육교육과 연구진의 연간 커리큘럼', '강사 개인 재량의 단발성 놀이'],
  ['강사 리스크 관리', '본사 직영 관리 · 검증된 대체 강사 즉시 투입', '단순 프리랜서 중개로 결원 시 대처 불가'],
  ['느린 학습자·특수 통합', '개별 속도에 맞춘 포용형 규칙 재설계', '획일적 경기 진행으로 소외 발생'],
  ['교구 및 에듀테크', '자체 개발 SPOMOVE · KC인증 교구 직접 지참', '기관 내 기본 교구만 제한적 사용'],
  ['기관 행정 지원', '맞춤 계획서 · 비교견적서 · 결과 보고 자료 지원', '단순 출강 외 행정 대응 미흡'],
] as const;

const faqItems = [
  ['수업 비용은 어떤 기준으로 정해지나요?', '대상 인원, 수업 시간, 회기 수, 공간과 프로그램 구성에 따라 맞춤 견적을 보내드립니다.'],
  ['최소 운영 회기가 있나요?', '기관의 목적에 따라 단회 행사부터 정기 수업까지 유연하게 설계합니다.'],
  ['교구는 기관에서 준비해야 하나요?', '수업에 필요한 전문 교구는 강사가 직접 지참합니다.'],
  ['특수·통합 환경에서도 수업이 가능한가요?', '참여자의 수행 수준에 맞춰 거리, 속도, 규칙을 조정하는 포용형 수업이 가능합니다.'],
  ['비교견적서 등 행정 서류도 지원하나요?', '맞춤 계획서, 비교견적서, 결과 보고 자료 등 기관 운영에 필요한 서류를 지원합니다.'],
] as const;

const onboardingSteps = [
  ['01', '조건 확인', '대상·인원·공간 파악'],
  ['02', '맞춤 운영안 제안', '프로그램·회기·견적서 발송'],
  ['03', '강사 배정 및 현장 운영', '교구 지참 출강 및 실시간 피드백'],
] as const;

const classFlowSteps = [
  ['01', '기초 움직임', '신체조절 및 웜업'],
  ['02', 'SPOMOVE', '시지각 반응 브레인 체육'],
  ['03', '조작운동 기술', '전문 교구 활용 기술 확장'],
  ['04', '팀 활동', '협동과 규칙 기반 스포츠 게임'],
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold tracking-[0.16em] text-blue-600">
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${koreanLineBreak}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-[42px] md:leading-[1.2]">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-slate-500 md:text-lg">{description}</p>
    </div>
  );
}

function EducationV0Image({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const isRemote = src.startsWith('http');
  if (isRemote) {
    return (
      <Image src={src} alt={alt} fill className={className} priority={priority} sizes="(max-width: 768px) 100vw, 50vw" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${className ?? ''}`} />
  );
}

export function EducationV0Landing() {
  const { reviews } = educationHubPage;

  return (
    <main className={`overflow-hidden bg-white pb-24 text-slate-900 ${koreanLineBreak}`}>
      {/* 1. Hero + metrics bar */}
      <section className="relative bg-white pb-16 pt-10 md:pb-24 md:pt-14">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <Eyebrow>SCHOOL &amp; ORGANIZATION</Eyebrow>
            <h1
              id="edu-hero-heading"
              className="mt-6 max-w-xl text-balance text-4xl font-bold leading-[1.18] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl"
            >
              움직이게 하는 수업이 아니라,
              <br />
              <span className="text-blue-600">움직이고 싶게</span> 만드는
              <br />
              수업입니다.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">
              연세대학교 체육교육과 출신 전문가들의 설계와 현장 데이터가 적용된 연간 커리큘럼으로 학교·기관의 체육
              수업을 체계적으로 운영합니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                기관 맞춤 운영안 받기 <ArrowRight className="ml-1 inline size-4" aria-hidden />
              </a>
              <a
                href="#records"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                실제 수업 사례 보기
              </a>
            </div>
            <div className="mt-12 flex items-center gap-5 text-sm text-slate-500">
              <div className="flex -space-x-2" aria-hidden>
                <div className="size-8 rounded-full border-2 border-white bg-blue-200" />
                <div className="size-8 rounded-full border-2 border-white bg-sky-300" />
                <div className="size-8 rounded-full border-2 border-white bg-indigo-300" />
              </div>
              <span>
                전국 500개+ 기관이 선택한
                <br />
                <strong className="text-slate-900">아이들의 움직임 전문가</strong>
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[0.94] overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl shadow-blue-100">
              <EducationV0Image
                src={EDUCATION_V0_HERO_IMAGE}
                alt="함께 스포츠 활동을 즐기는 아이들"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" aria-hidden />
            </div>
            <div className="absolute -bottom-7 -left-5 flex max-w-[260px] items-center gap-3 rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10 md:-left-8">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <GraduationCap className="size-6" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-blue-600">DESIGNED BY EXPERTS</p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-800">
                  연세대 체육교육과 출신
                  <br />
                  연구진 직접 설계
                </p>
              </div>
            </div>
            <div className="absolute -right-3 top-8 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-xl">
              <p className="text-[10px] font-bold tracking-widest text-blue-300">FIELD DATA</p>
              <p className="mt-1 text-lg font-bold">
                98<span className="text-blue-400">%</span>
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-20 grid max-w-5xl overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/50 sm:grid-cols-3 sm:p-5">
          <div className="flex items-center gap-4 px-5 py-4 sm:border-r sm:border-slate-100 sm:py-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-950">
                500개<span className="text-blue-600">+</span>
              </p>
              <p className="text-xs text-slate-500">누적 출강 학교 및 기관</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4 sm:border-r sm:border-slate-100 sm:py-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HeartHandshake className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-950">
                98<span className="text-blue-600">%</span>
              </p>
              <p className="text-xs text-slate-500">출강 기관 재계약률</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4 sm:py-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock3 className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-slate-950">최단 7일</p>
              <p className="text-xs text-slate-500">문의 후 맞춤 수업 시작</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Custom design + 4-step timeline */}
      <section id="design" className="scroll-mt-28 bg-slate-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="CUSTOMIZED DESIGN"
            title="조건이 달라지면 수업의 설계도 달라집니다"
            description="같은 프로그램을 모든 현장에 반복하지 않습니다. 기관의 환경과 아이들의 특성에 맞춰 동선과 규칙을 정밀하게 조정합니다."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              [MoveUpRight, '공간 최적화', '교실·활동실부터 강당까지 가용 면적에 맞춘 동선과 교구 세팅'],
              [Users, '대기율 제로 인원 설계', '소그룹부터 다인원 학급까지 구경하는 아이 없는 동시 참여 구조'],
              [Sparkles, '포용적 연령·난이도', '유아·초·중등 및 느린 학습자·특수 통합 환경에 맞춘 규칙과 촉진 수준 조절'],
            ].map(([Icon, title, body]) => (
              <div key={title as string} className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="mt-7 text-xl font-bold">{title as string}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{body as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-slate-950 p-8 text-white md:p-10">
            <div className="flex flex-col gap-8">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-blue-300">ONE SESSION, ONE FLOW</p>
                <h3 className="mt-3 text-2xl font-bold leading-snug">
                  하나의 활동이 아니라 1회기 수업의 흐름을 설계합니다
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {classFlowSteps.map(([num, title, desc], index) => (
                  <div
                    key={num}
                    className="relative flex min-h-44 flex-col rounded-2xl border border-white/10 bg-white/5 p-6"
                  >
                    {index < 3 ? (
                      <ChevronRight
                        className="absolute -right-1 top-3 hidden size-4 text-slate-600 md:block"
                        aria-hidden
                      />
                    ) : null}
                    <span className="text-xs font-black tracking-[0.12em] text-blue-300">STEP {num}</span>
                    <p className="mt-8 text-lg font-bold">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Comparison table */}
      <section id="compare" className="scroll-mt-28 bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="WHY SPOKEDU"
            title="일반 강사 파견 업체와 스포키듀가 결정적으로 다른 이유"
            description="수업 한 번을 넘어, 기관이 안심하고 맡길 수 있는 운영 시스템을 함께 제공합니다."
          />
          <div className="mt-14 overflow-x-auto">
            <div className="min-w-[760px] overflow-hidden rounded-3xl border border-blue-200 shadow-xl shadow-blue-100/60">
              <div className="grid grid-cols-[1.05fr_1.65fr_1.65fr] bg-slate-50 text-sm font-bold text-slate-500">
                <div className="p-6">비교 항목</div>
                <div className="relative border-x-2 border-blue-600 bg-blue-600 p-6 pt-9 text-white shadow-xl">
                  <span className="absolute left-6 top-3 text-[10px] font-black tracking-widest text-blue-500">
                    RECOMMENDED
                  </span>
                  SPOKEDU PREMIUM
                </div>
                <div className="p-6">일반 파견 업체</div>
              </div>
              {comparison.map(([label, premium, regular]) => (
                <div key={label} className="grid grid-cols-[1.05fr_1.65fr_1.65fr] border-t border-slate-100 text-sm">
                  <div className="flex items-center p-6 font-bold text-slate-800">{label}</div>
                  <div className="flex items-start gap-3 border-x-2 border-blue-600 bg-blue-50/70 p-6 font-semibold text-slate-800 shadow-[inset_0_0_24px_rgba(37,99,235,0.08)]">
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                    {premium}
                  </div>
                  <div className="flex items-start gap-3 p-6 text-slate-400">
                    <X className="mt-0.5 size-5 shrink-0 text-slate-300" aria-hidden />
                    {regular}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Six program cards */}
      <section id="programs" className="scroll-mt-28 bg-slate-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="PROGRAM LINE-UP"
            title="기관 목적에 맞춰 조합하는 6대 타겟 프로그램"
            description="기초 신체 기능을 기르는 펑셔널 무브와 사회성을 기르는 팀빌딩을 베이스로 운영됩니다."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {EDUCATION_V0_PROGRAMS.map((program) => (
              <article
                key={program.number}
                className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <div className="relative aspect-[16/8.5] overflow-hidden">
                  <EducationV0Image
                    src={program.image}
                    alt={`${program.title} 수업 모습`}
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" aria-hidden />
                  <div className="absolute left-5 top-5 rounded-full bg-slate-950/70 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    {program.target}
                  </div>
                  <span className="absolute bottom-5 right-5 text-sm font-bold text-white/80">{program.number}</span>
                </div>
                <div className="p-7">
                  <h3 className="text-xl font-bold text-slate-950">{program.title}</h3>
                  <p className="mt-2 font-semibold text-blue-600">{program.subtitle}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{program.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {program.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Field records + reviews */}
      <section id="records" className="scroll-mt-28 bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="FIELD RECORDS & REVIEWS"
            title="현장의 기록과 담당자님의 평가가 증명합니다"
            description="다양한 공간과 아이들을 만난 수업의 기록, 그리고 현장을 가장 가까이에서 지켜본 담당자님의 이야기입니다."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {EDUCATION_V0_FIELD_RECORDS.map((record) => (
              <article
                key={record.title}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="relative aspect-[1.25] overflow-hidden">
                  <EducationV0Image
                    src={record.image}
                    alt={`${record.title} 현장 수업`}
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" aria-hidden />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-950">{record.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{record.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.items.map((item) => (
              <blockquote
                key={item.headline}
                className="flex min-h-64 flex-col rounded-3xl border border-slate-100 bg-slate-50 p-8"
              >
                {item.showStars ? (
                  <div className="flex gap-1 text-amber-400" aria-label="별점 5점">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} aria-hidden>
                        ★
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-5 text-xl font-bold leading-8 text-slate-900">{item.headline}</p>
                <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-auto flex items-center gap-3 pt-7">
                  <span className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {item.name.slice(0, 1)}
                  </span>
                  <span className="text-xs leading-5 text-slate-500">
                    <strong className="block text-slate-800">{item.name}</strong>
                    {item.org}
                  </span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Three-step onboarding */}
      <section className="bg-slate-50 py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <Eyebrow>EASY ONBOARDING</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 md:text-4xl">
              조건이 아직 정리되지 않아도 괜찮습니다
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              기관명과 예상 인원만 알려주셔도 문의 접수 후 최단 7일 이내에 맞춤 체육 수업이 시작됩니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:col-span-8">
            {onboardingSteps.map(([step, title, desc], index) => (
              <div key={step} className="relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="text-sm font-black text-blue-600">STEP {step}</span>
                <div className="mt-12">
                  <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p>
                </div>
                {index < 2 ? (
                  <ChevronRight
                    className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full bg-blue-600 p-1 text-white lg:block"
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-28 bg-white py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950">
              기관 담당자분들이 자주 묻는 질문
            </h2>
            <div className="mt-8 rounded-3xl bg-blue-50 p-6">
              <p className="font-bold text-blue-900">카카오톡으로 빠르게 상담하세요</p>
              <p className="mt-2 text-sm leading-6 text-blue-700">운영 조건을 간단히 남겨주시면 확인 후 연락드립니다.</p>
              {KAKAO_CHANNEL_URL ? (
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex rounded-full bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-slate-900"
                >
                  카카오톡 채널 상담 <ArrowRight className="ml-2 size-4" aria-hidden />
                </a>
              ) : (
                <a href="#contact" className="mt-5 inline-flex rounded-full bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-slate-900">
                  운영안 요청하기 <ArrowRight className="ml-2 size-4" aria-hidden />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-8">
            {faqItems.map(([question, answer], index) => (
              <details key={question} open={index === 0} className="group rounded-2xl border border-slate-200 px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                  <span>
                    <span className="mr-4 text-sm text-blue-600">0{index + 1}</span>
                    {question}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-open:rotate-90" aria-hidden />
                </summary>
                <p className="mt-4 pl-9 text-sm leading-7 text-slate-500">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Contact + operational form */}
      <section id="contact" className="scroll-mt-28 bg-slate-900 py-24 text-white md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <Eyebrow>REQUEST A PLAN</Eyebrow>
            <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              우리 기관에 맞는
              <br />
              <span className="text-blue-400">운영안</span>을 받아보세요
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              복잡한 조건을 먼저 정리하지 않으셔도 괜찮습니다. 기관명과 예상 인원부터 편하게 남겨주세요.
            </p>
            <div className="mt-10 flex flex-col gap-4 text-sm text-slate-200">
              <a href={brandContactLinks.phone} className="font-semibold hover:text-white">
                {brandProfile.phone}
              </a>
              <a href={brandContactLinks.email} className="font-semibold hover:text-white">
                {brandProfile.email}
              </a>
              {KAKAO_CHANNEL_URL ? (
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex w-fit rounded-full bg-[#FEE500] px-5 py-3 font-bold text-slate-900"
                >
                  카카오톡 채널 바로가기 <ArrowRight className="ml-2 size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
          <div className="lg:col-span-7">
            <Suspense fallback={<div className="min-h-[320px] rounded-3xl bg-white/10" aria-hidden />}>
              <DispatchProposalForm variant="educationV0" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-lg flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-900/90 px-3 py-3 text-white shadow-xl backdrop-blur-md sm:w-auto sm:max-w-fit sm:flex-nowrap sm:gap-5 sm:rounded-full sm:px-6">
        <p className="hidden text-sm font-medium sm:block">기관 맞춤 체육 수업, 제안서부터 받아보세요</p>
        <a href={brandContactLinks.phone} className="rounded-full px-3 py-2 text-sm font-bold text-slate-300 transition hover:text-white">
          전화 상담
        </a>
        <a
          href="#contact"
          className="whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          운영안 요청하기 <ArrowRight className="ml-1 inline size-4" aria-hidden />
        </a>
      </div>
    </main>
  );
}
