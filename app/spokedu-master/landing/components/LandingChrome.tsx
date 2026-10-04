import { ArrowUpRight } from 'lucide-react';
import { TrackedLink } from '@/app/spokedu/components/home/tracked-link';
import { LandingLoggedInBanner } from '../LandingLoggedInBanner';
import type { ReturnTypeOfLandingModel } from './types';
import styles from '../landing.module.css';

export function LandingHeader({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <><LandingLoggedInBanner /><header className={styles.header}>
      <TrackedLink href="/subscription" trackLabel="master-commercial-brand" className={styles.brand}>
        <span>SPOKEDU</span><strong>MASTER</strong>
      </TrackedLink>
      <nav className={styles.headerNav} aria-label="SPOKEDU MASTER 주요 메뉴">
        <a href="#workflow">서비스</a><a href="#library">사용 방법</a><a href="#spomove">SPOMOVE</a><a href="#plans">요금</a><a href="#faq">FAQ</a>
        <TrackedLink href={product.handoff.loginHref} trackLabel="master-commercial-header-login" commercialRoute="curriculum" ctaIntentId="login">로그인</TrackedLink>
        <TrackedLink href={product.handoff.freeStartHref} trackLabel="master-commercial-header-free" commercialRoute="curriculum" ctaIntentId="free_start" className="spm-btn-primary">Free로 시작하기</TrackedLink>
      </nav>
    </header></>
  );
}

export function LandingFooter({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLead}>
          <div className={styles.brand}><span>SPOKEDU</span><strong>MASTER</strong></div>
          <p>유아·초등 체육수업을 준비하고 운영하는 교사와 강사를 위한 서비스입니다.</p>
          <a href={product.centerInquiryHref} className={styles.textLink}>센터·기관 이용 문의 <ArrowUpRight size={16} aria-hidden /></a>
        </div>
        <div className={styles.businessBlock}>
          <h2>사업자 정보</h2>
          <dl>
            <div><dt>상호</dt><dd>{product.business.businessName}</dd></div>
            <div><dt>대표자</dt><dd>{product.business.representativeName}</dd></div>
            <div><dt>사업자등록번호</dt><dd>{product.business.businessRegistrationNumber}</dd></div>
            <div><dt>통신판매업</dt><dd>{product.business.mailOrderStatus}</dd></div>
            <div><dt>사업장 주소</dt><dd>{product.business.businessAddress}</dd></div>
            <div><dt>대표 연락처</dt><dd><a href={product.customerServiceTelHref}>{product.business.customerServicePhone}</a></dd></div>
            <div><dt>고객센터 이메일</dt><dd><a href={product.customerServiceHref}>{product.business.customerServiceEmail}</a></dd></div>
          </dl>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <div><TrackedLink href="/spokedu-master/terms" trackLabel="master-commercial-terms">이용약관</TrackedLink><TrackedLink href="/spokedu-master/privacy" trackLabel="master-commercial-privacy">개인정보처리방침</TrackedLink></div>
        <p>Lite와 프리미엄은 월 자동결제입니다. 언제든 해지를 예약할 수 있고, 결제된 이용 기간 종료일까지 사용할 수 있습니다.</p>
      </div>
    </footer>
  );
}
