'use client';

import { useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';

type ManualCredentialInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'autoComplete'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * 브라우저에 저장된 다른 계정은 칸에 남기지 않는다.
 * 키보드 입력이나 붙여넣기 전에 들어온 값은 비운다.
 */
export function ManualCredentialInput({
  value,
  onValueChange,
  onKeyDown,
  onPaste,
  ...rest
}: ManualCredentialInputProps) {
  const typed = useRef(false);

  return (
    <input
      {...rest}
      value={value}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
      onKeyDown={(event) => {
        if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Process' || event.key.length === 1) {
          typed.current = true;
        }
        onKeyDown?.(event);
      }}
      onPaste={(event) => {
        typed.current = true;
        onPaste?.(event);
      }}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        if (!typed.current) {
          onValueChange('');
          return;
        }
        onValueChange(event.target.value);
      }}
    />
  );
}

/** 비밀번호 관리자가 채울 자리. 화면의 실제 입력칸과 분리한다. */
export function SavedCredentialDecoy() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <input tabIndex={-1} type="text" name="username" autoComplete="username" defaultValue="" readOnly />
      <input tabIndex={-1} type="password" name="password" autoComplete="current-password" defaultValue="" readOnly />
    </div>
  );
}
