'use client';

type ToastProps = {
  message: string;
  visible: boolean;
};

export default function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`pl-toast ${visible ? 'show' : ''}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
