import { getCenters } from './actions/centers';
import CentersClient from './CentersClient';

export default async function CentersListPage() {
  const initialCenters = await getCenters({ status: 'active' });
  return <CentersClient initialCenters={initialCenters} />;
}
