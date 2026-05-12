'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarPlus, Heart, Lightbulb, Lock, MessageCircle, Play, ShieldAlert, ShoppingBag, Shuffle, Zap, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { PROGRAMS } from '../../lib/data';
import { useIsPro, useMasterStore } from '../../store';

function getEquipmentPrice(item: string) {
  if (item.includes('스마트폰') || item.includes('태블릿') || item.includes('프로젝터')) return 0;
  if (item.includes('마커')) return 8900;
  if (item.includes('카드')) return 12000;
  if (item.includes('허들')) return 24000;
  if (item.includes('바통')) return 6900;
  return 9900;
}

function ThumbGrid({ colors }: { colors: [string, string, string, string] }) {
  return (
    <div className="grid h-[220px] grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-[18px] md:h-full" aria-hidden>
      {colors.map((color) => <span key={color} style={{ background: color }} />)}
    </div>
  );
}

function FieldButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-9 rounded-full px-3 text-[12px] font-bold" style={{ background: active ? 'var(--spm-acc)' : 'var(--spm-s2)', color: active ? '#fff' : 'var(--spm-t2)', border: active ? '1px solid transparent' : '1px solid var(--spm-br2)' }}>{label}</button>;
}

function DetailPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}><Icon size={17} color="var(--spm-acc)" />{title}</h2>
      {children}
    </section>
  );
}

function DetailList({ items }: { items: string[] }) {
  return <div className="space-y-2">{items.map((item) => <p key={item} className="rounded-[12px] p-3 text-[12px] font-semibold leading-5" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{item}</p>)}</div>;
}

export default function LibraryDetailView({ id }: { id: string }) {
  const router = useRouter();
  const program = useMemo(() => PROGRAMS.find((item) => item.id === id), [id]);
  const isPro = useIsPro();
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const addLesson = useMasterStore((state) => state.addLesson);
  const addToCart = useMasterStore((state) => state.addToCart);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [classId, setClassId] = useState('3학년 A반');
  const [period, setPeriod] = useState(3);
  const [duration, setDuration] = useState(program?.duration ?? 15);
  const locked = !!program?.isPro && !isPro;

  if (!program) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-[22px] text-center" style={{ background: 'var(--spm-bg)' }}>
        <p className="text-[16px] font-bold" style={{ color: 'var(--spm-t)' }}>수업안을 찾을 수 없습니다.</p>
        <Link href="/spokedu-master/library" className="mt-5 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)' }}>라이브러리로 돌아가기</Link>
      </div>
    );
  }

  const favorite = favorites.includes(program.id);

  const saveLesson = () => {
    addLesson({ id: Date.now(), title: program.title, classId, date: new Date().toISOString(), period, duration, done: false, color: program.colors[1], memo: `${program.category} / ${program.space}` });
    setSheetOpen(false);
    router.push('/spokedu-master/plan');
  };

  const addEquipment = (item: string) => {
    const price = getEquipmentPrice(item);
    if (price <= 0) return;
    addToCart({ id: item, name: item, price, qty: 1 });
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="sticky top-0 z-20 flex items-center justify-between px-[22px] py-3 sm:px-8 lg:px-10" style={{ background: 'rgba(7,7,12,0.86)', backdropFilter: 'blur(18px)' }}>
        <Link href="/spokedu-master/library" className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="뒤로가기"><ArrowLeft size={18} color="var(--spm-t)" /></Link>
        <div className="flex items-center gap-2">
          <Link href="/spokedu-master/shop" className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="교구 쇼핑"><ShoppingBag size={18} color="var(--spm-t2)" /></Link>
          <button type="button" onClick={() => toggleFavorite(program.id)} className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }} aria-label="즐겨찾기">
            <Heart size={18} color={favorite ? 'var(--spm-red)' : 'var(--spm-t2)'} fill={favorite ? 'var(--spm-red)' : 'none'} />
          </button>
        </div>
      </header>

      <main className="px-[22px] sm:px-8 lg:px-10">
        <section className="grid gap-5 md:grid-cols-[0.82fr_1.18fr]">
          <div className="relative min-h-[220px]">
            <ThumbGrid colors={program.colors} />
            {locked ? <div className="absolute inset-0 grid place-items-center rounded-[18px] bg-black/58 backdrop-blur-[3px]"><div className="rounded-[12px] px-4 py-3 text-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}><Lock className="mx-auto mb-2 h-5 w-5" color="var(--spm-amb)" /><p className="text-[12px] font-black" style={{ color: 'var(--spm-amb)' }}>PRO 수업안</p></div></div> : null}
          </div>
          <div className="pt-1 md:pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>{program.category}</p>
            <h1 className="mt-2 text-[30px] font-black leading-[1.12] md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{program.title}</h1>
            <p className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{program.grade} / {program.duration}분 / {program.space}</p>
            <p className="mt-5 text-[14px] font-medium leading-7" style={{ color: 'var(--spm-t2)' }}>{program.description}</p>
            {locked ? (
              <Link href="/spokedu-master/profile" className="mt-7 block rounded-[14px] p-4 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}><strong className="block text-[14px]" style={{ color: 'var(--spm-amb)' }}>PRO로 업그레이드하고 전체 수업안 열기</strong></Link>
            ) : (
              <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link href="/spokedu-master/class-record" className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-bold text-white" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px var(--spm-acc-glow)' }}><Play size={16} fill="#fff" />수업 기록 시작</Link>
                <button type="button" onClick={() => setSheetOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[14px] font-bold" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}><CalendarPlus size={16} />수업 계획 추가</button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>준비물</h2><Link href="/spokedu-master/shop" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>교구 쇼핑</Link></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {program.equipment.map((item) => {
              const price = getEquipmentPrice(item);
              return (
                <div key={item} className="flex items-center gap-2 rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                  <span className="min-w-0 flex-1"><strong className="block text-[12px]" style={{ color: 'var(--spm-t)' }}>{item}</strong><span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{price > 0 ? `${price.toLocaleString('ko-KR')}원` : '보유 장비'}</span></span>
                  {price > 0 ? <button type="button" onClick={() => addEquipment(item)} className="h-8 rounded-[10px] px-3 text-[11px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>담기</button> : null}
                </div>
              );
            })}
          </div>
        </section>

        {program.lessonDetail ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <section className="grid grid-cols-2 gap-2 lg:col-span-2">
              {[
                ['권장 연령', program.lessonDetail.recommendedAge],
                ['권장 인원', program.lessonDetail.recommendedPlayers],
                ['수업 목표', program.lessonDetail.objective],
                ['발달 포인트', program.lessonDetail.developmentFocus],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                  <p className="mt-2 text-[12px] font-bold leading-5" style={{ color: 'var(--spm-t)' }}>{value}</p>
                </div>
              ))}
            </section>
            <DetailPanel title="코치 스크립트" icon={Lightbulb}><p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{program.lessonDetail.coachScript}</p></DetailPanel>
            <DetailPanel title="보호자 공유 문장" icon={MessageCircle}><p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{program.lessonDetail.parentNote}</p></DetailPanel>
            <DetailPanel title="현장 팁" icon={Lightbulb}><DetailList items={program.lessonDetail.fieldTips} /></DetailPanel>
            <DetailPanel title="변형 수업" icon={Shuffle}><DetailList items={program.lessonDetail.variations} /></DetailPanel>
            <DetailPanel title="안전 체크" icon={ShieldAlert}><DetailList items={program.lessonDetail.safetyNotes} /></DetailPanel>
            <DetailPanel title="연결 SPOMOVE" icon={Zap}><div className="flex flex-wrap gap-2">{program.lessonDetail.relatedSpomoveIds.map((item) => <Link key={item} href={`/spokedu-master/spomove/session?drill=${item}&mode=class`} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>{item}</Link>)}</div></DetailPanel>
          </div>
        ) : null}

        <section className="mt-7">
          <h2 className="mb-3 text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>진행 순서</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {program.steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-[14px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>{index + 1}</span>
                <p className="text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>{step}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomSheet open={sheetOpen} title="수업 계획 추가" onClose={() => setSheetOpen(false)}>
        <div className="space-y-5">
          <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>반 선택</p><div className="flex flex-wrap gap-2">{['3학년 A반', '3학년 B반', '4학년 A반'].map((item) => <FieldButton key={item} label={item} active={classId === item} onClick={() => setClassId(item)} />)}</div></div>
          <div><p className="mb-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>교시</p><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((item) => <FieldButton key={item} label={`${item}교시`} active={period === item} onClick={() => setPeriod(item)} />)}</div></div>
          <label className="block"><span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>시간</span><input type="number" min={5} max={60} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-11 w-full rounded-[12px] border bg-transparent px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} /></label>
          <button type="button" onClick={saveLesson} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>저장하고 계획으로 이동</button>
        </div>
      </BottomSheet>
    </div>
  );
}
