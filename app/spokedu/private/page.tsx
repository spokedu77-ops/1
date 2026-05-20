import PrivateLanding from '../components/private-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('private');

export default function SpokeduPrivatePage() {
  return <PrivateLanding />;
}
