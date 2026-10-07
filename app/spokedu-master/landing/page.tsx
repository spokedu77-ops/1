import { permanentRedirect } from 'next/navigation';

export default function LegacyMasterLandingPage() {
  permanentRedirect('/spokedu-lab');
}
