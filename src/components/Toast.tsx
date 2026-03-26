"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== "loading") {
      setTimeout(() => dismiss(id), 5000);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-500 animate-in slide-in-from-right-8 fade-in ${
              t.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              t.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" :
              t.type === "loading" ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
              "bg-zinc-900/80 border-white/10 text-white"
            }`}
          >
            <div className="flex-shrink-0">
              {t.type === "success" && <CheckCircle className="h-5 w-5" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5" />}
              {t.type === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
              {t.type === "info" && <Info className="h-5 w-5" />}
            </div>
            <p className="text-sm font-medium flex-grow leading-tight">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
