import SpokeduHomeLanding from './components/home-landing';
import { buildSpokeduMetadata } from './data/seo';

export const metadata = buildSpokeduMetadata('home');

export default function SpokeduHomePage() {
  return <SpokeduHomeLanding />;
}
