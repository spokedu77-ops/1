'use client';

import { Package, ShoppingBag } from 'lucide-react';
import { useMasterCanBuySpomat } from '../access/MasterAccessProvider';
import { SPOMAT_PRODUCT_CONTRACT } from '../lib/productCatalog';
import { SPOMAT_BULK_INQUIRY_HREF } from '../lib/businessInfo';

const SPOMAT_SPECS = [
  { label: '규격', value: '60 × 60cm' },
  { label: '총 두께', value: '5.5mm' },
  { label: '표면', value: '폴리에스터' },
  { label: '바닥', value: '라텍스 미끄럼 방지' },
  { label: '테두리', value: '폴리프로필렌' },
  { label: '색상', value: '빨강·노랑·초록·파랑' },
] as const;

const PURCHASE_HREF = '/api/spokedu-master/shop/spomat/purchase';

export default function SpokeduMasterShopPage() {
  const isPremiumMember = useMasterCanBuySpomat();

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
          SPOMAT store
        </p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>
          SPOMAT
        </h1>
        <p className="mt-2 max-w-[760px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          시지각형 SPOMOVE 활동과 놀이체육에 활용하는 4색 패드
        </p>
      </header>

      <div className="px-[22px] sm:px-8 lg:px-10">
        <article className="max-w-[640px] rounded-[20px] p-6" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px]" style={{ background: 'var(--spm-acc-a12)' }}>
              <Package size={26} color="var(--spm-acc)" />
            </span>
            <div>
              <h2 className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>SPOMAT</h2>
              <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--spm-t2)' }}>
                시지각형 SPOMOVE 활동과 놀이체육에 활용하는 4색 패드
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {SPOMAT_SPECS.map(({ label, value }) => (
              <div key={label} className="contents">
                <dt className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</dt>
                <dd className="text-[12px] font-medium" style={{ color: 'var(--spm-t2)' }}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-[14px] p-4" style={{ background: 'var(--spm-s3)' }}>
            {isPremiumMember ? (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--spm-acc)' }}>프리미엄 회원가</p>
                <p className="mt-1 text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                  {SPOMAT_PRODUCT_CONTRACT.premiumPrice.toLocaleString('ko-KR')}원
                </p>
                <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                  <span style={{ textDecoration: 'line-through', marginRight: 6 }}>일반가 {SPOMAT_PRODUCT_CONTRACT.regularPrice.toLocaleString('ko-KR')}원</span>
                  {SPOMAT_PRODUCT_CONTRACT.discountAmount.toLocaleString('ko-KR')}원 할인 적용
                </p>
              </>
            ) : (
              <p className="text-[28px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
                {SPOMAT_PRODUCT_CONTRACT.regularPrice.toLocaleString('ko-KR')}원
              </p>
            )}
          </div>

          <a
            href={PURCHASE_HREF}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-black text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            <ShoppingBag size={16} />
            {isPremiumMember ? '회원가로 구매하기' : 'SPOMAT 구매하기'}
          </a>

          {!isPremiumMember && (
            <p className="mt-3 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>
              프리미엄 구독 시 {SPOMAT_PRODUCT_CONTRACT.premiumPrice.toLocaleString('ko-KR')}원에 구매할 수 있습니다.
            </p>
          )}

          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--spm-br2)' }}>
            <a href={SPOMAT_BULK_INQUIRY_HREF} className="text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
              대량 구매 문의 →
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
