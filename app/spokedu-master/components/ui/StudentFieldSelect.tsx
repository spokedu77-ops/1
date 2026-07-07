'use client';

import { useMemo, useState } from 'react';

const CUSTOM_OPTION_VALUE = '__custom__';

type StudentFieldSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel?: string;
  customOptionLabel?: string;
  placeholder?: string;
  testId?: string;
  name?: string;
};

export function StudentFieldSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = '선택 안 함',
  customOptionLabel = '직접 입력',
  placeholder = '직접 입력',
  testId,
  name,
}: StudentFieldSelectProps) {
  const optionSet = useMemo(() => new Set(options), [options]);
  const trimmedValue = value.trim();
  const usesCustomValue = Boolean(trimmedValue) && !optionSet.has(trimmedValue);
  const [customOpen, setCustomOpen] = useState(usesCustomValue);

  const selectValue = customOpen || usesCustomValue
    ? CUSTOM_OPTION_VALUE
    : trimmedValue;

  const handleSelectChange = (next: string) => {
    if (next === CUSTOM_OPTION_VALUE) {
      setCustomOpen(true);
      if (optionSet.has(trimmedValue)) onChange('');
      return;
    }
    setCustomOpen(false);
    onChange(next);
  };

  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</span>
      <select
        data-testid={testId}
        name={name}
        value={selectValue}
        onChange={(event) => handleSelectChange(event.target.value)}
        className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
        style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value={CUSTOM_OPTION_VALUE}>{customOptionLabel}</option>
      </select>
      {customOpen || usesCustomValue ? (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="mt-2 h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none"
          style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
        />
      ) : null}
    </label>
  );
}
