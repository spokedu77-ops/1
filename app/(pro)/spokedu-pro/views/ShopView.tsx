'use client';

import type { ElementType } from 'react';
import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { SubscriberBadge, SubscriberButton } from '../components/SubscriberWorkspacePrimitives';

type CategoryId = 'all' | 'spomove' | 'balance' | 'classroom' | 'device';

type Product = {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  originalPrice?: number;
  badge?: string;
  accent: string;
  compatible?: boolean;
  featured?: boolean;
  description: string;
  tags: string[];
};

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'spomove', label: 'SPOMOVE' },
  { id: 'balance', label: '밸런스' },
  { id: 'classroom', label: '수업 교구' },
  { id: 'device', label: '촬영 장비' },
];

const PRODUCTS: Product[] = [
  {
    id: 'reaction-ball-set',
    name: 'SKLZ 반응훈련 볼 세트',
    category: 'spomove',
    price: 28000,
    originalPrice: 35000,
    badge: '구독자 혜택',
    accent: 'from-cyan-300 via-blue-400 to-indigo-500',
    compatible: true,
    featured: true,
    description: '반응속도, 시지각, 순발력 세션에 바로 쓰는 핵심 교구 세트',
    tags: ['반응속도', '순발력', '인지 이동'],
  },
  {
    id: 'mini-hurdle',
    name: '미니 허들 6개 세트',
    category: 'balance',
    price: 42000,
    originalPrice: 52000,
    badge: '베스트',
    accent: 'from-amber-300 via-orange-400 to-rose-500',
    featured: true,
    description: '균형, 적응, 민첩성 수업을 안정적으로 구성하는 기본 장비',
    tags: ['밸런스', '민첩성', '적응'],
  },
  {
    id: 'tripod-holder',
    name: '스마트폰 삼각대 거치대',
    category: 'device',
    price: 19900,
    badge: 'NEW',
    accent: 'from-violet-300 via-fuchsia-400 to-pink-500',
    compatible: true,
    description: 'SPOMOVE 기록과 수업 피드백 영상을 흔들림 없이 촬영',
    tags: ['촬영', '기록', '리포트'],
  },
  {
    id: 'marker-cones',
    name: '컬러 마커콘 20개 세트',
    category: 'classroom',
    price: 15500,
    originalPrice: 18000,
    accent: 'from-emerald-300 via-teal-400 to-cyan-500',
    compatible: true,
    description: '동선, 구역, 스테이션 단계를 빠르게 바꾸는 수업 필수품',
    tags: ['동선', '그룹수업', '스테이션'],
  },
  {
    id: 'balance-pad',
    name: '소프트 밸런스 패드',
    category: 'balance',
    price: 33000,
    badge: '추천',
    accent: 'from-lime-300 via-emerald-400 to-green-500',
    description: '발목 안정성과 자세 조절 활동을 위한 안전 패드',
    tags: ['자세조절', '코어', '안정성'],
  },
  {
    id: 'number-cards',
    name: '인지 이동 숫자 카드',
    category: 'spomove',
    price: 12000,
    accent: 'from-sky-300 via-cyan-400 to-blue-500',
    compatible: true,
    description: '숫자, 색, 방향 전환 과제를 조합해 쓰는 확장 카드',
    tags: ['주의집중', '작업기억', '색인지'],
  },
];

const formatPrice = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

export default function ShopView() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      const categoryMatch = category === 'all' || product.category === category;
      const keywordMatch =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword) ||
        product.tags.some((tag) => tag.toLowerCase().includes(keyword));
      return categoryMatch && keywordMatch;
    });
  }, [category, query]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = PRODUCTS.find((item) => item.id === id);
          return product ? { product, qty } : null;
        })
        .filter((line): line is { product: Product; qty: number } => Boolean(line)),
    [cart]
  );

  const cartCount = cartLines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const shipping = subtotal >= 50000 || subtotal === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setCartOpen(true);
  };

  const updateQty = (id: string, nextQty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (nextQty <= 0) delete next[id];
      else next[id] = nextQty;
      return next;
    });
  };

  return (
    <section className="min-h-full pb-28 md:pb-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Spokedu Shop</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">교구 샵</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
              구독 수업안과 바로 연결되는 교구를 고르고, SPOMOVE 호환 장비를 빠르게 준비하세요.
            </p>
          </div>
          <SubscriberButton tone="cyan" icon={<ShoppingBag className="h-4 w-4" />} onClick={() => setCartOpen(true)}>
            장바구니
            {cartCount > 0 ? (
              <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs text-slate-950">{cartCount}</span>
            ) : null}
          </SubscriberButton>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  이번 주 구독자 추천 세트
                </div>
                <h3 className="mt-4 text-xl font-black text-white">반응속도 집중 패키지</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                  반응훈련 볼, 숫자 카드, 거치대를 함께 구성해 측정-활동-리포트 흐름을 한 번에 완성합니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['SPOMOVE 호환', '오늘 수업 추천', '5만원 이상 무료배송'].map((label) => (
                    <SubscriberBadge key={label} tone="cyan">
                      {label}
                    </SubscriberBadge>
                  ))}
                </div>
              </div>
              <SubscriberButton
                tone="sky"
                wide
                icon={<ChevronRight className="h-4 w-4" />}
                onClick={() => {
                  addToCart('reaction-ball-set');
                  addToCart('number-cards');
                  addToCart('tripod-holder');
                }}
              >
                패키지 담기
              </SubscriberButton>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-4">
            <ShopStat icon={ShieldCheck} label="구독자 혜택" value="최대 24%" />
            <ShopStat icon={Truck} label="무료배송" value="5만원+" />
            <ShopStat icon={Package} label="호환 교구" value="4종" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="교구명, 활동명, 태그 검색"
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/60 pl-10 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={`h-11 shrink-0 rounded-lg px-4 text-sm font-black transition ${
                  category === item.id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Featured</h3>
            <p className="text-xs font-bold text-slate-500">수업안 연동 추천</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PRODUCTS.filter((product) => product.featured).map((product) => (
              <ProductCard key={product.id} product={product} compact onAdd={() => addToCart(product.id)} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Products</h3>
            <p className="text-xs font-bold text-slate-500">{filteredProducts.length}개 상품</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={() => addToCart(product.id)} />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-24 right-4 z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-950/50 md:bottom-6 md:right-8"
      >
        <ShoppingBag className="h-5 w-5" />
        {cartCount > 0 ? `${cartCount}개` : '담기'}
      </button>

      {cartOpen ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="장바구니 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => setCartOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Cart</p>
                <h3 className="mt-1 text-xl font-black text-white">장바구니</h3>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cartLines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-10 w-10 text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-300">아직 담긴 교구가 없습니다.</p>
                  <p className="mt-1 text-xs text-slate-500">추천 상품을 담아 수업 준비를 시작하세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartLines.map(({ product, qty }) => (
                    <div key={product.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex gap-3">
                        <ProductVisual product={product} small />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{product.name}</p>
                          <p className="mt-1 text-xs font-bold text-cyan-200">{formatPrice(product.price)}원</p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-lg border border-white/10">
                              <button
                                type="button"
                                onClick={() => updateQty(product.id, qty - 1)}
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-300 hover:bg-white/10"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-black text-white">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(product.id, qty + 1)}
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-300 hover:bg-white/10"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-sm font-black text-white">{formatPrice(product.price * qty)}원</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>상품 금액</span>
                  <span className="font-bold text-white">{formatPrice(subtotal)}원</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>배송비</span>
                  <span className="font-bold text-white">{shipping === 0 ? '무료' : `${formatPrice(shipping)}원`}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white">
                  <span>결제 예정 금액</span>
                  <span>{formatPrice(total)}원</span>
                </div>
              </div>
              <SubscriberButton
                tone="sky"
                wide
                disabled={cartLines.length === 0}
                className="mt-4 w-full sm:w-full"
                icon={<Check className="h-4 w-4" />}
                onClick={() => undefined}
              >
                주문서로 이동
              </SubscriberButton>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function ProductCard({ product, compact = false, onAdd }: { product: Product; compact?: boolean; onAdd: () => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.08]">
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex gap-3">
          <ProductVisual product={product} />
          <div className="min-w-0 flex-1">
            <div className="flex min-h-6 items-start gap-2">
              <h4 className="min-w-0 flex-1 text-sm font-black leading-5 text-white">{product.name}</h4>
              {product.badge ? <SubscriberBadge tone="amber">{product.badge}</SubscriberBadge> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{product.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.tags.slice(0, compact ? 2 : 3).map((tag) => (
                <SubscriberBadge key={tag}>{tag}</SubscriberBadge>
              ))}
            </div>
            {product.compatible ? (
              <div className="mt-3">
                <SubscriberBadge tone="cyan">
                  <Check className="mr-1 h-3 w-3" />
                  SPOMOVE 호환
                </SubscriberBadge>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-black text-white">{formatPrice(product.price)}원</div>
            {product.originalPrice ? (
              <div className="text-xs font-bold text-slate-500 line-through">{formatPrice(product.originalPrice)}원</div>
            ) : null}
          </div>
          <SubscriberButton tone="sky" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAdd}>
            담기
          </SubscriberButton>
        </div>
      </div>
    </article>
  );
}

function ProductVisual({ product, small = false }: { product: Product; small?: boolean }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${product.accent} ${
        small ? 'h-14 w-14' : 'h-24 w-24'
      }`}
    >
      <div className="absolute inset-2 rounded-lg border border-white/40" />
      <Package className={`absolute text-white/90 ${small ? 'bottom-3 right-3 h-6 w-6' : 'bottom-4 right-4 h-9 w-9'}`} />
      <div className="absolute left-3 top-3 h-2 w-8 rounded-full bg-white/70" />
      <div className="absolute left-3 top-7 h-2 w-5 rounded-full bg-white/50" />
    </div>
  );
}

function ShopStat({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-lg bg-slate-950/50 px-2 py-4 text-center">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-2 text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
