import { RecordsLanding } from '../components/records-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('records');

export default function SpokeduRecordsPage() {
  return <RecordsLanding />;
}
