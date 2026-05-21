import { MonthlyLanding } from '../components/monthly-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('monthly');

export default function SpokeduMonthlyPage() {
  return <MonthlyLanding />;
}
