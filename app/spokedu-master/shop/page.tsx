'use client';

import Link from 'next/link';
import { CheckCircle2, Clipboard, Mail, Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { PROGRAMS } from '../lib/data';
import { useMasterStore } from '../store';

const PRODUCTS = [
  { id: 'marker-cone', name: '마커콘 세트', desc: '방향 전환, 릴레이, 공간 구분 수업에 바로 쓰는 기본 교구', price: 8900, tone: '#f59e0b', tags: ['공간 구성', '릴레이'] },
  { id: 'image-card', name: '움직임 이미지 카드', desc: '유아부터 초등까지 동작을 빠르게 이해시키는 수업 카드', price: 12000, tone: '#10b981', tags: ['유아체육', '표현 활동'] },
  { id: 'mini-hurdle', name: '미니 허들 6개입', desc: '균형, 점프, 하체 협응 훈련에 연결하기 좋은 안전 교구', price: 24000, tone: '#818cf8', tags: ['밸런스', '출발 반응'] },
  { id: 'baton', name: '소프트 릴레이 바통', desc: '팀 릴레이와 협동 수업을 위한 부드러운 바통', price: 6900, tone: '#fb7185', tags: ['팀 활동', '협응'] },
  { id: 'projector', name: '수업용 미니 프로젝터', desc: 'SPOMOVE 웹 실행과 큰 화면 수업을 위한 권장 장비', price: 159000, tone: '#38bdf8', tags: ['SPOMOVE', '큰 화면'] },
];

const BUNDLES = [
  { id: 'starter', name: '개인 강사 스타터 세트', desc: '마커콘, 이미지 카드, 바통으로 첫 수업 준비를 끝내는 구성', items: ['마커콘', '이미지 카드', '바통'], price: 26800 },
  { id: 'center', name: '센터 공용 운영 세트', desc: '여러 강사가 함께 쓰는 SPOMOVE 실행 장비와 기본 교구 구성', items: ['마커콘', '미니 허들', '바통', '프로젝터'], price: 198800 },
];

function ProductIcon({ tone }: { tone: string }) {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px]" style={{ background: `${tone}24` }}>
      <ShoppingBag size={21} color={tone} />
    </span>
  );
}

export default function SpokeduMasterShopPage() {
  const cart = useMasterStore((state) => state.cart);
  const addToCart = useMasterStore((state) => state.addToCart);
  const updateQty = useMasterStore((state) => state.updateQty);
  const clearCart = useMasterStore((state) => state.clearCart);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [orderItems, setOrderItems] = useState<typeof cart>([]);
  const [orderId, setOrderId] = useState('');
  const [orderCopied, setOrderCopied] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const usedEquipment = useMemo(() => Array.from(new Set(PROGRAMS.flatMap((program) => program.equipment))).slice(0, 10), []);

  const addBundle = (bundle: (typeof BUNDLES)[number]) => {
    addToCart({ id: bundle.id, name: bundle.name, price: bundle.price, qty: 1 });
  };

  const createOrderRequest = () => {
    if (cart.length === 0) return;
    const id = `SPM-${Date.now().toString().slice(-6)}`;
    setOrderItems([...cart]);
    setOrderTotal(total);
    setOrderCount(cartCount);
    setOrderId(id);
    clearCart();
    setOrderOpen(true);
  };

  const buildOrderText = (items: typeof cart, id: string, tot: number) =>
    `[SPOKEDU 교구 주문 요청]\n주문 번호: ${id}\n\n` +
    items.map((item) => `- ${item.name} × ${item.qty}  ${(item.price * item.qty).toLocaleString('ko-KR')}원`).join('\n') +
    `\n\n합계: ${tot.toLocaleString('ko-KR')}원`;

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(buildOrderText(orderItems, orderId, orderTotal));
      setOrderCopied(true);
      window.setTimeout(() => setOrderCopied(false), 1800);
    } catch {
      setOrderCopied(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
          equipment shop
        </p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          교구 스토어
        </h1>
        <p className="mt-2 max-w-[760px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          프로그램 라이브러리와 연결되는 수업 준비 영역입니다. 학생 데이터와 분리된 교구 구매 흐름으로 운영해, 강사와 센터가 필요한 장비를 빠르게 장바구니에 담을 수 있게 합니다.
        </p>
      </header>

      <section className="mx-[22px] mb-7 rounded-[18px] p-5 sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.22), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.26)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#93c5fd' }}>
          from library
        </p>
        <h2 className="mt-2 text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          라이브러리에서 자주 쓰는 교구
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
                    세트 담기
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
        <div className="py-2">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
              <CheckCircle2 size={22} color="var(--spm-grn)" />
            </div>
            <div>
              <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>교구 주문 요청 준비 완료</h2>
              <p className="mt-0.5 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>주문 번호: {orderId}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[14px] p-4" style={{ background: 'var(--spm-s3)' }}>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--spm-t)' }}>{item.name} × {item.qty}</span>
                  <span className="shrink-0 text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{(item.price * item.qty).toLocaleString('ko-KR')}원</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--spm-br2)' }}>
              <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>합계</span>
              <strong className="text-[18px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{orderTotal.toLocaleString('ko-KR')}원</strong>
            </div>
          </div>

          <p className="mt-3 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>
            아래 버튼으로 주문 내역을 복사하거나 이메일로 보내 견적을 진행하세요. 실제 결제는 확인 후 안내됩니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={copyOrder} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: orderCopied ? 'rgba(16,185,129,0.14)' : 'var(--spm-s3)', color: orderCopied ? 'var(--spm-grn)' : 'var(--spm-t)' }}>
              {orderCopied ? <CheckCircle2 size={15} /> : <Clipboard size={15} />}
              {orderCopied ? '복사 완료' : '내역 복사'}
            </button>
            <a
              href={`mailto:contact@spokedu.kr?subject=${encodeURIComponent(`교구 주문 요청 ${orderId}`)}&body=${encodeURIComponent(buildOrderText(orderItems, orderId, orderTotal))}`}
              className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white"
              style={{ background: 'var(--spm-acc)' }}
            >
              <Mail size={15} />
              이메일로 보내기
            </a>
          </div>
          <button type="button" onClick={() => setOrderOpen(false)} className="mt-2 h-10 w-full rounded-[12px] text-[13px] font-bold" style={{ color: 'var(--spm-t3)' }}>
            닫기
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
