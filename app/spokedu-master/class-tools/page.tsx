'use client';

import { TrialGateWall } from '../components/ui/TrialGateWall';
import ClassToolsView from '../components/ui/ClassToolsView';

export default function ClassToolsPage() {
  return (
    <TrialGateWall feature="class-tools">
      <ClassToolsView />
    </TrialGateWall>
  );
}
