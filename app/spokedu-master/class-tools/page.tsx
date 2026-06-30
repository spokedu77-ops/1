'use client';

import { SubscriptionGateWall } from '../components/ui/SubscriptionGateWall';
import ClassToolsView from '../components/ui/ClassToolsView';

export default function ClassToolsPage() {
  return (
    <SubscriptionGateWall feature="class-tools">
      <ClassToolsView />
    </SubscriptionGateWall>
  );
}
