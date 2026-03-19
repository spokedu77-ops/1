import { getCenters } from './actions/centers';
import CentersClient from './CentersClient';

export default async function CentersPage() {
  const initialCenters = await getCenters({ status: 'active' }).catch(() => []);
  return <CentersClient initialCenters={initialCenters} />;
}
