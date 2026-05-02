'use client';

import EducatorBetaForm from '../components/EducatorBetaForm';

export default function MoveReportEducatorBetaPage() {
  return (
    <main className="mr-page">
      <div className="mr-page-inner mr-content-max" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <EducatorBetaForm source="move_report_educator_beta_page" showBackLink />
      </div>
    </main>
  );
}
