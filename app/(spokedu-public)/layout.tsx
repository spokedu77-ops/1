import type { ReactNode } from 'react';
import {
  SpokeduMarketingLayout,
  spokeduMarketingMetadata,
} from '../spokedu/components/spokedu-marketing-layout';

export const metadata = spokeduMarketingMetadata;

export default function SpokeduPublicLayout({ children }: { children: ReactNode }) {
  return <SpokeduMarketingLayout>{children}</SpokeduMarketingLayout>;
}
