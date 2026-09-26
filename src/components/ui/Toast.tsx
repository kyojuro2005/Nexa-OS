import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AddToastOptions {
  type?: ToastType;
  title?: string;
  message?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  addToast: (opts: AddToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-tertiary-fixed text-on-tertiary-fixed",
  error: "bg-error-container text-on-error-container",
  info: "bg-primary-fixed text-on-primary-fixed",
  warning: "bg-secondary-fixed text-on-secondary-fixed",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const addToast = useCallback((opts: AddToastOptions) => {
    const { type = "info", title, message } = opts;
    const text = title && message ? `${title} — ${message}` : title || message || "";
    toast(text, type);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-md pointer-events-auto text-body-sm font-medium ${COLORS[t.type]} transition-all animate-fade-in`}
            style={{ animation: "slideIn 0.2s ease-out" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
