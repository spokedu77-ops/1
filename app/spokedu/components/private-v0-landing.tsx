'use client';

import Image from 'next/image';
import {
  ArrowRight,
  Brain,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  PRIVATE_V0_HERO,
  PRIVATE_V0_ONE_TO_ONE,
  PRIVATE_V0_PARENT_REPORT,
  PRIVATE_V0_SMALL_GROUP,
} from '../data/private-v0-media';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
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
  v0SectionBand,
  v0SubsectionTitle,
} from '../lib/ui-classes';
import { PrivateApplyForm } from './private-apply-form';
import { V0Eyebrow, V0SectionBlock } from './v0-ui';

const concerns: readonly { text: string; Icon: LucideIcon }[] = [
  {
    text: '기초 체력과 운동 신경이 부족해 체육 시간을 피하거나 자신감이 없는 아이',
    Icon: Sparkles,
  },
  {
    text: '소그룹 친구들과 규칙을 지키고 협동하며 또래 사회성을 기르고 싶은 아이',
    Icon: Users,
  },
  {
    text: '에너지가 넘치지만 신체 조절과 주의집중, 감정 컨트롤 연습이 필요한 아이',
    Icon: Brain,
  },
  {
    text: '느린 학습자이거나 개별 발달 속도에 맞춘 세심하고 안전한 특수·맞춤 체육이 필요한 아이',
    Icon: UserCheck,
  },
] as const;

type DifferenceFootnote =
  | { kind: 'summary'; lines: readonly string[] }
  | { kind: 'image'; image: { src: string; alt: string } };

const differences: readonly [string, string, string, DifferenceFootnote][] = [
  [
    '01',
    '사전 진단 및 성향 파악',
    '아이의 기초 운동 기능(이동·조작·안정성)과 움직임 성향을 먼저 파악하여 무리한 경쟁 없이 성공 경험을 만드는 초기 난이도를 설정합니다.',
    {
      kind: 'summary',
      lines: ['이동운동 · 조작운동 · 신체안정성', '16가지 PTG 유형 분석'],
    },
  ],
  [
    '02',
    '두뇌와 신체를 깨우는 입체 커리큘럼',
    '기초 체력 훈련은 물론, 시지각 반응 프로그램(SPOMOVE)과 다양한 뉴스포츠 교구를 결합해 지루할 틈 없는 50분을 만듭니다.',
    {
      kind: 'summary',
      lines: ['기초체력 웜업', '➔ 시지각 SPOMOVE', '➔ 뉴스포츠 조작기술'],
    },
  ],
  [
    '03',
    '체계적인 학부모 피드백',
    '오늘 수업에서 아이가 어떤 동작을 해냈고 또래와 어떻게 소통했는지, 수업 기록과 성장의 흐름을 학부모님께 투명하게 공유합니다.',
    { kind: 'image', image: PRIVATE_V0_PARENT_REPORT },
  ],
] as const;

function DifferenceMiniPanel({ footnote }: { footnote: DifferenceFootnote }) {
  return (
    <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
      {footnote.kind === 'image' ? (
        <Image
          src={footnote.image.src}
          alt={footnote.image.alt}
          fill
          className="object-cover object-top"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
      ) : (
        <div className="flex h-full flex-col justify-center gap-3 bg-gradient-to-br from-[#e8f1ff] to-white p-5 sm:p-6">
          {footnote.lines.map((line) => (
            <p
              key={line}
              className="rounded-xl bg-white/90 px-4 py-3 text-center text-xs font-bold leading-6 text-[#0f172a] shadow-sm ring-1 ring-slate-200/60 break-keep sm:text-sm"
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const faqs = [
  [
    '수업 장소는 어디서 진행되나요?',
    '서울 강동구 스포키듀LAB 전용 센터 또는 학부모님과 협의된 자택 인근 공간·제휴 시설로 선생님이 직접 방문하여 진행됩니다.',
  ],
  [
    '운동 신경이 전혀 없거나 느린 학습자 아이도 따라갈 수 있나요?',
    '네, 사전 성향 파악을 통해 무리한 경쟁 없이 아이의 개별 속도와 성공 경험에 맞춘 맞춤형 난이도로 수업을 설계합니다.',
  ],
  [
    '마음 맞는 친구들을 모아서 소그룹으로 신청해도 되나요?',
    '가능합니다. 또래 친구들(2~6명)로 소그룹을 구성해 신청하시면 사회성 발달과 협동심을 기르는 맞춤형 팀 클래스로 운영해 드립니다.',
  ],
  [
    '수업 시간과 주당 횟수는 어떻게 되나요?',
    '기본 1회 50분 수업으로 주 1회 또는 주 2회 정기 수업으로 진행되며, 상담을 통해 아이의 체력과 일정에 맞춰 조정 가능합니다.',
  ],
] as const;

const flowSteps: readonly { text: string; detail: string; Icon: LucideIcon }[] = [
  {
    text: '간편 상담 신청',
    detail: '아이 연령과 현재 고민만 간편하게 남겨주세요.',
    Icon: ClipboardList,
  },
  {
    text: '아이 성향·목표·일정 파악',
    detail: '16가지 움직임 성향과 사회성 목표를 사전 파악합니다.',
    Icon: Search,
  },
  {
    text: '담당 전문 선생님 매칭',
    detail: '아이 성향에 가장 잘 맞는 전문 선생님을 배정합니다.',
    Icon: UserCheck,
  },
  {
    text: '정기 수업 및 피드백',
    detail: '매회 수업 후 활동 기록과 성장 피드백을 공유합니다.',
    Icon: MessageCircle,
  },
] as const;

function ProgramCard({
  eyebrow,
  title,
  body,
  tags,
  image,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tags: readonly string[];
  image: { src: string; alt: string; objectPosition: string };
}) {
  return (
    <article
      className={`${v0BentoCard} overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 ${koreanLineBreak}`}
    >
      <div className={`${v0CardMediaFrame} bg-[#e8f1ff]`}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className={`${v0CardMediaImgCover} ${v0CardImageHover}`}
          style={{ objectPosition: image.objectPosition }}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className={v0CardInnerPad}>
        <V0Eyebrow>{eyebrow}</V0Eyebrow>
        <h3 className={`mt-7 ${v0CardTitle} break-keep text-[#0f172a]`}>{title}</h3>
        <p className={`mt-5 ${v0Lead}`}>{body}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 break-keep"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function PrivateV0Landing() {
  return (
    <div className="overflow-hidden bg-white text-[#0f172a]">
      <section
        id="top"
        className={`mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20 ${v0SectionBand}`}
      >
        <div className={koreanLineBreak}>
          <V0Eyebrow>01 · PERSONAL &amp; SMALL GROUP CLASS</V0Eyebrow>
          <h1 className={`mt-7 text-balance ${v0HeroTitle}`}>
            운동을 잘하는 아이보다,
            <br />
            <span className={v0GradientText}>움직임을 즐기는 아이</span>로
            <br />
            성장시킵니다.
          </h1>
          <p className={`mt-7 max-w-xl text-pretty ${v0Lead}`}>
            아이마다 신체 발달 속도와 성향은 모두 다릅니다. 연세대학교 체육교육과 출신 전문가들이 아이의
            움직임 수준과 사회성 목표에 맞춰 1:1 및 소그룹 수업을 세밀하게 설계합니다.
          </p>
          <div className={`mt-9 ${v0CtaButtonRow}`}>
            <a
              href="#apply"
              className={`${v0CtaButton} gap-2 bg-[#246bce] text-white transition hover:bg-[#1559b6]`}
            >
              우리 아이 맞춤 상담 신청하기 <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#program"
              className={`${v0CtaButton} border border-slate-200 text-slate-700 transition hover:bg-slate-50`}
            >
              수업 프로그램 보기
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-3xl bg-[#e8f1ff] p-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.35rem]">
              <Image
                src={PRIVATE_V0_HERO.src}
                alt={PRIVATE_V0_HERO.alt}
                fill
                className="object-cover"
                style={{ objectPosition: PRIVATE_V0_HERO.objectPosition }}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
          <div className="absolute -left-3 bottom-8 max-w-[11rem] rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/10 sm:-left-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#246bce]">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <p className="text-xs font-bold leading-5 break-keep">
                16가지 PTG
                <br />
                움직임 성향 기반 지도
              </p>
            </div>
          </div>
          <div className="absolute -right-3 top-8 max-w-[10.5rem] rounded-2xl bg-[#0f172a] p-4 text-white shadow-xl shadow-slate-900/20 sm:-right-8">
            <p className="text-xs font-bold leading-5 break-keep">
              수업 후 학부모
              <br />
              피드백 리포트 제공
            </p>
          </div>
        </div>
      </section>

      <section className={`bg-[#f8fafc] ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <V0SectionBlock
            eyebrow="FOR WHOM"
            title="우리 아이에게 이런 고민이 있으신가요?"
            description="획일적인 대형 학원에서 소외되거나 흥미를 잃었던 아이들이 스포키듀에서 자신감을 찾습니다."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {concerns.map(({ text, Icon }, i) => (
              <article
                key={text}
                className={`${v0BentoCard} rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60 ${v0CardInnerPad} ${koreanLineBreak}`}
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-[#246bce]">
                  <Icon className="size-5" aria-hidden />
                </div>
                <span className="text-sm font-black text-[#246bce]">0{i + 1}</span>
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-700 break-keep sm:mt-5">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={v0SectionBand}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <V0SectionBlock
            eyebrow="OUR DIFFERENCE"
            title="단순히 땀만 빼는 놀이가 아니라 성장의 데이터를 쌓습니다"
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {differences.map(([num, title, text, footnote]) => (
              <article
                key={num}
                className={`${v0BentoCard} flex flex-col rounded-3xl bg-slate-50 ring-1 ring-slate-100 ${v0CardInnerPad} ${koreanLineBreak}`}
              >
                <span className="text-sm font-black text-[#246bce]">{num} ·</span>
                <h3 className={`mt-6 break-keep sm:mt-8 ${v0CardTitleCompact}`}>{title}</h3>
                <p className={`mt-4 flex-1 sm:mt-5 ${v0Lead}`}>{text}</p>
                <DifferenceMiniPanel footnote={footnote} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="program" className={`bg-[#f8fafc] ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <V0SectionBlock eyebrow="PROGRAM" title="아이에게 꼭 맞는 수업 형태를 선택하세요" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ProgramCard
              eyebrow="1:1 PRIVATE"
              title="온전히 아이 한 명에게 집중하는 밀착 지도"
              body="기초 운동 기능 향상, 특수 체육, 특정 종목(줄넘기·구기·인라인·자전거 등) 마스터, PAPS 집중 대비 등 아이의 고유 목표를 가장 빠르게 달성합니다."
              tags={['#개별진도100%', '#특수맞춤체육', '#종목집중마스터']}
              image={PRIVATE_V0_ONE_TO_ONE}
            />
            <ProgramCard
              eyebrow="SMALL GROUP"
              title="함께 땀 흘리며 배우는 건강한 협동과 규칙"
              body="비슷한 연령과 수준의 친구들과 팀을 이뤄 양보, 응원, 승패 수용, 작전 수행을 경험하며 신체 기능과 사회성을 동시에 기릅니다."
              tags={['#또래사회성', '#팀워크향상', '#소수정예케어']}
              image={PRIVATE_V0_SMALL_GROUP}
            />
          </div>
        </div>
      </section>

      <section className={v0SectionBand}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <V0SectionBlock eyebrow="HOW IT WORKS" title="안심하고 시작하는 네 단계" />
          <div className="mb-16 grid gap-3 sm:grid-cols-2 md:grid-cols-4 sm:mb-20">
            {flowSteps.map(({ text, detail, Icon }, i) => (
              <div
                key={text}
                className={`${v0BentoCard} rounded-3xl bg-[#f8fafc] ${v0CardInnerPad} ${koreanLineBreak}`}
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-[#246bce]">
                  <Icon className="size-5" aria-hidden />
                </div>
                <span className="text-xs font-black text-[#246bce]">0{i + 1}</span>
                <p className="mt-3 text-sm font-bold leading-6 break-keep">{text}</p>
                <p className={`mt-1.5 ${v0Lead}`}>{detail}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto max-w-3xl">
            <h3 className={`mb-6 text-center ${v0SubsectionTitle}`}>학부모님이 자주 묻는 질문</h3>
            <div className="flex flex-col gap-3">
              {faqs.map(([q, a]) => (
                <details
                  key={q}
                  className={`group rounded-2xl bg-[#f8fafc] px-4 sm:px-6 ${koreanLineBreak}`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-bold text-slate-900 break-keep">
                    {q}
                    <ChevronRight
                      className="size-5 shrink-0 text-slate-400 transition group-open:rotate-90"
                      aria-hidden
                    />
                  </summary>
                  <p className={`pb-6 pr-4 sm:pr-8 ${v0Lead}`}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="apply" className={`scroll-mt-24 bg-[#0f172a] text-white ${v0SectionBand}`}>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:gap-20">
          <div className={`lg:col-span-2 ${koreanLineBreak}`}>
            <V0Eyebrow dark>PERSONAL CONSULTATION</V0Eyebrow>
            <h2 className={`mt-7 ${v0CtaTitleOnDark}`}>
              아이의 움직임에
              <br />
              따뜻한 방향을
              <br />
              찾아주세요.
            </h2>
            <p className={`mt-6 ${v0Lead} text-slate-400`}>
              아이의 연령과 고민만 편하게 남겨주세요. 담당 선생님이 가장 알맞은 수업 방향을 안내해 드립니다.
            </p>
            <div className={`mt-9 ${v0CtaButtonRow}`}>
              <a
                href={brandContactLinks.phone}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white"
              >
                <Phone className="size-4" aria-hidden />
                {brandProfile.phone}
              </a>
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#f7d46a] px-5 py-3 text-sm font-bold text-[#0f172a]"
              >
                <MessageCircle className="size-4" aria-hidden />
                카카오 채널 상담
              </a>
            </div>
          </div>
          <div className="lg:col-span-3">
            <PrivateApplyForm variant="privateV0" />
          </div>
        </div>
      </section>
    </div>
  );
}
