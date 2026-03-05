'use client';

import { useCallback, useRef, useState } from 'react';

export function useToast(defaultDuration = 3000) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (msg: string, duration = defaultDuration) => {
      setMessage(msg);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, duration);
    },
    [defaultDuration]
  );

  return { message, visible, show };
}
