import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', action?: Toast['action']) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — top-right, vertical only */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const colors: Record<ToastType, string> = {
    info:    'bg-card border-primary/30 text-foreground',
    success: 'bg-card border-success/40 text-foreground',
    warning: 'bg-card border-amber-400/40 text-foreground',
    error:   'bg-card border-destructive/40 text-foreground',
  };
  const accents: Record<ToastType, string> = {
    info:    'bg-primary',
    success: 'bg-success',
    warning: 'bg-amber-400',
    error:   'bg-destructive',
  };

  return (
    <div
      className={`pointer-events-auto relative flex items-start gap-3 rounded-xl border shadow-xl p-4 animate-fade-in overflow-hidden ${colors[toast.type]}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${accents[toast.type]}`} />
      <div className="flex-1 ml-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => { toast.action!.onClick(); onDismiss(); }}
            className="mt-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-lg leading-none">
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
