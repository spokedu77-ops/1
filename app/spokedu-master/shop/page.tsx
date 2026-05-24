'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Minus, MonitorPlay, PackageCheck, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useMasterStore } from '../store';

const PRODUCTS = [
  { id: 'marker-cone', name: '마커콘 세트', desc: '방향 전환, 릴레이, 공간 구분 수업에 바로 쓰는 기본 교구', price: 8900, tone: '#f59e0b', tags: ['공간 구성', '릴레이'], lesson: '민첩성·반응 수업' },
  { id: 'image-card', name: '움직임 이미지 카드', desc: '유아부터 초등까지 동작을 빠르게 이해시키는 수업 카드', price: 12000, tone: '#10b981', tags: ['유아체육', '표현 활동'], lesson: '도입·표현 활동' },
  { id: 'mini-hurdle', name: '미니 허들 6개입', desc: '균형, 점프, 하체 협응 훈련에 연결하기 좋은 안전 교구', price: 24000, tone: '#818cf8', tags: ['밸런스', '출발 반응'], lesson: '점프·협응 루틴' },
  { id: 'baton', name: '소프트 릴레이 바통', desc: '팀 릴레이와 협동 수업을 위한 부드러운 바통', price: 6900, tone: '#fb7185', tags: ['팀 활동', '협응'], lesson: '협동 릴레이' },
  { id: 'projector', name: '수업용 미니 프로젝터', desc: 'SPOMOVE 웹 실행과 큰 화면 수업을 위한 권장 장비', price: 159000, tone: '#38bdf8', tags: ['SPOMOVE', '큰 화면'], lesson: '화면 활동' },
];

const BUNDLES = [
  { id: 'starter', name: '개인 강사 스타터 키트', desc: '마커콘, 이미지 카드, 바통으로 첫 수업 준비를 끝내는 구성', items: ['마커콘', '이미지 카드', '바통'], price: 26800, fit: '개인 강사·방과후' },
  { id: 'center', name: '센터 공용 운영 키트', desc: '여러 강사가 함께 쓰는 SPOMOVE 실행 장비와 기본 교구 구성', items: ['마커콘', '미니 허들', '바통', '프로젝터'], price: 198800, fit: '센터·도장' },
];

const STORE_FLOW = [
  { icon: BookOpen, label: '수업안 확인', href: '/spokedu-master/library' },
  { icon: MonitorPlay, label: '큰 화면 실행', href: '/spokedu-master/spomove' },
  { icon: ClipboardCheck, label: '설명 문구', href: '/spokedu-master/report' },
] as const;

function ProductIcon({ tone }: { tone: string }) {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px]" style={{ background: `${tone}24` }}>
      <ShoppingBag size={21} color={tone} />
    </span>
  );
}

export default function SpokeduMasterShopPage() {
  const cart = useMasterStore((state) => state.cart);
  const programs = useMasterStore((state) => state.programs);
  const addToCart = useMasterStore((state) => state.addToCart);
  const updateQty = useMasterStore((state) => state.updateQty);
  const clearCart = useMasterStore((state) => state.clearCart);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const usedEquipment = useMemo(() => Array.from(new Set(programs.flatMap((p) => p.equipment))).slice(0, 10), [programs]);

  const addBundle = (bundle: (typeof BUNDLES)[number]) => {
    addToCart({ id: bundle.id, name: bundle.name, price: bundle.price, qty: 1 });
  };

  const createOrderRequest = () => {
    if (cart.length === 0) return;
    setOrderTotal(total);
    setOrderCount(cartCount);
    clearCart();
    setOrderOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
          lesson kit store
        </p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          수업 준비 키트
        </h1>
        <p className="mt-2 max-w-[760px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          라이브러리 수업안에서 실제로 쓰는 준비물을 빠르게 맞춥니다. 판매 페이지가 아니라 수업 실행에 필요한 교구를 확인하고 견적 요청까지 이어가는 운영 영역입니다.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:max-w-[760px]">
          {STORE_FLOW.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex h-12 items-center justify-between rounded-[14px] px-4 text-[12px] font-black"
              style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
            >
              <span className="flex items-center gap-2"><Icon size={15} />{label}</span>
              <ArrowRight size={14} color="var(--spm-t3)" />
            </Link>
          ))}
        </div>
      </header>

      <section className="mx-[22px] mb-7 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.22), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.26)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#93c5fd' }}>
          from lesson library
        </p>
        <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          수업안에서 자주 등장하는 준비물
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {usedEquipment.map((item) => (
            <span key={item} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
        <main className="space-y-7">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                추천 세트
              </h2>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                수업 준비 시간 단축
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {BUNDLES.map((bundle) => (
                <article key={bundle.id} className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px]" style={{ background: 'rgba(16,185,129,0.13)' }}>
                      <PackageCheck size={21} color="var(--spm-grn)" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>
                        {bundle.name}
                      </h3>
                      <p className="mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--spm-acc)' }}>
                        {bundle.fit}
                      </p>
                      <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>
                        {bundle.desc}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bundle.items.map((item) => (
                          <span key={item} className="rounded-full px-2 py-1 text-[10px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                        {bundle.price.toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => addBundle(bundle)} className="mt-4 h-11 w-full rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                    키트 담기
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                개별 교구
              </h2>
              <Link href="/spokedu-master/library" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
                수업안 보기
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PRODUCTS.map((product) => (
                <article key={product.id} className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <div className="flex items-start gap-3">
                    <ProductIcon tone={product.tone} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>
                        {product.name}
                      </h3>
                      <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>
                        {product.desc}
                      </p>
                      <p className="mt-2 text-[11px] font-black" style={{ color: 'var(--spm-acc)' }}>
                        연결 수업 · {product.lesson}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {product.tags.map((item) => (
                          <span key={item} className="rounded-full px-2 py-1 text-[10px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                        {product.price.toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, qty: 1 })} className="mt-4 h-11 w-full rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                    장바구니 담기
                  </button>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-[18px] p-5 lg:sticky lg:top-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                장바구니
              </h2>
              {cart.length > 0 ? (
                <button type="button" onClick={clearCart} className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label="장바구니 비우기">
                  <Trash2 size={15} color="var(--spm-red)" />
                </button>
              ) : null}
            </div>
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s3)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>
                          {item.name}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                          {item.price.toLocaleString('ko-KR')}원
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateQty(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ background: 'var(--spm-s2)' }} aria-label="수량 감소">
                          <Minus size={13} color="var(--spm-t2)" />
                        </button>
                        <span className="w-6 text-center text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>
                          {item.qty}
                        </span>
                        <button type="button" onClick={() => updateQty(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ background: 'var(--spm-s2)' }} aria-label="수량 증가">
                          <Plus size={13} color="var(--spm-t2)" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4" style={{ borderColor: 'var(--spm-br2)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>
                      합계
                    </span>
                    <strong className="text-[20px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                      {total.toLocaleString('ko-KR')}원
                    </strong>
                  </div>
                  <button type="button" onClick={createOrderRequest} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                    <CheckCircle2 size={16} />
                    주문 요청 만들기
                  </button>
                  <p className="mt-2 text-[11px] leading-5" style={{ color: 'var(--spm-t3)' }}>
                    실제 결제 전 견적과 배송 가능 여부를 확인하는 요청으로 접수됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>
                  담긴 교구가 없습니다.
                </p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>
                  수업 상세에서 준비물을 담거나 여기서 직접 선택하세요.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>

      <BottomSheet open={orderOpen} title="주문 요청 완료" onClose={() => setOrderOpen(false)}>
        <div className="py-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
            <CheckCircle2 size={30} color="var(--spm-grn)" />
          </div>
          <h2 className="mt-5 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
            교구 주문 요청을 만들었습니다.
          </h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
            총 {orderCount}개 항목, {orderTotal.toLocaleString('ko-KR')}원 기준으로 견적 요청을 준비했습니다.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOrderOpen(false)} className="h-11 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
              닫기
            </button>
            <Link href="/spokedu-master/library" className="flex h-11 items-center justify-center rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
              수업안으로
            </Link>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
