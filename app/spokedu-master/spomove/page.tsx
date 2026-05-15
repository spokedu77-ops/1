'use client';

import SpomoveHubView from './SpomoveHubView';
import { TrialGateWall } from '../components/ui/TrialGateWall';

export default function SpokeduMasterSpomovePage() {
  return (
    <TrialGateWall feature="spomove">
      <SpomoveHubView />
    </TrialGateWall>
  );
}
