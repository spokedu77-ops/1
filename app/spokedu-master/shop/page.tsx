'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useMasterStore } from '../store';

const PRODUCTS = [
  { id: '마커콘', name: '마커콘 세트', desc: '민첩성, 릴레이, 방향 전환 수업 기본 교구', price: 8900, tone: '#f59e0b' },
  { id: '이미지 카드', name: '움직임 이미지 카드', desc: '유치부와 초등 저학년 상상놀이 수업용', price: 12000, tone: '#10b981' },
  { id: '미니 허들', name: '미니 허들 6개입', desc: '균형, 점프, 하체 협응 훈련용', price: 24000, tone: '#818cf8' },
  { id: '배턴', name: '소프트 릴레이 배턴', desc: '팀 릴레이와 협동 수업용', price: 6900, tone: '#fb7185' },
  { id: '프로젝터', name: '수업용 미니 프로젝터', desc: 'SPOMOVE 전체화면 실행 권장 장비', price: 159000, tone: '#38bdf8' },
];

export default function SpokeduMasterShopPage() {
  const cart = useMasterStore((state) => state.cart);
  const addToCart = useMasterStore((state) => state.addToCart);
  const updateQty = useMasterStore((state) => state.updateQty);
  const clearCart = useMasterStore((state) => state.clearCart);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>equipment store</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>교구 샵</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업안에 필요한 교구를 바로 담습니다. 프로그램 라이브러리와 연결되는 판매 영역입니다.
        </p>
      </header>

      <div className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <section>
          <div className="grid gap-3 md:grid-cols-2">
            {PRODUCTS.map((product) => (
              <article key={product.id} className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px]" style={{ background: `${product.tone}24` }}>
                    <ShoppingBag size={21} color={product.tone} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-black" style={{ color: 'var(--spm-t)' }}>{product.name}</h2>
                    <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{product.desc}</p>
                    <p className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{product.price.toLocaleString('ko-KR')}원</p>
                  </div>
                </div>
                <button type="button" onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, qty: 1 })} className="mt-4 h-11 w-full rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  장바구니 담기
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[18px] p-5" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>장바구니</h2>
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
                        <p className="truncate text-[13px] font-black" style={{ color: 'var(--spm-t)' }}>{item.name}</p>
                        <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{item.price.toLocaleString('ko-KR')}원</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateQty(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ background: 'var(--spm-s2)' }} aria-label="수량 감소">
                          <Minus size={13} color="var(--spm-t2)" />
                        </button>
                        <span className="w-6 text-center text-[12px] font-black" style={{ color: 'var(--spm-t)' }}>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-[8px]" style={{ background: 'var(--spm-s2)' }} aria-label="수량 증가">
                          <Plus size={13} color="var(--spm-t2)" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4" style={{ borderColor: 'var(--spm-br2)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t2)' }}>합계</span>
                    <strong className="text-[20px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{total.toLocaleString('ko-KR')}원</strong>
                  </div>
                  <button type="button" className="mt-4 h-12 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>주문서 만들기</button>
                </div>
              </div>
            ) : (
              <div className="rounded-[14px] p-5 text-center" style={{ background: 'var(--spm-s3)' }}>
                <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>담긴 교구가 없습니다</p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>수업 상세에서 준비물을 담거나 여기서 직접 선택하세요.</p>
              </div>
            )}
          </section>
          <Link href="/spokedu-master/library" className="block rounded-[14px] p-4 text-center text-[13px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
            수업안 보러가기
          </Link>
        </aside>
      </div>
    </div>
  );
}
