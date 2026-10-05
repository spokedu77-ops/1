import { TrackedLink } from '@/app/spokedu/components/home/tracked-link';
import type { ReturnTypeOfLandingModel } from './types';
import styles from '../landing.module.css';

export function MasterLocalNav({ product }: { product: ReturnTypeOfLandingModel }) {
  return (
    <nav
      className={styles.masterLocalNav}
      aria-label="SPOKEDU MASTER 메뉴"
      data-spokedu-master-local-nav="true"
    >
      <div className={styles.masterLocalBrand}>
        <span>SPOKEDU</span>
        <strong>MASTER</strong>
      </div>
      <div className={styles.masterLocalLinks}>
        <a href="#workflow">서비스</a>
        <a href="#library">사용 방법</a>
        <a href="#spomove">SPOMOVE</a>
        <a href="#plans">요금</a>
        <a href="#faq">FAQ</a>
        <TrackedLink href={product.handoff.loginHref} trackLabel="master-commercial-header-login" commercialRoute="curriculum" ctaIntentId="login">
          로그인
        </TrackedLink>
        <TrackedLink
          href={product.handoff.freeStartHref}
          trackLabel="master-commercial-header-free"
          commercialRoute="curriculum"
          ctaIntentId="free_start"
          className="spm-btn-primary"
        >
          Free로 시작하기
        </TrackedLink>
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
