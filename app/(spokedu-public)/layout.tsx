import type { ReactNode } from 'react';
import { SpokeduPublicLayoutGate } from '../spokedu/stitch/c0/SpokeduPublicLayoutGate';
import { spokeduMarketingMetadata } from '../spokedu/components/spokedu-marketing-layout';

export const metadata = spokeduMarketingMetadata;

export default function SpokeduPublicLayout({ children }: { children: ReactNode }) {
  return <SpokeduPublicLayoutGate>{children}</SpokeduPublicLayoutGate>;
}
