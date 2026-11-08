import { Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import type { InquiryType } from './inquiry-types';

export function InlineConsultForm({ type, educationProgramSelection = false }: { type: InquiryType; educationProgramSelection?: boolean }) {
  return (
    <section id="inquiry" className={educationProgramSelection && type === 'dispatch' ? 'web-education-inquiry w-full' : 'w-full py-20 lg:py-28'}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Suspense fallback={<p>상담 폼을 불러오는 중입니다.</p>}>
          <SpokeduContactForm inlineType={type} educationProgramSelection={educationProgramSelection} />
        </Suspense>
      </div>
    </section>
  );
}
