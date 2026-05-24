import { RecordsLanding } from '../components/records-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { recordsPage } from '../data/records-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('records');

export default function SpokeduRecordsPage() {
  return (
    <LandingPageRoot heroMediaKey={recordsPage.hero.mediaKey}>
      <RecordsLanding />
    </LandingPageRoot>
  );
}
