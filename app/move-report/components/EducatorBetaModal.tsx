'use client';

import { useEffect } from 'react';
import EducatorBetaForm from './EducatorBetaForm';

export interface EducatorBetaModalProps {
  open: boolean;
  onClose: () => void;
  shareKey?: string | null;
}

export default function EducatorBetaModal({ open, onClose, shareKey }: EducatorBetaModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="mr-educator-modal-root" role="dialog" aria-modal="true" aria-labelledby="mr-educator-modal-title">
      <button type="button" className="mr-educator-modal-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="mr-educator-modal-panel">
        <div className="mr-educator-modal-header">
          <h2 id="mr-educator-modal-title" className="mr-educator-modal-heading">
            교육자 베타 신청
          </h2>
          <button type="button" className="mr-educator-modal-close" onClick={onClose} aria-label="닫기">
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
        <div className="mr-educator-modal-scroll">
          <EducatorBetaForm
            source="move_report_result_cta"
            shareKey={shareKey}
            onRequestClose={onClose}
            embeddedInModal
          />
        </div>
      </div>
    </div>
  );
}
