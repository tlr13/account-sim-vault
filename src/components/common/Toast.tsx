import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ToastMessage {
  text: string;
  tone?: 'default' | 'error';
}

interface ToastProps {
  toast: ToastMessage | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div
      className={`toast-banner${toast.tone === 'error' ? ' error' : ''}`}
      role="status"
      aria-live="polite"
    >
      {toast.tone === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      <span>{toast.text}</span>
    </div>
  );
}
