import { AboutLanding } from '../components/about-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('about');

export default function SpokeduAboutPage() {
  return <AboutLanding />;
}
