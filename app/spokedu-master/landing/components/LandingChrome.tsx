import Link from 'next/link';
import type { ReturnTypeOfLandingModel } from './types';
import { LandingNavigation } from './LandingNavigation';
import styles from '../landing.module.css';

export function MasterLocalNav({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <LandingNavigation
      loginHref={product.handoff.loginHref}
      freeStartHref={product.handoff.freeStartHref}
    />
  );
}

export function LandingFooter({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <footer id="footer" className={styles.footer} data-spokedu-lab-footer="true">
      <div className={styles.footerInner}>
        <div className={styles.footerLead}>
          <Link href="/spokedu-lab" className={styles.footerBrand}>
            <strong>SPOKEDU LAB</strong>
            <span>by SPOKEDU</span>
          </Link>
          <div className={styles.footerLinks}>
            <Link href="/">SPOKEDU 홈페이지</Link>
            <Link href="/spokedu-lab/terms">MASTER 이용약관</Link>
            <Link href="/spokedu-lab/privacy">개인정보처리방침</Link>
          </div>
        </div>
        <div className={styles.businessBlock}>
          <h2>사업자 정보</h2>
          <dl>
            <div><dt>상호</dt><dd>{product.business.businessName}</dd></div>
            <div><dt>대표자</dt><dd>{product.business.representativeName}</dd></div>
            <div><dt>사업자등록번호</dt><dd>{product.business.businessRegistrationNumber}</dd></div>
            <div><dt>통신판매업</dt><dd>{product.business.mailOrderStatus}</dd></div>
            <div><dt>주소</dt><dd>{product.business.businessAddress}</dd></div>
            <div><dt>연락처</dt><dd><a href={product.customerServiceTelHref}>{product.business.customerServicePhone}</a> · <a href={`mailto:${product.business.customerServiceEmail}`}>{product.business.customerServiceEmail}</a></dd></div>
          </dl>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} SPOKEDU. All rights reserved.</p>
      </div>
    </footer>
  );
}

/** @deprecated Use MasterLocalNav — not a global header */
export function LandingHeader(props: { product: ReturnTypeOfLandingModel }) {
  return <MasterLocalNav product={props.product} />;
}
