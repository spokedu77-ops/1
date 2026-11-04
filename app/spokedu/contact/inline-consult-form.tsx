import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import type { InquiryType } from './inquiry-types';

export function InlineConsultForm({ type }: { type: InquiryType }) {
  return (
    <section id="inquiry" className="w-full py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Suspense fallback={<p>상담 폼을 불러오는 중입니다.</p>}>
          <SpokeduContactForm inlineType={type} />
        </Suspense>
      </div>
    </section>
  );
}
