'use client';

import Image from 'next/image';
import { ArrowRight, ChevronDown, MessageCircle, Phone, Sparkles } from 'lucide-react';
import { Suspense, useState } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  PRIVATE_V0_HERO,
  PRIVATE_V0_ONE_TO_ONE,
  PRIVATE_V0_PARENT_REPORT,
  PRIVATE_V0_SMALL_GROUP,
} from '../data/private-v0-media';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import { koreanLineBreak } from '../lib/ui-classes';
import { PrivateApplyForm } from './private-apply-form';

const concerns = [
  '기초 체력과 운동 신경이 부족해 체육 시간을 피하거나 자신감이 없는 아이',
  '소그룹 친구들과 규칙을 지키고 협동하며 또래 사회성을 기르고 싶은 아이',
  '에너지가 넘치지만 신체 조절과 주의집중, 감정 컨트롤 연습이 필요한 아이',
  '느린 학습자이거나 개별 발달 속도에 맞춘 세심하고 안전한 특수·맞춤 체육이 필요한 아이',
] as const;

const differences = [
  [
    '01',
    '사전 진단 및 성향 파악',
    '아이의 기초 운동 기능(이동·조작·안정성)과 움직임 성향을 먼저 파악하여 무리한 경쟁 없이 성공 경험을 만드는 초기 난이도를 설정합니다.',
    null,
  ],
  [
    '02',
    '두뇌와 신체를 깨우는 입체 커리큘럼',
    '기초 체력 훈련은 물론, 시지각 반응 프로그램(SPOMOVE)과 다양한 뉴스포츠 교구를 결합해 지루할 틈 없는 50분을 만듭니다.',
    null,
  ],
  [
    '03',
    '체계적인 학부모 피드백',
    '오늘 수업에서 아이가 어떤 동작을 해냈고 또래와 어떻게 소통했는지, 수업 기록과 성장의 흐름을 학부모님께 투명하게 공유합니다.',
    PRIVATE_V0_PARENT_REPORT,
  ],
] as const;

const faqs = [
  [
    '수업 장소는 어디서 진행되나요?',
    '스포키듀 스튜디오와 협의된 제휴 공간에서 진행됩니다. 상담 시 우리 아이에게 가장 편안하고 안전한 장소를 함께 안내해 드립니다.',
  ],
  [
    '친구들을 모아서 소그룹 신청도 가능한가요?',
    '물론입니다. 친구, 형제자매 등 원하는 멤버로 1:2부터 1:6까지 구성할 수 있습니다. 연령과 수준을 먼저 확인해 안정적으로 매칭합니다.',
  ],
  [
    '운동을 전혀 못 따라가는 아이도 괜찮을까요?',
    '괜찮습니다. 사전 진단을 통해 현재 수준에서 시작하고, 작은 성공을 충분히 경험하도록 난이도와 속도를 세밀하게 조정합니다.',
  ],
  [
    '수업 시간과 횟수는 어떻게 되나요?',
    '기본 수업은 50분이며 주 1~2회를 권장합니다. 아이의 목표와 가정의 일정에 맞춰 상담 후 유연하게 설계합니다.',
  ],
] as const;

const flowSteps = [
  '간편 상담 신청',
  '아이 성향·목표·일정 파악',
  '담당 전문 선생님 매칭 및 첫 수업',
  '정기 수업 및 피드백 리포트 공유',
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#e8f1ff] px-4 py-2 text-[11px] font-bold tracking-[0.16em] text-[#246bce]">
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
  description?: string;
}) {
  return (
    <div className={`mx-auto mb-14 max-w-2xl text-center ${koreanLineBreak}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-balance text-3xl font-bold tracking-[-0.04em] text-[#0f172a] md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-pretty text-base leading-8 text-slate-500 md:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

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
      className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 ${koreanLineBreak}`}
    >
      <div className="relative aspect-[16/10] w-full bg-[#e8f1ff]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover"
          style={{ objectPosition: image.objectPosition }}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className="p-6 sm:p-8 md:p-10">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-7 text-xl font-bold tracking-tight break-keep sm:text-2xl">{title}</h3>
        <p className="mt-5 text-sm leading-7 text-slate-500 break-keep sm:text-base sm:leading-8">
          {body}
        </p>
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
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="overflow-hidden bg-white text-[#0f172a]">
      <section
        id="top"
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-8 sm:pt-12 lg:grid-cols-2 lg:gap-20 lg:pt-16"
      >
        <div className={koreanLineBreak}>
          <Eyebrow>01 · PERSONAL &amp; SMALL GROUP CLASS</Eyebrow>
          <h1 className="mt-7 text-balance text-4xl font-bold leading-[1.2] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
            운동을 잘하는 아이보다,
            <br />
            <span className="text-[#246bce]">움직임을 즐기는 아이</span>로
            <br />
            성장시킵니다.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-base leading-8 text-slate-500">
            아이마다 신체 발달 속도와 성향은 모두 다릅니다. 연세대학교 체육교육과 출신 전문가들이 아이의
            움직임 수준과 사회성 목표에 맞춰 1:1 및 소그룹 수업을 세밀하게 설계합니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-full bg-[#246bce] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#1559b6]"
            >
              우리 아이 맞춤 상담 신청하기 <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href="#program"
              className="rounded-full border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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

      <section className="bg-[#f8fafc] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="FOR WHOM"
            title="우리 아이에게 이런 고민이 있으신가요?"
            description="획일적인 대형 학원에서 소외되거나 흥미를 잃었던 아이들이 스포키듀에서 자신감을 찾습니다."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {concerns.map((item, i) => (
              <article
                key={item}
                className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:p-8 ${koreanLineBreak}`}
              >
                <span className="text-sm font-black text-[#246bce]">0{i + 1}</span>
                <p className="mt-8 text-sm font-semibold leading-7 text-slate-700 break-keep sm:mt-10">
                  {item}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="OUR DIFFERENCE"
            title="단순히 땀만 빼는 놀이가 아니라 성장의 데이터를 쌓습니다"
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {differences.map(([num, title, text, reportImage]) => (
              <article
                key={num}
                className={`rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-100 sm:p-8 ${koreanLineBreak}`}
              >
                <span className="text-sm font-black text-[#246bce]">{num} ·</span>
                <h3 className="mt-6 text-lg font-bold tracking-tight break-keep sm:mt-8 sm:text-xl">
                  {title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-500 break-keep sm:mt-5">{text}</p>
                {reportImage ? (
                  <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                    <Image
                      src={reportImage.src}
                      alt={reportImage.alt}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="program" className="bg-[#f8fafc] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="PROGRAM" title="아이에게 꼭 맞는 수업 형태를 선택하세요" />
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

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="HOW IT WORKS" title="안심하고 시작하는 네 단계" />
          <div className="mb-16 grid gap-3 sm:grid-cols-2 md:grid-cols-4 sm:mb-20">
            {flowSteps.map((step, i) => (
              <div
                key={step}
                className={`rounded-3xl bg-[#f8fafc] p-5 sm:p-6 ${koreanLineBreak}`}
              >
                <span className="text-xs font-black text-[#246bce]">0{i + 1}</span>
                <p className="mt-5 text-sm font-bold leading-6 break-keep sm:mt-7">{step}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto max-w-3xl">
            <h3 className="mb-6 text-center text-2xl font-bold tracking-tight">학부모님이 자주 묻는 질문</h3>
            <div className="flex flex-col gap-3">
              {faqs.map(([q, a], i) => (
                <div key={q} className={`rounded-2xl bg-[#f8fafc] px-4 sm:px-6 ${koreanLineBreak}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold break-keep"
                    aria-expanded={openFaq === i}
                  >
                    {q}
                    <ChevronDown
                      className={`size-5 shrink-0 text-slate-400 transition ${openFaq === i ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {openFaq === i ? (
                    <p className="pb-6 pr-4 text-sm leading-7 text-slate-500 break-keep sm:pr-8">{a}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="apply" className="scroll-mt-24 bg-[#0f172a] py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:gap-20">
          <div className={`lg:col-span-2 ${koreanLineBreak}`}>
            <Eyebrow>PERSONAL CONSULTATION</Eyebrow>
            <h2 className="mt-7 text-3xl font-bold leading-tight tracking-[-0.04em] md:text-5xl">
              아이의 움직임에
              <br />
              따뜻한 방향을
              <br />
              찾아주세요.
            </h2>
            <p className="mt-6 leading-8 text-slate-400">
              아이의 연령과 고민만 편하게 남겨주세요. 담당 선생님이 가장 알맞은 수업 방향을 안내해 드립니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
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
            <Suspense fallback={<div className="min-h-[320px] rounded-3xl bg-white/10" aria-hidden />}>
              <PrivateApplyForm variant="privateV0" />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
