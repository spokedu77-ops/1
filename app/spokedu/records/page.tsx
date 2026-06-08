import { RecordsLanding } from '../components/records-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { recordsPage } from '../data/records-page';
import { buildSpokeduMetadata } from '../data/seo';
import { resolveFieldRecordsWithThumbnails } from '../lib/resolve-field-records';

export const metadata = buildSpokeduMetadata('records');
export const dynamic = 'force-dynamic';

export default async function SpokeduRecordsPage() {
  const fieldRecords = await resolveFieldRecordsWithThumbnails(recordsPage.fieldRecords);

  return (
    <LandingPageRoot heroMediaKey={recordsPage.hero.preloadMediaKey}>
      <RecordsLanding fieldRecords={fieldRecords} />
    </LandingPageRoot>
  );
}
