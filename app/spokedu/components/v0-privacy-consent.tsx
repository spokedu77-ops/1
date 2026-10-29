'use client';

import Link from 'next/link';
import { koreanLineBreak } from '../lib/ui-classes';

const PRIVACY_HREF = '/spokedu-lab/privacy';

export function V0PrivacyConsent({
  checked,
  onChange,
  id = 'v0-privacy-consent',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700 ${koreanLineBreak}`}
    >
      <input
        id={id}
        name="privacy_consent"
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span>
        <span className="font-bold text-slate-900">[필수]</span> 개인정보 수집·이용에 동의합니다. (상담 연락,
        아동 연령·수업 조건 확인 목적){' '}
        <Link href={PRIVACY_HREF} className="font-semibold text-blue-600 underline-offset-2 hover:underline">
          개인정보처리방침
        </Link>
      </span>
    </label>
  );
}
