import { RecordsLanding } from '../components/records-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { recordsPage } from '../data/records-page';
import { buildSpokeduMetadata } from '../data/seo';
import { resolveFieldRecordsWithThumbnails } from '../lib/resolve-field-records';

export const metadata = buildSpokeduMetadata('records');
export const revalidate = 86400;

export default function SpokeduRecordsPage() {
  return (
    <LandingPageRoot heroMediaKey={recordsPage.hero.preloadMediaKey}>
      <RecordsLanding fieldRecords={resolveFieldRecordsWithThumbnails(recordsPage.fieldRecords)} />
    </LandingPageRoot>
  );
}
