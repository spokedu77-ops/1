import SpokeduHomeLanding from './components/home-landing';
import { HomeStructuredData } from './components/home-structured-data';
import { LandingPageRoot } from './components/landing-page-root';
import { homePage } from './data/home-page';
import { buildSpokeduMetadata } from './data/seo';
import { resolveHomeFieldRecordCards } from './lib/resolve-field-records';

export const metadata = buildSpokeduMetadata('home');
export const dynamic = 'force-dynamic';

export default async function SpokeduHomePage() {
  const fieldRecordCards = await resolveHomeFieldRecordCards(homePage.fieldRecords.cards);

  return (
    <LandingPageRoot heroMediaKey="homeHero">
      <HomeStructuredData />
      <SpokeduHomeLanding fieldRecordCards={fieldRecordCards} />
    </LandingPageRoot>
  );
}
