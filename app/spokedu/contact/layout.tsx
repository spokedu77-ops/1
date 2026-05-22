import type { ReactNode } from 'react';
import { ContactPageFooter } from './contact-footer';

export default function SpokeduContactLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ContactPageFooter />
    </>
  );
}
