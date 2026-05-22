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
import { cleanList, cleanText, DRILL_FALLBACK, hasBrokenText, PROGRAM_FALLBACK } from '../../lib/clean';
import { useIsPro, useMasterStore } from '../../store';
import type { Drill, Program } from '../../types';

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

function getPackageCompleteness(program: Program) {
  const detail = program.lessonDetail;
  return [
    Boolean(detail?.objective || program.description),
    Boolean(detail?.rules?.length || program.steps.length),
    Boolean(detail?.setupNotes?.length || program.equipment.length),
    Boolean(detail?.parentNote),
    Boolean(detail?.relatedSpomoveIds?.length),
    Boolean(detail?.heroImageUrl || detail?.videoUrl || program.thumbnailUrl),
  ].filter(Boolean).length;
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
        <Icon className="h-4 w-4 text-indigo-600" />
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
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
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
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f7fb] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-slate-950">수업안을 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 프로그램을 선택해 주세요.</p>
        <Link href="/spokedu-master/library" className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white">
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
  const briefingNotes = cleanList(detail?.briefingNotes, []);
  const fieldTips = cleanList(detail?.fieldTips, []);
  const safetyNotes = cleanList(detail?.safetyNotes, []);
  const variations = cleanList(detail?.variations, []);
  const parentCopy = getParentCopy(program, title, focus);
  const coachScript = cleanText(
    detail?.coachScript,
    `${title} 수업은 짧은 시범으로 규칙을 보여준 뒤, 학생 반응에 따라 거리와 속도를 조절하며 진행합니다.`,
  );
  const usageCount = usageRecords.length;
  const packageScore = getPackageCompleteness(program);

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
    <main className="min-h-dvh bg-[#f5f7fb] pb-24 text-slate-950 lg:pb-12">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href="/spokedu-master/library" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/spokedu-master/shop" className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]" aria-label="교구 스토어">
            <ShoppingBag className="h-5 w-5 text-slate-600" />
            {cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{cartCount}</span> : null}
          </Link>
          <button
            type="button"
            onClick={() => toggleFavorite(program.id)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-5 w-5 ${favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        {videoEmbedUrl ? (
          <>
            <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={videoEmbedUrl}
                title={`${title} 영상`}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="bg-slate-950 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{category}</span>
                  {program.isPro ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">PRO</span> : null}
                  {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-400 px-3 py-1 text-xs font-black text-white">SPOMOVE 연동</span> : null}
                  {usageCount > 0 ? <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">{usageCount}회 사용</span> : null}
                  {locked ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">PRO 전용</span> : null}
                </div>
                <h1 className="max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/70">{description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"><Users className="h-3.5 w-3.5" />{cleanText(detail?.recommendedAge, grade)}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"><Clock3 className="h-3.5 w-3.5" />{program.duration}분</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"><MapPin className="h-3.5 w-3.5" />{space}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="relative min-h-[480px]">
            {directVideoUrl ? (
              <video src={directVideoUrl} className="h-full w-full object-cover" controls autoPlay muted playsInline />
            ) : heroImage ? (
              <Image src={heroImage} alt="" fill sizes="100vw" className="object-cover" priority unoptimized />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#1e1b4b_0%,#0f172a_45%,#064e3b_100%)]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
            {!heroImage && !directVideoUrl ? (
              <span className="pointer-events-none absolute left-1/2 top-1/2 opacity-[0.12]" style={{ transform: 'translate(-50%, -50%) rotate(-8deg)' }} aria-hidden>
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
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/78 sm:text-base">{description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><Users className="h-3.5 w-3.5" />{cleanText(detail?.recommendedAge, grade)}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><Clock3 className="h-3.5 w-3.5" />{program.duration}분</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-xs font-bold text-white/80"><MapPin className="h-3.5 w-3.5" />{space}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
              <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white sm:col-span-2">
                <Play className="h-4 w-4 fill-current" />
                수업 시작
              </Link>
              <Link href={`/spokedu-master/spomove/session?drill=${primarySpomoveId}&mode=projector&program=${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800">
                <MonitorPlay className="h-4 w-4" />
                SPOMOVE 큰 화면
              </Link>
              <button type="button" onClick={copyParentNote} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700">
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

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-indigo-600">구독 패키지 가치</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">이 수업 하나로 준비, 실행, 설명까지 끝냅니다</h2>
            </div>
            <p className="text-sm font-black text-slate-500">구성 밀도 <span className="text-slate-950">{packageScore}/6</span></p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: '수업 준비', value: `${program.duration}분안`, caption: '목표와 진행 단계' },
              { label: '화면 활동', value: hasSpomoveLink(program) ? '연동' : '선택', caption: cleanDrillName(primaryDrill, 'SPOMOVE 추천') },
              { label: '현장 세팅', value: `${equipment.length}개`, caption: '준비물과 공간 배치' },
              { label: '소통 자료', value: '복사', caption: '학부모·기관 설명 문구' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-black leading-none text-slate-950">{item.value}</p>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.caption}</p>
              </div>
            ))}
          </div>
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
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-black text-slate-950">현장 이미지</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {galleryImages.slice(0, 3).map((src) => (
                <div key={src} className="relative h-56 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                  <Image src={src} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <DetailSection title="준비물" icon={Package}>
            {cartNotice ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-black text-emerald-700">{cartNotice}</p>
                <Link href="/spokedu-master/shop" className="text-xs font-black text-emerald-700">스토어 보기</Link>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {equipment.map((item) => {
                const price = getEquipmentPrice(item);
                return (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm font-black leading-5 text-slate-950">{item}</strong>
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
          <p className="text-sm leading-7 text-slate-600">{objective}</p>
        </DetailSection>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <DetailSection title="강사 오프닝 멘트" icon={Clipboard}>
            <p className="text-sm leading-7 text-slate-600">{coachScript}</p>
          </DetailSection>

          <DetailSection title="수업 전 브리핑" icon={FileText}>
            {briefingNotes.length > 0 ? (
              <BulletList items={briefingNotes} tone="bg-indigo-300" />
            ) : (
              <BulletList
                items={[
                  `${cleanText(detail?.recommendedAge, grade)} 기준으로 규칙을 짧게 설명합니다.`,
                  `${space}에서 충돌 위험이 없는 동선을 먼저 확인합니다.`,
                  `마무리에는 ${focus}이 어떻게 드러났는지 한 문장으로 정리합니다.`,
                ]}
                tone="bg-indigo-300"
              />
            )}
          </DetailSection>
        </section>

        <DetailSection title={`진행 단계 · ${ruleItems.length}단계`} icon={Play}>
          <ol className="space-y-3">
            {ruleItems.map((step, index) => (
              <li key={`${step}-${index}`} className="grid grid-cols-[34px_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">{index + 1}</span>
                <p className="text-sm leading-7 text-slate-600">{step}</p>
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
                  <Link key={spomoveId} href={`/spokedu-master/spomove/session?drill=${spomoveId}&mode=class&program=${program.id}`} className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                      <Zap className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-slate-950">{cleanDrillName(drill, spomoveId)}</strong>
                      <span className="mt-1 block text-xs font-semibold text-indigo-700">{getSpomoveUseLabel(program)}으로 실행</span>
                    </span>
                    <MonitorPlay className="h-4 w-4 text-indigo-600" />
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
          <p className="text-sm leading-7 text-slate-600">{parentCopy}</p>
        </DetailSection>
      </div>
    </main>
  );
}

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500">
      <FileText className="h-7 w-7" />
    </div>
  );
}
