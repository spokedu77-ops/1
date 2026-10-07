import type { ReturnTypeOfLandingModel } from './types';
import { LandingAuthControls } from './LandingAuthControls';
import styles from '../landing.module.css';

export function MasterLocalNav({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <nav
      className={styles.masterLocalNav}
      aria-label="SPOKEDU LAB 메뉴"
      data-spokedu-master-local-nav="true"
    >
      <div className={styles.masterLocalBrand}>
        <span>SPOKEDU</span>
        <strong>LAB</strong>
      </div>
      <div className={styles.masterLocalLinks}>
        <a href="#workflow">서비스</a>
        <a href="#library">사용 방법</a>
        <a href="#spomove">SPOMOVE</a>
        <a href="#plans">요금</a>
        <a href="#faq">FAQ</a>
        <LandingAuthControls
          loginHref={product.handoff.loginHref}
          freeStartHref={product.handoff.freeStartHref}
        />
      </div>
    </nav>
  );
}

/** @deprecated Global footer absorbed into SpokeduSiteShell SiteFooter */
export function LandingFooter(_props: { product: ReturnTypeOfLandingModel }) {
  void _props;
  return null;
}

/** @deprecated Use MasterLocalNav — not a global header */
export function LandingHeader(props: { product: ReturnTypeOfLandingModel }) {
  return <MasterLocalNav product={props.product} />;
}
