'use client';

import { useState, useEffect } from 'react';
import { upsertFinanceTerms } from '../actions/finance';
import type { CenterFinanceTerms } from '@/app/lib/centers/types';
import { Save } from 'lucide-react';

interface FinanceTabProps {
  centerId: string;
  terms: CenterFinanceTerms | null;
  onSaved: () => void;
}

export function FinanceTab({ centerId, terms, onSaved }: FinanceTabProps) {
  const [unitPrice, setUnitPrice] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [docChecklist, setDocChecklist] = useState<string[]>([]);
  const [specialTerms, setSpecialTerms] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (terms) {
      setUnitPrice(terms.unit_price != null ? String(terms.unit_price) : '');
      setPaymentDay(terms.payment_day ?? '');
      setInvoiceRequired(terms.invoice_required ?? false);
      setDocChecklist(terms.doc_checklist ?? []);
      setSpecialTerms(terms.special_terms ?? '');
    } else {
      setUnitPrice('');
      setPaymentDay('');
      setInvoiceRequired(false);
      setDocChecklist([]);
      setSpecialTerms('');
    }
  }, [terms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await upsertFinanceTerms(centerId, {
        unit_price: unitPrice ? parseInt(unitPrice, 10) : null,
        payment_day: paymentDay.trim() || null,
        invoice_required: invoiceRequired,
        doc_checklist: docChecklist,
        special_terms: specialTerms.trim() || null,
      });
      if (result.error) setError(result.error);
      else onSaved();
    } finally {
      setSaving(false);
    }
  };

  const addChecklistItem = () => {
    setDocChecklist((c) => [...c, '']);
  };

  const updateChecklistItem = (index: number, value: string) => {
    setDocChecklist((c) => c.map((v, i) => (i === index ? value : v)));
  };

  const removeChecklistItem = (index: number) => {
    setDocChecklist((c) => c.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">단가 (원)</label>
        <input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">결제일 (예: 매월 25일)</label>
        <input
          type="text"
          value={paymentDay}
          onChange={(e) => setPaymentDay(e.target.value)}
          placeholder="매월 25일"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="invoice_required"
          checked={invoiceRequired}
          onChange={(e) => setInvoiceRequired(e.target.checked)}
          className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500/20"
        />
        <label htmlFor="invoice_required" className="text-sm text-slate-700">
          세금계산서 필요
        </label>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">서류 체크리스트</label>
          <button
            type="button"
            onClick={addChecklistItem}
            className="text-sm text-indigo-600 hover:underline"
          >
            + 항목 추가
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {docChecklist.map((item, i) => (
            <li key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateChecklistItem(i, e.target.value)}
                placeholder="서류 항목"
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeChecklistItem(i)}
                className="rounded text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">특별 약정</label>
        <textarea
          value={specialTerms}
          onChange={(e) => setSpecialTerms(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}
