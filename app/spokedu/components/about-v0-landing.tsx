'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from 'lucide-react';
import { PUBLIC_V0_METRICS } from '../data/marketing-public-metrics';
import {
  ABOUT_V0_HERO,
  ABOUT_V0_HQ_ADDRESS,
  ABOUT_V0_LAB_VISUAL,
  ABOUT_V0_LEADER_PHOTO_CLASS,
  ABOUT_V0_LEADERS,
  ABOUT_V0_MILESTONES,
} from '../data/about-v0-media';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  INSTAGRAM_URL,
  KAKAO_CHANNEL_URL,
  NAVER_BLOG_URL,
} from '../data/external-channels';
import { SPOKEDU_PATHS } from '../data/public-routes';
import {
  koreanLineBreak,
  v0BentoCard,
  v0CardImageHover,
  v0CardInnerPad,
  v0CardTitle,
  v0GradientText,
  v0HeroTitle,
  v0Lead,
  v0LeaderPhotoFrame,
  v0SectionBand,
  v0SectionTitle,
} from '../lib/ui-classes';
import { V0Eyebrow } from './v0-ui';

const values = [
  ['01', 'EXPERTISE', '전문성', '연세대학교 체육교육과 출신 연구진이 아동 발달 단계와 운동 학습 이론에 근거하여 체계적인 연간 커리큘럼을 직접 설계합니다.'],
  ['02', 'INCLUSIVITY', '포용성', '운동 신경이 뛰어난 아이만 주인공이 되는 체육을 거부합니다. 느린 학습자와 특수 체육이 필요한 아이까지 모두가 성취감을 느끼는 규칙을 만듭니다.'],
  ['03', 'PRACTICALITY', '실전성', `3만 명 이상의 교육 팔로워와 소통하고 ${PUBLIC_V0_METRICS.institutions.value} ${PUBLIC_V0_METRICS.institutions.label} 현장에서 검증된 데이터로 어떤 공간과 인원에서도 작동하는 솔루션을 제안합니다.`],
  ['04', 'LEADERSHIP', '생태계 확장', '에듀테크 SPOMOVE, 수업 운영 플랫폼 SPOKEDU LAB, 그리고 체육 지도자 커뮤니티 놀랩(NOLLAB)을 통해 강사들과 함께 성장하는 플랫폼을 지향합니다.'],
] as const;

const ecosystem = [
  {
    num: '01',
    title: '현장 체육 교육',
    subtitle: '학교·기관·개인·소그룹',
    desc: '학교·복지관·키움센터 맞춤형 정기 출강, 특수·포용 체육, 미니 올림픽 및 개인·소그룹 수업 운영',
    href: SPOKEDU_PATHS.education,
    linkLabel: '기관·개인 수업 보기 →',
  },
  {
    num: '02',
    title: '에듀테크 & 전문 교구',
    subtitle: 'SPOMOVE · SPOMAT',
    desc: '시지각·반응 연습용 SPOMOVE 소프트웨어와 전용 스포매트(스포매트)를 자체 제작·보급합니다. KC 공급자적합성 등 인증·시험 범위는 제품별로 안내드립니다.',
    href: SPOKEDU_PATHS.spomove,
    linkLabel: 'SPOMOVE 자세히 보기 →',
  },
  {
    num: '03',
    title: '지도자 SaaS 플랫폼',
    subtitle: 'SPOKEDU LAB',
    desc: '커리큘럼 아카이브 탐색부터 출강 일정, 출석, 학부모 리포트 생성까지 지원하는 체육 교육 통합 운영 시스템',
    href: SPOKEDU_PATHS.subscription,
    linkLabel: 'SPOKEDU LAB 바로가기 →',
  },
] as const;

export function AboutV0Landing() {
  return (
    <div className={`bg-white text-slate-950 ${koreanLineBreak} break-keep`} data-spokedu-about-sections="v0">
      <section className={`px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <V0Eyebrow>스포키듀 소개 · 놀고, 생각하고, 성장하기</V0Eyebrow>
            <h1
              id="about-hero-title"
              className={`mt-8 text-balance ${v0HeroTitle}`}
            >
              단 한 명의 아이도
              <br />
              <span className={v0GradientText}>소외되지 않는</span>
              <br />
              체육 교육의 기준을 만듭니다.
            </h1>
            <p className={`mt-8 max-w-xl ${v0Lead}`}>
              스포키듀(SPOKEDU)는 연세대학교 체육교육과 출신 전문가들이 모여 시작한 아동·청소년 체육교육 전문
              기업입니다. 학문적 근거와 수천 건의 현장 데이터를 결합해, 단순한 신체 활동을 넘어 스스로 생각하고
              함께 성장하는 교육을 실현합니다.
            </p>
            <p className="mt-10 border-l-4 border-blue-600 pl-4 text-sm font-semibold leading-7 text-slate-700">
              아이들의 가능성이 움직이는 순간을 현장에서 만듭니다.
            </p>
          </div>
          <div className="relative">
            <div className="relative aspect-[0.92] overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl shadow-blue-950/10 md:aspect-[1.05]">
              <Image
                src={ABOUT_V0_HERO.src}
                alt={ABOUT_V0_HERO.alt}
                fill
                priority
                className="object-cover"
                style={{ objectPosition: ABOUT_V0_HERO.objectPosition }}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" aria-hidden />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl bg-white/95 p-4 backdrop-blur md:bottom-8 md:left-8 md:right-8 md:p-5">
                <span className="text-sm font-bold text-slate-900 break-keep">학문적 근거와 현장 실전성의 결합</span>
                <ArrowUpRight className="size-5 shrink-0 text-blue-600" aria-hidden />
              </div>
            </div>
            <div className="absolute right-4 top-4 flex size-20 items-center justify-center rounded-full bg-blue-600 p-3 text-center text-[11px] font-bold leading-4 text-white shadow-xl md:right-6 md:top-6 md:size-24 md:p-4">
              함께
              <br />
              움직임
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <V0Eyebrow>우리의 철학</V0Eyebrow>
            <h2 className={`mt-5 ${v0SectionTitle}`}>스포키듀가 지키는 네 가지 교육 원칙</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {values.map(([num, en, ko, desc]) => (
              <article
                key={num}
                className={`${v0BentoCard} rounded-3xl border-slate-200/80 bg-white shadow-sm ${v0CardInnerPad}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-bold text-blue-600">{num}</span>
                  <Sparkles className="size-5 text-slate-300" aria-hidden />
                </div>
                <h3 className={`mt-8 md:mt-10 ${v0CardTitle}`}>{ko}</h3>
                <p className="mt-1 text-xs font-bold tracking-wide text-slate-400">{en}</p>
                <p className={`mt-4 ${v0Lead}`}>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <V0Eyebrow>리더십과 팀</V0Eyebrow>
          <h2 className={`mt-5 max-w-3xl ${v0SectionTitle}`}>
            수업을 설계한 사람들이 현장의 품질을 끝까지 책임집니다
          </h2>
          <p className={`mt-6 max-w-2xl ${v0Lead}`}>
            본사 코어 매니지먼트 팀(대표·총괄·수업팀장)의 직영 관리 시스템과 약 30명의 검증된 전문 지도자가 하나의
            기준으로 움직입니다.
          </p>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {ABOUT_V0_LEADERS.map((leader) => (
              <article
                key={leader.name}
                className={`${v0BentoCard} overflow-hidden rounded-3xl border-slate-100 bg-slate-50`}
              >
                <div className={v0LeaderPhotoFrame}>
                  <Image
                    src={leader.photo}
                    alt={`${leader.role} ${leader.name}`}
                    fill
                    className={`${ABOUT_V0_LEADER_PHOTO_CLASS} ${v0CardImageHover}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className={v0CardInnerPad}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{leader.num}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950">
                    {leader.name}
                    <span className="ml-2 text-base font-bold text-slate-500">{leader.role}</span>
                  </h3>
                  <p className="mt-1 min-h-[1rem] text-xs font-bold tracking-[0.16em] text-blue-600">
                    {leader.nameEn}
                  </p>
                  <p className={`mt-3 ${v0Lead}`}>{leader.bio}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-10 rounded-3xl bg-slate-900 p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-blue-300">NOLLAB(놀랩) &amp; 지도자 교육 세미나</p>
              <h3 className="mt-4 text-2xl font-black">함께 배우고, 함께 성장하는 지도자 커뮤니티</h3>
              <p className="mt-4 max-w-2xl leading-7 text-slate-400 break-keep">
                스포키듀는 단순 강사 중개를 하지 않습니다. 지도자 커뮤니티{' '}
                <strong className="font-bold text-slate-200">놀랩(NOLLAB)</strong>과 SPOKEDU LAB 정기 세미나,
                대학·체육회 협력 교육을 통해 검증된 지도자들과 수업의 기준을 공유합니다.
              </p>
            </div>
            <div className="flex gap-8 border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <div>
                <p className="text-3xl font-black text-blue-300">{PUBLIC_V0_METRICS.instructors.value}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {PUBLIC_V0_METRICS.instructors.label}
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-blue-300">연 20회+</p>
                <p className="mt-1 text-sm text-slate-400 break-keep">
                  실전 체육 세미나
                  <br />
                  및 교육 운영
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-white px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <V0Eyebrow>주요 연혁</V0Eyebrow>
          <h2 className={`mt-5 max-w-3xl ${v0SectionTitle}`}>주요 연혁</h2>
          <p className={`mt-6 max-w-2xl ${v0Lead}`}>
            현장 출강에서 시작해 에듀테크와 지도자 플랫폼까지, 스포키듀가 쌓아 온 성장의 발자취입니다.
          </p>
          <div className="relative mt-10 ml-3 border-l-2 border-blue-600 pl-8 md:ml-4 md:pl-10">
            {ABOUT_V0_MILESTONES.map((item) => (
              <article key={item.when + item.title} className="relative pb-10 last:pb-0">
                <span
                  className="absolute -left-[calc(2rem+5px)] top-1.5 size-3 rounded-full bg-blue-600 ring-4 ring-white md:-left-[calc(2.5rem+5px)]"
                  aria-hidden
                />
                <time className="text-sm font-black tracking-tight text-blue-600">{item.when}</time>
                <p className="mt-3 text-base font-bold leading-7 text-slate-800 break-keep md:text-lg">{item.title}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <V0Eyebrow>하는 일</V0Eyebrow>
          <h2 className={`mt-5 max-w-3xl ${v0SectionTitle}`}>
            오프라인 현장부터 디지털 솔루션까지 연결합니다
          </h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {ecosystem.map(({ num, title, subtitle, desc, href, linkLabel }) => (
              <Link
                key={num}
                href={href}
                className={`${v0BentoCard} flex h-full flex-col rounded-3xl border-slate-200/80 bg-white ${v0CardInnerPad}`}
              >
                <span className="text-sm font-bold text-blue-600">{num}</span>
                <h3 className={`mt-10 md:mt-14 ${v0CardTitle}`}>{title}</h3>
                <p className="mt-2 text-xs font-bold text-slate-500">{subtitle}</p>
                <p className="mt-6 flex-1 leading-7 text-slate-500 break-keep">{desc}</p>
                <span className="mt-10 text-sm font-bold text-blue-600 transition group-hover:underline">
                  {linkLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={`px-6 md:px-10 lg:px-16 ${v0SectionBand}`}>
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 lg:grid-cols-[5fr_7fr]">
          <div className={v0CardInnerPad}>
            <V0Eyebrow>SPOKEDU LAB 본사</V0Eyebrow>
            <h2 className={`mt-6 ${v0SectionTitle}`}>
              스포키듀LAB 센터 및 본사 안내
            </h2>
            <p className="mt-5 leading-7 text-slate-500 break-keep">
              프로그램 연구 개발, 지도자 세미나, 소그룹 수업이 이루어지는 스포키듀의 오프라인 거점 공간입니다.
            </p>
            <dl className="mt-10 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-bold text-slate-900">상호명 · 대표</dt>
                <dd className="mt-1 text-slate-500">
                  스포키듀 (SPOKEDU) · {brandProfile.representative}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-900">대표 번호 · 이메일</dt>
                <dd className="mt-1 flex flex-col gap-2 text-slate-500">
                  <a href={brandContactLinks.phone} className="inline-flex items-center gap-2 font-medium hover:text-blue-600">
                    <Phone className="size-4 text-blue-600" aria-hidden />
                    {brandProfile.phone}
                  </a>
                  <a href={brandContactLinks.email} className="inline-flex items-center gap-2 font-medium hover:text-blue-600">
                    <Mail className="size-4 text-blue-600" aria-hidden />
                    {brandProfile.email}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-bold text-slate-900">주소</dt>
                <dd className="mt-1 flex items-start gap-2 text-slate-500 break-keep">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
                  {ABOUT_V0_HQ_ADDRESS}
                </dd>
              </div>
            </dl>
            <div className="mt-10 flex flex-wrap gap-2">
              {INSTAGRAM_URL ? (
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-blue-600"
                >
                  <Camera className="mr-1 inline size-3" aria-hidden />
                  @spokedu_kids
                </a>
              ) : null}
              {NAVER_BLOG_URL ? (
                <a
                  href={NAVER_BLOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-blue-600"
                >
                  네이버 블로그
                </a>
              ) : null}
              {KAKAO_CHANNEL_URL ? (
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-blue-600"
                >
                  <MessageCircle className="mr-1 inline size-3" aria-hidden />
                  카카오톡 상담
                </a>
              ) : null}
            </div>
          </div>
          <div className="relative min-h-[430px] overflow-hidden bg-slate-200">
            <Image
              src={ABOUT_V0_LAB_VISUAL.src}
              alt={ABOUT_V0_LAB_VISUAL.alt}
              fill
              className="object-cover brightness-110 contrast-105"
              style={{ objectPosition: ABOUT_V0_LAB_VISUAL.objectPosition }}
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="text-white">
                <p className="text-xs font-bold text-blue-200">SPOKEDU LAB 방문</p>
                <p className="mt-2 text-lg font-bold break-keep">아이들의 움직임을 연구하는 공간</p>
              </div>
              <Link
                href={`${SPOKEDU_PATHS.education}#contact`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                기관 출강 및 파트너십 문의하기
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
