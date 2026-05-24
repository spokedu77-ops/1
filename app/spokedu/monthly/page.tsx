import { MonthlyLanding } from '../components/monthly-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { monthlyPage } from '../data/monthly-page';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('monthly');

export default function SpokeduMonthlyPage() {
  return (
    <LandingPageRoot heroMediaKey={monthlyPage.hero.mediaKey}>
      <MonthlyLanding />
    </LandingPageRoot>
  );
}
