import { FinalCTA } from './final-cta';
import { FieldRecords } from './field-records';
import { HomeHero } from './home-hero';
import { MasterStage } from './master-stage';
import { ServiceGateway } from './service-gateway';
import { SpokeduMethod } from './spokedu-method';
import { SpomoveStage } from './spomove-stage';
import styles from './home-web.module.css';

export function HomeWebLanding() {
  return (
    <div className={styles.root}>
      <HomeHero />
      <ServiceGateway />
      <SpokeduMethod />
      <FieldRecords />
      <SpomoveStage />
      <MasterStage />
      <FinalCTA />
    </div>
  );
}
