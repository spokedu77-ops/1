import type { Metadata } from 'next';
import { Suspense } from 'react';
import SpokeduProClient from './SpokeduProClient';

export const metadata: Metadata = {
  title: 'SPOKEDU PRO Subscription',
  description: 'Accessible Smart PE subscriber dashboard, lesson tools, and premium content for SPOKEDU PRO.',
};

export default function SpokeduProPage() {
  return (
    <Suspense fallback={null}>
      <SpokeduProClient isEditMode={false} />
    </Suspense>
  );
}
