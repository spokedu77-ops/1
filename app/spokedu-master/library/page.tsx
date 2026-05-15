'use client';

import LibraryView from './LibraryView';
import { TrialGateWall } from '../components/ui/TrialGateWall';

export default function SpokeduMasterLibraryPage() {
  return (
    <TrialGateWall feature="library">
      <LibraryView />
    </TrialGateWall>
  );
}
