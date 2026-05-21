'use client';

import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  Image as ImageIcon,
  Lock,
  MapPin,
  MonitorPlay,
  Package,
  Play,
  ShoppingBag,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { CategoryIcon } from '../../components/ui/ProgramThumb';
import { useIsPro, useMasterStore } from '../../store';
import type { Drill, Program } from '../../types';

const BROKEN_TEXT_PATTERN = /怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|獄|筌|揶|癰|疫|椰|\?/;

const PROGRAM_FALLBACK: Record<string, Partial<Program>> = {
  'funstick-fencing': {
    title: '펀스틱 펜싱 Funstick Fencing',
    category: '민첩·반응',
    grade: '초등 3학년 이상',
    space: '실내 체육관 · 넓은 활동 공간',
    description: '부드러운 펀스틱과 풍선 목표물을 활용해 거리 판단, 타이밍, 균형 조절을 경험하는 대체 펜싱 수업입니다.',
    equipment: ['펀스틱 2개', '풍선 목표물 2개', '접시콘 12~15개'],
    tags: ['펜싱', '민첩성', '거리 판단', 'SPOMOVE 연계'],
  },
  'figure-8-agility': {
    title: '8자 드릴 민첩성 트레이닝',
    category: '민첩·반응',
    grade: '초등 3~6학년',
    space: '좁은 실내 공간',
    description: '마커콘을 8자 패턴으로 통과하며 방향 전환, 가속, 재출발 리듬을 익히는 SPOMOVE 연계 수업입니다.',
    equipment: ['마커콘 4개', '태블릿 또는 노트북'],
    tags: ['민첩성', '방향 전환', '좁은 공간', 'SPOMOVE'],
  },
  'team-relay-challenge': {
    title: '팀 릴레이 챌린지',
    category: '협동',
    grade: '전 학년',
    space: '넓은 공간',
    description: '팀별 릴레이로 출발 반응과 협동성을 함께 끌어올리는 수업입니다.',
    equipment: ['바톤', '마커콘'],
    tags: ['협동', '출발 반응', '팀 빌딩'],
  },
};

const DRILL_FALLBACK: Record<string, string> = {
  'SR-05': '스피드 리액션',
  'SR-06': '방향 전환 챌린지',
  'RS-05': '팀 콜 사인',
  'IC-05': '스텝 밸런스',
  'RC-05': '리듬 체인지',
};

function hasBrokenText(value: string | undefined) {
  if (!value) return false;
  return value.includes(String.fromCharCode(0xfffd)) || BROKEN_TEXT_PATTERN.test(value);
}

function fallbackProgramValue<K extends keyof Program>(program: Program, key: K, fallback: Program[K]) {
  const override = PROGRAM_FALLBACK[program.id]?.[key] as Program[K] | undefined;
  const value = program[key];
  if (typeof value === 'string') {
    if (!value.trim() || hasBrokenText(value)) return (override ?? fallback) as Program[K];
  }
  if (Array.isArray(value)) {
    const cleaned = value.filter((item) => typeof item !== 'string' || !hasBrokenText(item));
    if (!cleaned.length) return (override ?? fallback) as Program[K];
    return cleaned as Program[K];
  }
  return value ?? override ?? fallback;
}

function cleanText(value: string | undefined, fallback: string) {
  if (!value || hasBrokenText(value)) return fallback;
  return value;
}

function cleanList(items: string[] | undefined, fallback: string[]) {
  const cleaned = (items ?? []).map((item) => item.trim()).filter((item) => item && !hasBrokenText(item));
  return cleaned.length ? cleaned : fallback;
}

function cleanDrillName(drill: Drill | undefined, fallback = 'SPOMOVE 드릴') {
  if (!drill) return fallback;
  if (hasBrokenText(drill.name)) return DRILL_FALLBACK[drill.id] ?? fallback;
  return drill.name;
}

function getHeroImage(program: Program) {
  return program.lessonDetail?.heroImageUrl || program.thumbnailUrl;
}

function getGalleryImages(program: Program) {
  return [program.lessonDetail?.heroImageUrl, ...(program.lessonDetail?.galleryImageUrls ?? []), program.lessonDetail?.setupImageUrl].filter(Boolean) as string[];
}

function getYouTubeId(url?: string) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
}

function getVideoEmbedUrl(url?: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  return undefined;
}

function isDirectVideoUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url));
}

function hasSpomoveLink(program: Program) {
  return (program.lessonDetail?.relatedSpomoveIds?.length ?? 0) > 0 || program.tags.some((tag) => tag.toUpperCase().includes('SPOMOVE'));
}

function getPrimaryDrill(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id)) ?? (hasSpomoveLink(program) ? drills[0] : undefined);
}

function getSpomoveUseLabel(program: Program) {
  const text = `${program.title} ${program.category} ${program.description} ${program.tags.join(' ')} ${program.lessonDetail?.developmentFocus ?? ''}`;
  if (/도입|집중|신호|주의/.test(text)) return '도입 3분 집중 전환';
  if (/펜싱|민첩|순발|반응|스피드|거리|방향/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|리듬|협동|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function getParentCopy(program: Program, title: string, focus: string) {
  return cleanText(
    program.lessonDetail?.parentNote,
    `오늘은 ${title} 활동으로 ${focus}을 자연스럽게 경험했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`,
  );
}

function getEquipmentPrice(item: string) {
  if (/프로젝터|빔|projector/i.test(item)) return 159000;
  if (/마커|콘|cone|접시콘/i.test(item)) return 8900;
  if (/카드|card/i.test(item)) return 12000;
  if (/밴드|band/i.test(item)) return 24000;
  if (/바톤|풍선|baton|balloon|공|펀스틱/i.test(item)) return 6900;
  return 0;
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black leading-6 text-white">{value}</p>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <h2 className="flex items-center gap-2 text-base font-black text-white">
        <Icon className="h-4 w-4 text-indigo-200" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items, tone = 'bg-indigo-300' }: { items: string[]; tone?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const addToCart = useMasterStore((state) => state.addToCart);
  const cart = useMasterStore((state) => state.cart);
  const classRecords = useMasterStore((state) => state.classRecords);
  const isPro = useIsPro();
  const [copied, setCopied] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#070812] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-white">수업안을 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 프로그램을 선택해 주세요.</p>
        <Link href="/spokedu-master/library" className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  const detail = program.lessonDetail;
  const title = fallbackProgramValue(program, 'title', 'SPOKEDU 수업 패키지') as string;
  const category = fallbackProgramValue(program, 'category', '체육 수업') as string;
  const grade = fallbackProgramValue(program, 'grade', '전 학년') as string;
  const space = fallbackProgramValue(program, 'space', '실내 또는 체육 공간') as string;
  const description = fallbackProgramValue(program, 'description', `${title} 수업 패키지입니다.`) as string;
  const equipment = fallbackProgramValue(program, 'equipment', ['현장 기본 교구']) as string[];
  const favorite = favorites.includes(program.id);
  const locked = program.isPro && !isPro;
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const heroImage = getHeroImage(program);
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl);
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const galleryImages = getGalleryImages(program);
  const primaryDrill = getPrimaryDrill(program, drills);
  const primarySpomoveId = primaryDrill?.id ?? detail?.relatedSpomoveIds?.[0] ?? drills[0]?.id ?? 'reactTrain';
  const relatedSpomoveIds = detail?.relatedSpomoveIds?.length ? detail.relatedSpomoveIds : [primarySpomoveId];
  const objective = cleanText(detail?.objective, description);
  const focus = cleanText(detail?.developmentFocus, category);
  const ruleItems = cleanList(detail?.rules?.length ? detail.rules : program.steps, [
    '공간과 준비물을 확인하고 학생들이 안전하게 움직일 범위를 먼저 정합니다.',
    '시범을 짧게 보여준 뒤 기본 규칙으로 1라운드를 진행합니다.',
    '학생 반응을 보며 난이도와 이동 거리를 조절합니다.',
  ]);
  const setupNotes = cleanList(detail?.setupNotes, [`공간: ${space}`, `준비물: ${equipment.join(', ')}`]);
  const fieldTips = cleanList(detail?.fieldTips, []);
  const safetyNotes = cleanList(detail?.safetyNotes, []);
  const variations = cleanList(detail?.variations, []);
  const parentCopy = getParentCopy(program, title, focus);
  const usageCount = usageRecords.length;

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const addEquipment = (item: string) => {
    const price = getEquipmentPrice(item);
    if (price <= 0) return;
    addToCart({ id: item, name: item, price, qty: 1 });
    setCartNotice(`${item} 교구를 장바구니에 담았습니다.`);
  };

  return (
    <main className="min-h-dvh bg-[#070812] pb-24 text-white lg:pb-12">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-[#070812]/86 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href="/spokedu-master/library" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/spokedu-master/shop" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]" aria-label="교구 스토어">
            <ShoppingBag className="h-5 w-5 text-slate-300" />
            {cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{cartCount}</span> : null}
          </Link>
          <button
            type="button"
            onClick={() => toggleFavorite(program.id)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]"
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-5 w-5 ${favorite ? 'fill-amber-300 text-amber-300' : 'text-slate-300'}`} />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="relative min-h-[520px]">
          {videoEmbedUrl ? (
            <iframe
              src={videoEmbedUrl}
              title={`${title} 영상`}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : directVideoUrl ? (
            <video src={directVideoUrl} className="h-full w-full object-cover" controls autoPlay muted playsInline />
          ) : heroImage ? (
            <Image src={heroImage} alt="" fill sizes="100vw" className="object-cover" priority unoptimized />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/32 via-slate-950 to-emerald-400/20" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070812] via-[#070812]/42 to-black/10" />
          {!heroImage && !videoEmbedUrl && !directVideoUrl ? (
            <span className="pointer-events-none absolute left-1/2 top-1/2 opacity-[0.08]" style={{ transform: 'translate(-50%, -50%) rotate(-8deg)' }} aria-hidden>
              <CategoryIcon category={category} size={360} color="#fff" strokeWidth={0.45} />
            </span>
          ) : null}
          {locked ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-300/14 text-amber-200">
                <Lock className="h-7 w-7" />
              </span>
              <p className="mt-3 text-sm font-black text-amber-100">Pro 전용 수업 패키지</p>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{category}</span>
                {program.isPro ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">PRO</span> : null}
                {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-400 px-3 py-1 text-xs font-black text-white">SPOMOVE 연동</span> : null}
                {usageCount > 0 ? <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">{usageCount}회 사용</span> : null}
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/68 sm:text-base">{description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><Users className="h-3.5 w-3.5" />{cleanText(detail?.recommendedAge, grade)}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><Clock3 className="h-3.5 w-3.5" />{program.duration}분</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><MapPin className="h-3.5 w-3.5" />{space}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-6 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-4">
          {locked ? (
            <Link href="/spokedu-master/payment?plan=pro" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950 sm:col-span-4">
              <Zap className="h-4 w-4" />
              Pro로 전체 수업 열기
            </Link>
          ) : (
            <>
              <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950 sm:col-span-2">
                <Play className="h-4 w-4 fill-current" />
                수업 시작
              </Link>
              <Link href={`/spokedu-master/spomove/session?drill=${primarySpomoveId}&mode=projector&program=${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-300/25 bg-indigo-400/10 px-5 text-sm font-bold text-indigo-100">
                <MonitorPlay className="h-4 w-4" />
                SPOMOVE 큰 화면
              </Link>
              <button type="button" onClick={copyParentNote} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 text-sm font-bold text-emerald-100">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? '복사 완료' : '설명 문구 복사'}
              </button>
            </>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <MetaCard label="대상" value={cleanText(detail?.recommendedAge, grade)} />
          <MetaCard label="인원" value={cleanText(detail?.recommendedPlayers, '소그룹·학급 운영')} />
          <MetaCard label="발달 초점" value={focus} />
          <MetaCard label="공간" value={space} />
        </section>

        <DetailSection title="패키지 구성" icon={Zap}>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetaCard label="수업안" value={`${program.duration}분 · ${space}`} />
            <MetaCard label="연결 SPOMOVE" value={cleanDrillName(primaryDrill)} />
            <MetaCard label="설명 도구" value="학부모·기관용 문구 복사" />
          </div>
        </DetailSection>

        {galleryImages.length > 0 ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-200" />
              <h2 className="text-xl font-black text-white">현장 이미지</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {galleryImages.slice(0, 3).map((src) => (
                <div key={src} className="relative h-56 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
                  <Image src={src} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <DetailSection title="준비물" icon={Package}>
            {cartNotice ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/18 bg-emerald-400/10 p-3">
                <p className="text-xs font-black text-emerald-200">{cartNotice}</p>
                <Link href="/spokedu-master/shop" className="text-xs font-black text-emerald-200">스토어 보기</Link>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {equipment.map((item) => {
                const price = getEquipmentPrice(item);
                return (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-white">{item}</strong>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">{price > 0 ? `${price.toLocaleString('ko-KR')}원` : '보유 장비'}</span>
                    </span>
                    {price > 0 ? (
                      <button type="button" onClick={() => addEquipment(item)} className="h-9 rounded-xl bg-indigo-500 px-3 text-xs font-black text-white">
                        담기
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </DetailSection>

          <DetailSection title="공간 세팅" icon={MapPin}>
            <BulletList items={setupNotes} />
          </DetailSection>
        </section>

        <DetailSection title="수업 목표" icon={FileText}>
          <p className="text-sm leading-7 text-slate-300">{objective}</p>
        </DetailSection>

        <DetailSection title={`진행 단계 · ${ruleItems.length}단계`} icon={Play}>
          <ol className="space-y-3">
            {ruleItems.map((step, index) => (
              <li key={`${step}-${index}`} className="grid grid-cols-[34px_1fr] gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-black text-white">{index + 1}</span>
                <p className="text-sm leading-7 text-slate-300">{step}</p>
              </li>
            ))}
          </ol>
        </DetailSection>

        {relatedSpomoveIds.length > 0 ? (
          <DetailSection title="연결 SPOMOVE" icon={MonitorPlay}>
            <div className="grid gap-3 md:grid-cols-2">
              {relatedSpomoveIds.map((spomoveId) => {
                const drill = drills.find((item) => item.id === spomoveId);
                return (
                  <Link key={spomoveId} href={`/spokedu-master/spomove/session?drill=${spomoveId}&mode=class&program=${program.id}`} className="flex items-center gap-4 rounded-2xl border border-indigo-300/18 bg-indigo-400/10 p-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-400/14 text-indigo-100">
                      <Zap className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-white">{cleanDrillName(drill, spomoveId)}</strong>
                      <span className="mt-1 block text-xs font-semibold text-indigo-100/70">{getSpomoveUseLabel(program)}으로 실행</span>
                    </span>
                    <MonitorPlay className="h-4 w-4 text-indigo-100" />
                  </Link>
                );
              })}
            </div>
          </DetailSection>
        ) : null}

        {fieldTips.length > 0 || safetyNotes.length > 0 || variations.length > 0 ? (
          <section className="grid gap-6 lg:grid-cols-3">
            {fieldTips.length > 0 ? (
              <DetailSection title="현장 팁" icon={FileText}>
                <BulletList items={fieldTips} tone="bg-emerald-300" />
              </DetailSection>
            ) : null}
            {safetyNotes.length > 0 ? (
              <DetailSection title="안전 체크" icon={FileText}>
                <BulletList items={safetyNotes} tone="bg-rose-300" />
              </DetailSection>
            ) : null}
            {variations.length > 0 ? (
              <DetailSection title="변형 수업" icon={FileText}>
                <BulletList items={variations} tone="bg-amber-300" />
              </DetailSection>
            ) : null}
          </section>
        ) : null}

        <DetailSection title="설명 문구" icon={Clipboard}>
          <p className="text-sm leading-7 text-slate-300">{parentCopy}</p>
        </DetailSection>
      </div>
    </main>
  );
}

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-slate-300">
      <FileText className="h-7 w-7" />
    </div>
  );
}
