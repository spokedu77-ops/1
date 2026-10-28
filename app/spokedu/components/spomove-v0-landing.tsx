'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  ExternalLink,
  Footprints,
  Layers3,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import { SPOMOVE_V0_HERO, SPOMOVE_V0_LINKS } from '../data/spomove-v0-media';
import {
  koreanLineBreak,
  v0BentoCard,
  v0CardTitle,
  v0CardTitleCompact,
  v0CtaTitleOnDark,
  v0EyebrowHero,
  v0GradientText,
  v0HeroTitle,
  v0Lead,
  v0SectionBand,
  v0SectionKicker,
  v0SectionTitle,
  v0SubsectionTitle,
} from '../lib/ui-classes';
import { V0Eyebrow } from './v0-ui';

const steps = [
  {
    number: '01',
    label: 'SEE',
    title: '시각 정보 인지',
    description:
      '화면에 나타나는 색상, 숫자, 방향, 도형 등 다양한 시각 자극과 단서를 순간적으로 포착합니다.',
    icon: Target,
  },
  {
    number: '02',
    label: 'THINK',
    title: '두뇌 판단 및 억제',
    description:
      '단순 반응부터 조건부 규칙까지 두뇌에서 정답 위치를 빠르게 계산하고 불필요한 반응을 억제합니다.',
    icon: Brain,
  },
  {
    number: '03',
    label: 'MOVE',
    title: '신체 반응 및 이동',
    description:
      '전용 스포매트 위에서 정확한 스텝, 점프, 터치 동작으로 반응하며 민첩성과 협응력을 기릅니다.',
    icon: Footprints,
  },
] as const;

const modules = [
  {
    index: '01',
    title: '몰입형 시지각 웜업',
    english: 'IIWarmup',
    description:
      '본 수업 시작 전 5~10분 만에 아이들의 시선과 집중력을 화면으로 모으고 심박수를 끌어올리는 고효율 도입 프로그램',
    color: 'bg-blue-600',
    icon: Sparkles,
  },
  {
    index: '02',
    title: '기초 반응 및 방향 전환',
    english: 'Reaction & Agility',
    description:
      '무작위로 변하는 색상과 방향 신호에 맞춰 스텝을 밟으며 순발력과 하체 밸런스를 기르는 훈련',
    color: 'bg-amber-400',
    icon: Zap,
  },
  {
    index: '03',
    title: '인지 부하 & 이중 과제',
    english: 'Dual-Task Brain',
    description:
      '계산, 기억, 색상 반전 등 인지 과제를 풀면서 동시에 몸을 움직여 두뇌 실행 기능을 극대화하는 훈련',
    color: 'bg-emerald-500',
    icon: Layers3,
  },
  {
    index: '04',
    title: '협동 및 대결 모드',
    english: 'Team Challenge',
    description:
      '2인 이상이 호흡을 맞추거나 릴레이로 참여하여 현장 분위기를 최고조로 끌어올리는 그룹 게임 모드',
    color: 'bg-rose-500',
    icon: Users,
  },
] as const;

const cognitiveTasks = [
  {
    code: 'SIMON',
    title: '사이먼 효과',
    subtitle: '위치 충돌 억제',
    description: '순서·위치 기억과 동시에 불필요한 반응을 억제하며 주의 전환 능력을 훈련합니다.',
  },
  {
    code: 'FLANKER',
    title: '플랭커',
    subtitle: '방해 자극 분리',
    description: '중앙 목표만 선택하고 주변 방해 자극을 걸러내는 선택적 주의력을 강화합니다.',
  },
  {
    code: 'STROOP',
    title: '스트룹 과제',
    subtitle: '의미와 색 충돌 통제',
    description: '글자 의미와 색 정보가 충돌할 때 올바른 규칙을 유지하는 실행 기능을 훈련합니다.',
  },
  {
    code: 'DIVE',
    title: 'DIVE',
    subtitle: '가상 공간 전신 반응',
    description: '화면 속 경로를 읽고 전신 이동으로 반응해 공간 인지와 협응을 동시에 자극합니다.',
  },
  {
    code: 'RHYTHM',
    title: '리듬챌린지',
    subtitle: '타이밍 협응',
    description: '박자·리듬 신호에 맞춰 스텝과 점프를 맞추며 시간 감각과 하체 조절력을 기릅니다.',
  },
] as const;

const specs = [
  ['안전성 인증', 'KC 공급자적합성 확인 완료 및 미국 연방 가연성 시험(US 16 CFR 1630/1631) 기준 통과'],
  ['논슬립 & 내구성', '격렬한 점프와 스텝에도 밀리지 않는 강력한 바닥 논슬립 처리 및 고밀도 파일 원단'],
  ['직관적 4분할 설계', '시지각 인지에 최적화된 고채도 4색 분할로 유아부터 청소년, 특수 체육까지 즉시 활용'],
  ['휴대 및 보관성', '말아서 간편하게 이동·보관할 수 있어 방문 출강 및 다인원 동시 세팅에 최적화'],
] as const;

const experiencePaths = [
  {
    num: '01',
    title: '기관·학교 출강으로 만나기',
    description:
      '스포키듀 전문 강사가 노트북·장비와 스포매트를 직접 지참하여 기관 현장에서 수업 운영',
    href: SPOMOVE_V0_LINKS.institutionEducationContact,
    linkLabel: '기관 출강 문의',
  },
  {
    num: '02',
    title: '스포매트(SPOMAT) 교구 도입',
    description:
      '학교, 체육관, 복지관, 발달센터에 전용 스포매트 대량 납품 및 견적 지원 (전국 및 제주도 배송 가능)',
    href: SPOMOVE_V0_LINKS.spomat,
    linkLabel: 'SPOMAT 안내 보기',
  },
  {
    num: '03',
    title: 'SPOKEDU LAB 연동',
    description: '지도자용 플랫폼을 통해 현장에서 바로 활용할 수 있는 시지각 수업 콘텐츠 및 가이드 제공',
    href: SPOMOVE_V0_LINKS.lab,
    linkLabel: 'LAB 알아보기',
  },
] as const;

function SectionIntro({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className={`mx-auto max-w-3xl text-center ${koreanLineBreak} ${light ? 'text-white' : ''}`}>
      <V0Eyebrow className="mb-5">{eyebrow}</V0Eyebrow>
      <h2 className={`text-balance break-keep ${v0SectionTitle}`}>{title}</h2>
      {description ? (
        <p
          className={`mx-auto mt-5 max-w-2xl ${v0Lead} break-keep ${light ? 'text-slate-300' : ''}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

const SPOMOVE_SIGNAL_COLORS = ['#2563eb', '#fbbf24', '#22c55e', '#f43f5e'] as const;

function SpomoveSignalGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-2xl bg-slate-900 p-4 ${compact ? '' : 'mt-4'}`}
      aria-hidden
    >
      {SPOMOVE_SIGNAL_COLORS.map((color, i) => (
        <div
          key={color}
          style={{ backgroundColor: color }}
          className={`flex items-center justify-center rounded-xl ${
            compact ? 'aspect-square' : 'aspect-[1.5]'
          } ${i === 0 ? 'shadow-[0_0_30px_rgba(37,99,235,0.55)]' : ''}`}
        >
          <span className={`font-black text-white/85 ${compact ? 'text-xl' : 'text-2xl'}`}>{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className="absolute -inset-8 rounded-full bg-blue-500/20 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4 text-[10px] font-bold tracking-[0.18em] text-slate-400">
          <span>SPOMOVE / LIVE SESSION</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
            READY
          </span>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950/70">
          <Image
            src={SPOMOVE_V0_HERO.src}
            alt={SPOMOVE_V0_HERO.alt}
            fill
            className="object-cover"
            style={{ objectPosition: SPOMOVE_V0_HERO.objectPosition }}
            sizes="(max-width: 1024px) 100vw, 540px"
            priority
          />
        </div>
        <SpomoveSignalGrid />
        <p className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 break-keep">
          <span className="size-2 rounded-full bg-blue-400" aria-hidden />
          SPOMAT 4색 시그널 · 화면-매트 1:1 연동
        </p>
      </div>
    </div>
  );
}

export function SpomoveV0Landing() {
  return (
    <main
      className={`overflow-hidden bg-white text-slate-900 ${koreanLineBreak}`}
      data-spokedu-spomove-sections="response-in-motion"
    >
      <section className="relative bg-[#0F172A] text-white">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(37,99,235,0.18),transparent_30%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-10 lg:px-12 lg:py-28">
          <div>
            <span className={`mb-7 ${v0EyebrowHero} break-keep`}>COGNITIVE MOTOR EDUTECH</span>
            <h1
              id="spomove-hero-heading"
              className={`max-w-xl text-balance break-keep ${v0HeroTitle}`}
            >
              보고, 판단하고,
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
                몸으로 반응하는
              </span>
              <br />
              <span className={v0GradientText}>시지각 브레인 체육</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-slate-300 break-keep sm:text-lg">
              SPOMOVE(스포무브)는 화면의 시각 자극을 인지해 즉각적인 신체 움직임으로 연결하는 인터랙티브 체육
              솔루션입니다. 단순한 신체 활동을 넘어 주의집중력, 판단력, 순발력을 동시에 깨웁니다.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={SPOMOVE_V0_LINKS.institutionDispatch}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                SPOMOVE 도입 및 수업 문의
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#spomat"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                전용 교구 SPOMAT 스펙 보기
                <ChevronRight className="size-4" aria-hidden />
              </a>
              <Link
                href={SPOMOVE_V0_LINKS.catalog}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/5"
              >
                SPOMOVE 카탈로그
                <MoveUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className={`bg-white px-6 sm:px-10 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <SectionIntro
            eyebrow="CORE MECHANISM"
            title="두뇌의 인지와 신체의 움직임을 하나로 연결합니다"
            description="아이들은 게임처럼 즐겁게 몰입하는 동안 보고-생각하고-움직이는 고차원적 신경 협응 과정을 반복합니다."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {steps.map(({ number, label, title, description, icon: Icon }) => (
              <article
                key={number}
                className={`${v0BentoCard} rounded-3xl border-slate-200/70 bg-slate-50 p-6 sm:p-8`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <span className="text-sm font-black tracking-[0.18em] text-slate-300">STEP {number}</span>
                </div>
                <div className="mt-10 sm:mt-12">
                  <span className="text-xs font-black tracking-[0.2em] text-blue-600">{label}</span>
                  <h3 className={`mt-3 ${v0CardTitle} break-keep`}>{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-500 break-keep">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 px-6 sm:px-10 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="TRAINING MODULES" title="연령과 목적에 맞춰 단계별로 확장되는 훈련 콘텐츠" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {modules.map(({ index, title, english, description, color, icon: Icon }) => (
              <Link
                key={index}
                href={SPOMOVE_V0_LINKS.catalog}
                className={`${v0BentoCard} relative block overflow-hidden rounded-3xl border-slate-200/80 bg-white p-6 shadow-sm sm:p-8`}
              >
                <div className={`mb-10 flex size-12 items-center justify-center rounded-2xl ${color} text-slate-950 sm:mb-12`}>
                  <Icon className="size-6" aria-hidden />
                </div>
                <span className="absolute right-6 top-6 text-5xl font-black tracking-[-0.08em] text-slate-100 sm:right-8 sm:top-8">
                  {index}
                </span>
                <span className="text-xs font-bold tracking-[0.16em] text-blue-600">{english}</span>
                <h3 className={`mt-3 ${v0CardTitle} break-keep`}>{title}</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500 break-keep">{description}</p>
                <div className="mt-7 flex items-center gap-2 text-xs font-bold text-slate-400 transition group-hover:text-blue-600">
                  공식 카탈로그에서 보기
                  <MoveUpRight className="size-4" aria-hidden />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16">
            <p className="text-center text-xs font-bold tracking-[0.18em] text-blue-600 break-keep">
              CORE COGNITIVE TASKS
            </p>
            <h3 className={`mt-3 text-center break-keep ${v0SubsectionTitle}`}>SPOMOVE 핵심 인지 과제 5종</h3>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cognitiveTasks.map((task) => (
                <article
                  key={task.code}
                  className={`${v0BentoCard} min-w-[min(100%,280px)] shrink-0 snap-start rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm sm:min-w-[300px] sm:p-6`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black tracking-[0.14em] text-blue-600">{task.code}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 break-keep">
                      {task.subtitle}
                    </span>
                  </div>
                  <h4 className={`mt-4 ${v0CardTitleCompact} break-keep`}>{task.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-500 break-keep">{task.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="spomat" className={`scroll-mt-24 bg-white px-6 sm:px-10 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 shadow-xl shadow-slate-900/10 sm:p-8">
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">SPOMAT / 4-PANEL TARGET</p>
              <SpomoveSignalGrid compact />
              <div className="absolute -right-3 -top-3 flex size-20 flex-col items-center justify-center rounded-full border-4 border-white bg-blue-600 text-center text-[9px] font-black leading-tight text-white shadow-lg sm:-right-4 sm:-top-4">
                <ShieldCheck className="mb-1 size-5" aria-hidden />
                KC
                <br />
                CERTIFIED
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-slate-500 break-keep">
              <Link href={SPOMOVE_V0_LINKS.spomat} className="font-bold text-blue-600 hover:underline">
                SPOMAT 제품·이용 안내
              </Link>
              {' · '}
              <Link href={SPOMOVE_V0_LINKS.spomatPurchaseInquiry} className="font-bold text-blue-600 hover:underline">
                구매·견적 문의
              </Link>
            </p>
          </div>
          <div className="lg:col-span-3">
            <V0Eyebrow className="mb-5">DEDICATED HARDWARE</V0Eyebrow>
            <h2 className={`max-w-2xl break-keep ${v0SectionTitle}`}>
              SPOMAT : 안전과 직관성을 모두 잡은 전용 타겟 매트
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 break-keep">
              화면 속 그리드와 1:1로 대응하도록 설계된 스포키듀 자체 제작 전용 교구입니다. 교실, 강당, 센터 어디든
              펼치는 순간 인터랙티브 체육관이 완성됩니다.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {specs.map(([title, description]) => (
                <div key={title} className={`${v0BentoCard} rounded-2xl bg-slate-50 p-5 sm:p-6`}>
                  <div className="flex items-center gap-2 text-sm font-bold break-keep">
                    <Check className="size-4 shrink-0 text-blue-600" aria-hidden />
                    {title}
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-500 break-keep">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`bg-slate-50 px-6 sm:px-10 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <SectionIntro eyebrow="WAYS TO EXPERIENCE SPOMOVE" title="SPOMOVE를 만나는 3가지 방법" />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {experiencePaths.map(({ num, title, description, href, linkLabel }) => (
              <article
                key={num}
                className={`${v0BentoCard} flex h-full flex-col rounded-3xl border-slate-200 bg-white p-6 sm:p-7`}
              >
                <span className="text-sm font-black text-blue-600">{num}</span>
                <h3 className={`mt-8 break-keep sm:mt-10 ${v0CardTitleCompact}`}>{title}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-500 break-keep">{description}</p>
                <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                  {linkLabel}
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>

          <div id="contact" className="mt-16 scroll-mt-24 rounded-3xl bg-slate-900 p-6 text-white sm:mt-20 sm:p-10 lg:p-12">
            <div className="flex flex-col justify-between gap-9 lg:flex-row lg:items-end">
              <div>
                <p className={`${v0SectionKicker} text-blue-400 break-keep`}>START WITH SPOMOVE</p>
                <h2 className={`mt-4 max-w-2xl break-keep ${v0CtaTitleOnDark}`}>
                  우리 학교와 기관에 SPOMOVE와 스포매트를 도입해 보세요
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={SPOMOVE_V0_LINKS.institutionEducationContact}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold hover:bg-blue-500"
                >
                  기관 출강 수업 문의하기
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href={SPOMOVE_V0_LINKS.spomatPurchaseInquiry}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold hover:bg-white/10"
                >
                  스포매트 구매·견적 문의
                  <ExternalLink className="size-4" aria-hidden />
                </Link>
                {KAKAO_CHANNEL_URL ? (
                  <a
                    href={KAKAO_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold hover:bg-white/10"
                  >
                    카카오톡 상담
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
