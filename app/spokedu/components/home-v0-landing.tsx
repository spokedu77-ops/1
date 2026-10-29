'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { brandContactLinks, brandProfile } from '../data/brand';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import {
  HOME_V0_CONTACT,
  HOME_V0_EXPERTISE,
  HOME_V0_FIELD_CASES,
  HOME_V0_HERO,
  HOME_V0_LAB_SCREEN,
  HOME_V0_SERVICES,
  HOME_V0_TEAM,
} from '../data/home-v0-media';
import {
  koreanLineBreak,
  v0BentoCard,
  v0CardImageHover,
  v0CardInnerPad,
  v0CardMediaFrame,
  v0CardMediaImgCover,
  v0CardTitle,
  v0CardTitleCompact,
  v0CtaButton,
  v0CtaButtonRow,
  v0CtaTitleOnDark,
  v0GradientText,
  v0HeroTitle,
  v0Lead,
  v0LeadOnDark,
  v0LeaderPhotoFrame,
  v0LeaderPhotoImg,
  v0SectionBand,
  v0SectionTitle,
} from '../lib/ui-classes';
import { PUBLIC_V0_METRICS } from '../data/marketing-public-metrics';
import { V0_KO } from '../data/v0-korean-labels';
import { SpomoveSignalGrid } from './spomove-signal-grid';
import { V0Eyebrow } from './v0-ui';

type HomeService = (typeof HOME_V0_SERVICES)[number];

function ServiceCard({ service }: { service: HomeService }) {
  const uiMock = service.href.includes('subscription');
  return (
    <article
      className={`${v0BentoCard} overflow-hidden rounded-3xl bg-white ${
        service.featured
          ? 'border-2 border-blue-600 shadow-xl shadow-blue-100/60'
          : 'border-transparent shadow-sm ring-1 ring-slate-100'
      }`}
    >
      <div className={`${v0CardMediaFrame} ${uiMock ? 'bg-slate-950' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={service.image}
          alt={service.imageAlt}
          className={`${uiMock ? 'h-full w-full object-contain p-3' : v0CardMediaImgCover} ${v0CardImageHover}`}
          style={{ objectPosition: service.imagePosition }}
        />
        {uiMock ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
            UI 목업
          </span>
        ) : null}
      </div>
      <div className={`flex min-h-[340px] flex-col ${v0CardInnerPad}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold tracking-[0.12em] text-blue-600">{service.number}</p>
          {service.featured ? (
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
              기관·학교 추천
            </span>
          ) : null}
        </div>
        <h3 className={`mt-4 ${v0CardTitle} text-slate-950`}>{service.title}</h3>
        <p className={`mt-4 ${v0Lead} ${koreanLineBreak}`}>{service.description}</p>
        <p className="mt-auto pt-7 text-xs font-medium leading-6 text-slate-400">{service.tags}</p>
        <Link
          href={service.href}
          className={`mt-6 flex items-center justify-between rounded-2xl px-5 py-4 text-sm font-bold transition ${
            service.featured
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-50 text-slate-800 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          {service.cta}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function HomeV0Landing() {
  return (
    <div className={`overflow-hidden bg-white pb-8 text-slate-950 ${koreanLineBreak}`}>
      <section
        id="top"
        className={`mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20 ${v0SectionBand}`}
      >
        <div>
          <V0Eyebrow>아동·청소년 체육교육</V0Eyebrow>
          <h1
            id="home-heading"
            className={`mt-7 ${v0HeroTitle}`}
          >
            아이의 움직임을
            <br />
            <span className={v0GradientText}>성장의 경험</span>으로
            <br />
            설계합니다.
          </h1>
          <p className={`mt-8 max-w-xl ${v0Lead}`}>
            연세대학교 체육교육과 출신 전문가들이 학교·기관 출강부터 개인 맞춤 수업까지 직접 설계하고 운영합니다.
            현장의 검증된 데이터는 에듀테크 SPOMOVE와 지도자 솔루션 SPOKEDU LAB으로 확장됩니다.
          </p>
          <div className={`mt-10 ${v0CtaButtonRow}`}>
            <a
              href="#services"
              className={`${v0CtaButton} bg-blue-600 text-white transition hover:bg-blue-700`}
            >
              필요한 수업 찾기 <ArrowRight className="ml-2 inline size-4" aria-hidden />
            </a>
            <Link
              href={HOME_V0_CONTACT.contactHref}
              className={`${v0CtaButton} border-2 border-slate-200 bg-white text-slate-800 transition hover:border-slate-300 hover:bg-slate-50`}
            >
              수업 상담하기
            </Link>
          </div>
        </div>
        <div className="relative pb-16 sm:pb-0">
          <div className="aspect-[0.95] overflow-hidden rounded-3xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HOME_V0_HERO.src}
              alt={HOME_V0_HERO.alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: HOME_V0_HERO.objectPosition }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:absolute sm:bottom-4 sm:left-4 sm:right-4 sm:mt-0 sm:flex-row sm:items-stretch sm:justify-between">
            <div className="rounded-2xl bg-white/90 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-md sm:max-w-[11rem]">
              <p className={`text-3xl font-black tracking-tight ${v0GradientText}`}>
                {PUBLIC_V0_METRICS.institutions.value}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">{PUBLIC_V0_METRICS.institutions.label}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur-md sm:max-w-[11rem] sm:self-start">
              <Sparkles className="mb-2 size-5 text-blue-300" aria-hidden />
              <p className="text-xs font-bold leading-5">
                SPOMOVE 자체
                <br />
                에듀테크 보유
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className={`scroll-mt-28 bg-slate-50 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <V0Eyebrow>{V0_KO.choosePath}</V0Eyebrow>
            <h2 id="audience-heading" className={`mt-6 ${v0SectionTitle}`}>
              어떤 체육 교육이 필요하신가요?
            </h2>
            <p className={`mt-5 ${v0Lead}`}>대상의 목적과 환경에 맞는 최적의 솔루션을 선택해 보세요.</p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {HOME_V0_SERVICES.map((service) => (
              <ServiceCard key={service.number} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className={`scroll-mt-28 bg-[#0f172a] text-white ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <V0Eyebrow dark>{V0_KO.fromFieldToProduct}</V0Eyebrow>
            <h2 className={`mt-6 ${v0SectionTitle}`}>
              현장의 수업 경험을
              <br className="hidden md:block" /> 기술과 도구로 확장합니다
            </h2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <div
              className={`${v0BentoCard} flex h-full min-h-full flex-col justify-between rounded-3xl border-slate-700/50 bg-slate-800/70 ${v0CardInnerPad} ring-1 ring-slate-700 lg:col-span-7`}
            >
              <div>
                <V0Eyebrow dark>에듀테크 SPOMOVE</V0Eyebrow>
                <h3 className={`mt-6 ${v0CardTitle} text-white`}>
                  SPOMOVE : 보고, 판단하고,
                  <br /> 몸으로 반응하는 시지각 체육
                </h3>
                <p className={`mt-4 max-w-lg ${v0LeadOnDark}`}>
                  화면의 색·위치 자극을 인지하고 SPOMAT 위에서 반응하며, 수업 안에서 규칙·협응을 연습합니다. 의학적
                  치료 효과를 주장하지 않습니다.
                </p>
                <SpomoveSignalGrid className="mt-9" />
              </div>
              <Link
                href={HOME_V0_CONTACT.spomoveHref}
                className="mt-8 inline-flex shrink-0 items-center text-sm font-bold text-blue-300 hover:text-white"
              >
                SPOMOVE &amp; 스포매트 알아보기 <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </div>
            <div
              className={`${v0BentoCard} flex h-full min-h-full flex-col justify-between rounded-3xl border-slate-700/50 bg-slate-800/70 ${v0CardInnerPad} ring-1 ring-slate-700 lg:col-span-5`}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <V0Eyebrow dark>지도자 SaaS · LAB</V0Eyebrow>
                <h3 className={`mt-6 ${v0CardTitle} text-white`}>
                  SPOKEDU LAB :<br /> 수업을 찾고 현장을 운영합니다
                </h3>
                <p className={`mt-4 ${v0LeadOnDark}`}>
                  조건별 놀이체육 프로그램 검색부터 반별 일정, 출석, 학부모 리포트 생성까지 지도자의 모든 워크플로우를
                  연결합니다.
                </p>
                <div className="relative mt-9 min-h-[280px] flex-1 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-700 lg:min-h-[320px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HOME_V0_LAB_SCREEN.src}
                    alt={HOME_V0_LAB_SCREEN.alt}
                    className="absolute inset-0 h-full w-full object-contain object-top p-2"
                    style={{ objectPosition: HOME_V0_LAB_SCREEN.objectPosition }}
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
                    UI 목업
                  </span>
                </div>
              </div>
              <Link
                href={HOME_V0_CONTACT.labHref}
                className="mt-8 inline-flex shrink-0 items-center text-sm font-bold text-blue-300 hover:text-white"
              >
                기능 및 요금제 확인하기 <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className={`scroll-mt-28 bg-white ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <V0Eyebrow>{V0_KO.peopleExpertise}</V0Eyebrow>
            <h2 className={`mt-6 ${v0SectionTitle}`}>
              수업을 설계한 전문가들이
              <br /> 현장을 끝까지 책임집니다
            </h2>
            <p className={`mt-5 ${v0Lead}`}>
              연세대학교 체육교육과 출신 리더십이 수업의 기준을 만들고 현장의 품질을 직접 관리합니다.
            </p>
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-4">
            <div className="flex flex-col gap-7">
              {HOME_V0_EXPERTISE.map((item, i) => (
                <div key={item} className="flex gap-4">
                  <span className="font-mono text-sm font-bold text-blue-600">0{i + 1}</span>
                  <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 sm:grid-cols-3 lg:col-span-3">
              {HOME_V0_TEAM.map((person) => (
                <div key={person.name} className={`${v0BentoCard} rounded-3xl bg-slate-50 ${v0CardInnerPad}`}>
                  <div className={v0LeaderPhotoFrame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.photo}
                      alt={`${person.role} ${person.name}`}
                      className={`${v0LeaderPhotoImg} ${v0CardImageHover}`}
                      style={{ objectPosition: person.photoObjectPosition ?? '50% 12%' }}
                    />
                  </div>
                  <h3 className="mt-6 font-bold">{person.name}</h3>
                  <p className="mt-1 text-xs font-bold text-blue-600">{person.role}</p>
                  <p className={`mt-4 ${v0Lead}`}>{person.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="cases" className={`scroll-mt-28 bg-slate-50 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className={v0SectionTitle}>
              서로 다른 현장에
              <br className="md:hidden" /> 서로 다른 수업을 설계합니다
            </h2>
            <Link href={HOME_V0_CONTACT.recordsHref} className="text-sm font-bold text-blue-600">
              전체 수업사례 보기 <ArrowRight className="ml-1 inline size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_V0_FIELD_CASES.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`${v0BentoCard} overflow-hidden rounded-3xl border-transparent bg-white shadow-sm`}
              >
                <div className={v0CardMediaFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.alt}
                    className={`${v0CardMediaImgCover} ${v0CardImageHover}`}
                    style={{ objectPosition: item.objectPosition }}
                  />
                </div>
                <div className={v0CardInnerPad}>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                    {item.category}
                  </span>
                  <h3 className={`mt-5 ${v0CardTitleCompact} leading-6`}>{item.title}</h3>
                  <p className={`mt-2 ${v0Lead}`}>{item.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className={`scroll-mt-28 bg-white px-6 ${v0SectionBand}`}>
        <div className={`mx-auto max-w-7xl rounded-3xl bg-blue-600 text-white ${v0CardInnerPad} lg:p-10`}>
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold tracking-wide text-blue-100">상담·문의</p>
              <h2 className={`mt-4 max-w-2xl ${v0CtaTitleOnDark}`}>
                우리 아이, 우리 기관에 딱 맞는
                <br className="hidden md:block" /> 체육 수업을 찾고 계신가요?
              </h2>
            </div>
            <div className={`max-w-full sm:max-w-none ${v0CtaButtonRow}`}>
              <Link
                href={HOME_V0_CONTACT.institutionHref}
                className={`${v0CtaButton} justify-between bg-white text-blue-700 sm:justify-center`}
              >
                기관·학교 출강 문의하기 <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={HOME_V0_CONTACT.privateHref}
                className={`${v0CtaButton} justify-between bg-blue-500 text-white sm:justify-center`}
              >
                개인·소그룹 수업 문의하기 <ArrowRight className="size-4" aria-hidden />
              </Link>
              {KAKAO_CHANNEL_URL ? (
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${v0CtaButton} justify-between border border-blue-300 text-white sm:justify-center`}
                >
                  카카오톡 간편 상담 <ExternalLink className="size-4" aria-hidden />
                </a>
              ) : (
                <a
                  href={brandContactLinks.phone}
                  className={`${v0CtaButton} justify-between border border-blue-300 text-white sm:justify-center`}
                >
                  전화 상담 {brandProfile.phone} <ArrowRight className="size-4" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
