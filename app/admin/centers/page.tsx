import { getCenters } from './actions/centers';
import CentersHubClient from './CentersHubClient';

export default async function CentersPage() {
  const initialCenters = await getCenters({ status: 'active' }).catch(() => []);
  return <CentersHubClient initialCenters={initialCenters} />;
}
