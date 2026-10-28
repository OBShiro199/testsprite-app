"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }].slice(-4));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[110] flex flex-col items-start gap-2 sm:right-auto"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast"
            className="qp-toast pointer-events-auto rounded-md bg-surface px-4 py-3 font-medium text-ink shadow-float"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
