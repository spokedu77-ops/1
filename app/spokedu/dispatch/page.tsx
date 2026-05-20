import DispatchLanding from '../components/dispatch-landing';
import { buildSpokeduMetadata } from '../data/seo';

export const metadata = buildSpokeduMetadata('dispatch');

export default function SpokeduDispatchPage() {
  return <DispatchLanding />;
}
