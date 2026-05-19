'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clipboard,
  Clock,
  ExternalLink,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  MonitorPlay,
  Play,
  ShieldAlert,
  ShoppingBag,
  Shuffle,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { CategoryIcon } from '../../components/ui/ProgramThumb';
import { useIsPro, useMasterStore } from '../../store';
import type { Program } from '../../types';

function getEquipmentPrice(item: string) {
  if (/프로젝터|빔|projector/i.test(item)) return 159000;
  if (/마커|marker/i.test(item)) return 8900;
  if (/카드|card/i.test(item)) return 12000;
  if (/밴드|band/i.test(item)) return 24000;
  if (/바톤|배턴|baton/i.test(item)) return 6900;
  return 0;
}

function getSpomoveUseLabel(program: Program) {
  const text = [program.title, program.category, program.description, ...program.tags, program.lessonDetail?.developmentFocus ?? ''].join(' ');
  if (/도입|워밍업|집중|인지|신호/.test(text)) return '도입 3분 집중 전환';
  if (/민첩|순발|방향|반응|스피드/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|협동|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function ProgramHero({ program, locked }: { program: Program; locked: boolean }) {
  return (
    <div
      className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-[18px] md:h-full"
      style={program.thumbnailUrl ? undefined : { background: `linear-gradient(145deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}
      aria-hidden
    >
      {program.thumbnailUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.58))' }} />
        </>
      ) : (
        <>
          <span className="pointer-events-none absolute right-3 top-3 opacity-[0.1]">
            <CategoryIcon category={program.category} size={130} color="#fff" strokeWidth={0.7} />
          </span>
          <div className="relative grid h-[72px] w-[72px] place-items-center rounded-[22px]" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.16)' }}>
            <CategoryIcon category={program.category} size={34} color="rgba(255,255,255,0.9)" />
          </div>
        </>
      )}
      {locked ? (
        <div className="absolute inset-0 grid place-items-center rounded-[18px] bg-black/58 backdrop-blur-[3px]">
          <div className="rounded-[12px] px-4 py-3 text-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Lock className="mx-auto mb-2 h-5 w-5" color="var(--spm-amb)" />
            <p className="text-[12px] font-black" style={{ color: 'var(--spm-amb)' }}>PRO 수업안</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
        <Icon size={17} color="var(--spm-acc)" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <p key={item} className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
          {item}
        </p>
      ))}
    </div>
  );
}

function PackageSummary({ program, drillName }: { program: Program; drillName: string }) {
  const items = [
    ['수업안', `${program.duration}분 · ${program.space}`],
    ['연결 SPOMOVE', drillName],
    ['설명 문구', '보호자·기관용 복사'],
  ];
  return (
    <section className="mt-7 rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.08), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.26)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Zap size={17} color="#a5b4fc" />
        <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>수업 패키지 구성</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-[13px] p-3" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
            <p className="mt-1 line-clamp-2 text-[12px] font-black leading-5" style={{ color: 'var(--spm-t)' }}>{value}</p>
          </div>
        ))}
      </div>
    </section>
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
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  if (!program) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-[22px] text-center" style={{ background: 'var(--spm-bg)' }}>
        <p className="text-[16px] font-bold" style={{ color: 'var(--spm-t)' }}>수업안을 찾을 수 없습니다.</p>
        <Link href="/spokedu-master/library" className="mt-5 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}>라이브러리로 돌아가기</Link>
      </div>
    );
  }

  const favorite = favorites.includes(program.id);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const locked = program.isPro && !isPro;
  const detail = program.lessonDetail;
  const primarySpomoveId = detail?.relatedSpomoveIds[0] ?? drills[0]?.id ?? 'speed-track';
  const primarySpomove = drills.find((drill) => drill.id === primarySpomoveId);
  const relatedSpomoveIds = detail?.relatedSpomoveIds.length ? detail.relatedSpomoveIds : primarySpomoveId ? [primarySpomoveId] : [];
  const usageCount = usageRecords.length;
  const lastUsedRecord = usageCount > 0 ? [...usageRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]! : null;
  const description = program.description || detail?.objective || '수업 목표와 진행 방법을 확인하고 바로 실행할 수 있는 프로그램입니다.';

  const addEquipment = (item: string) => {
    const price = getEquipmentPrice(item);
    if (price <= 0) return;
    addToCart({ id: item, name: item, price, qty: 1 });
    setCartNotice(`${item} 장바구니에 추가`);
  };

  const copyParentNote = async () => {
    const text = detail?.parentNote || description;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="sticky top-0 z-20 flex items-center justify-between px-[22px] py-3 sm:px-8 lg:px-10" style={{ background: 'rgba(7,7,12,0.86)', backdropFilter: 'blur(18px)' }}>
        <Link href="/spokedu-master/library" className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로가기">
          <ArrowLeft size={18} color="var(--spm-t)" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/spokedu-master/shop" className="relative grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="교구 스토어">
            <ShoppingBag size={18} color="var(--spm-t2)" />
            {cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10px] font-black text-white" style={{ background: 'var(--spm-red)' }}>{cartCount}</span> : null}
          </Link>
          <button type="button" onClick={() => toggleFavorite(program.id)} className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="즐겨찾기">
            <Bookmark size={18} color={favorite ? 'var(--spm-amb)' : 'var(--spm-t2)'} fill={favorite ? 'var(--spm-amb)' : 'none'} />
          </button>
        </div>
      </header>

      <main className="px-[22px] sm:px-8 lg:px-10">
        <section className="grid gap-5 md:grid-cols-[0.82fr_1.18fr]">
          <div className="relative min-h-[220px]"><ProgramHero program={program} locked={locked} /></div>
          <div className="pt-1 md:pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>{program.category}</p>
            <h1 className="mt-2 text-[30px] font-black leading-[1.12] md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{program.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}><Users size={12} />{program.grade}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}><Clock size={12} />{program.duration}분</span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}><MapPin size={12} />{program.space}</span>
            </div>
            {usageCount > 0 ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>
                <CheckCircle2 size={11} />
                {usageCount}회 사용{lastUsedRecord ? ` · 최근 ${new Date(lastUsedRecord.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}` : ''}
              </p>
            ) : null}
            {program.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {program.tags.slice(0, 8).map((tag) => (
                  <span key={tag} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t3)' }}>{tag}</span>
                ))}
              </div>
            ) : null}
            <p className="mt-5 text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>{description}</p>
            {locked ? (
              <Link href="/spokedu-master/payment?plan=pro" className="mt-7 flex h-12 w-full items-center justify-center rounded-[14px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
                Pro로 시작하고 전체 수업안 보기
              </Link>
            ) : (
              <div className="mt-7 flex flex-col gap-2">
                <Link href={`/spokedu-master/class-mode/${program.id}`} className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] text-[15px] font-black text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 28px rgba(99,102,241,0.35)' }}>
                  <Play size={18} fill="#fff" />수업 시작
                </Link>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Link href={`/spokedu-master/spomove/session?drill=${primarySpomoveId}&mode=projector&program=${program.id}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><MonitorPlay size={15} />연결 SPOMOVE</Link>
                  {detail?.videoUrl ? (
                    <a href={detail.videoUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><ExternalLink size={15} />영상 보기</a>
                  ) : (
                    <Link href={`/spokedu-master/report?program=${program.id}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><MessageCircle size={15} />설명 문구</Link>
                  )}
                  <button type="button" onClick={copyParentNote} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: copied ? 'var(--spm-grn)' : 'var(--spm-t)' }}>
                    {copied ? <CheckCircle2 size={15} /> : <Clipboard size={15} />}{copied ? '복사 완료' : '문구 복사'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <PackageSummary program={program} drillName={primarySpomove?.name ?? 'SPOMOVE 큰 화면'} />

        {detail ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <section className="grid grid-cols-2 gap-2 lg:col-span-2">
              {[
                ['권장 연령', detail.recommendedAge],
                ['권장 인원', detail.recommendedPlayers],
                ['수업 목표', detail.objective],
                ['발달 포인트', detail.developmentFocus],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                  <p className="mt-2 text-[12px] font-bold leading-5" style={{ color: 'var(--spm-t)' }}>{value || '-'}</p>
                </div>
              ))}
            </section>
            {detail.coachScript ? <DetailPanel title="코치 스크립트" icon={Lightbulb}><p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{detail.coachScript}</p></DetailPanel> : null}
            {detail.parentNote ? <DetailPanel title="보호자 설명 문구" icon={MessageCircle}><p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{detail.parentNote}</p></DetailPanel> : null}
            {detail.fieldTips.length > 0 ? <DetailPanel title="현장 팁" icon={Lightbulb}><DetailList items={detail.fieldTips} /></DetailPanel> : null}
            {detail.variations.length > 0 ? <DetailPanel title="변형 수업" icon={Shuffle}><DetailList items={detail.variations} /></DetailPanel> : null}
            {detail.safetyNotes.length > 0 ? <DetailPanel title="안전 체크" icon={ShieldAlert}><DetailList items={detail.safetyNotes} /></DetailPanel> : null}
            {relatedSpomoveIds.length > 0 ? (
              <DetailPanel title="연결 SPOMOVE" icon={Zap}>
                <div className="grid gap-2">
                  {relatedSpomoveIds.map((item) => {
                    const drill = drills.find((drillItem) => drillItem.id === item);
                    return (
                      <Link key={item} href={`/spokedu-master/spomove/session?drill=${item}&mode=class&program=${program.id}`} className="flex items-center gap-3 rounded-[13px] p-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)' }}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.16)' }}><Zap size={17} color="#a5b4fc" /></span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-[13px]" style={{ color: 'var(--spm-t)' }}>{drill?.name ?? item}</strong>
                          <span className="mt-1 block text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{getSpomoveUseLabel(program)}으로 실행</span>
                        </span>
                        <MonitorPlay size={16} color="#a5b4fc" />
                      </Link>
                    );
                  })}
                </div>
              </DetailPanel>
            ) : null}
          </div>
        ) : null}

        {program.equipment.length > 0 ? (
          <section className="mt-7 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>준비물</h2>
              <Link href="/spokedu-master/shop" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>교구 스토어</Link>
            </div>
            {cartNotice ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-[12px] p-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <p className="text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>{cartNotice}</p>
                <Link href="/spokedu-master/shop" className="text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>장바구니 보기</Link>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {program.equipment.map((item) => {
                const price = getEquipmentPrice(item);
                return (
                  <div key={item} className="flex items-center gap-2 rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[12px]" style={{ color: 'var(--spm-t)' }}>{item}</strong>
                      <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{price > 0 ? `${price.toLocaleString('ko-KR')}원` : '보유 장비'}</span>
                    </span>
                    {price > 0 ? <button type="button" onClick={() => addEquipment(item)} className="h-8 rounded-[10px] px-3 text-[11px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>담기</button> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {program.steps.length > 0 ? (
          <section className="mt-7">
            <h2 className="mb-3 text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>진행 순서</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {program.steps.map((step, index) => (
                <div key={`${index}-${step}`} className="flex gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>{index + 1}</span>
                  <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{step}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
