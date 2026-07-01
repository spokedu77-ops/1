'use client';

import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react';
import SpokeduContactForm from './contact-form';
import { ContactFallback } from './contact-fallback';
import { contactPageContent } from './contact-page-data';

function ContactFormLoading() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:p-6">
      문의 폼을 불러오는 중입니다.
    </div>
  );
}

type ErrorBoundaryState = { hasError: boolean };

class ContactFormErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[spokedu/contact] form load failed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ContactFallback
          title={contactPageContent.formLoadFailure.title}
          description={contactPageContent.formLoadFailure.description}
          onRetry={() => {
            this.setState({ hasError: false });
            window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

export default function ContactFormShell() {
  return (
    <ContactFormErrorBoundary>
      <Suspense fallback={<ContactFormLoading />}>
        <SpokeduContactForm />
      </Suspense>
    </ContactFormErrorBoundary>
  );
}
