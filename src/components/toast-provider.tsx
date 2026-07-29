"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string) => void) | null>(null);

let nextId = 0;
const DISPLAY_MS = 3000;
const EXIT_MS = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<number>>(new Set());

  const dismiss = useCallback((id: number) => {
    setLeavingIds((current) => new Set(current).add(id));
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      setLeavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, EXIT_MS);
  }, []);

  const showToast = useCallback(
    (message: string) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message }]);
      setTimeout(() => dismiss(id), DISPLAY_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Mobile: top, sliding down, so it doesn't sit over the bottom nav bar. Desktop/tablet: bottom-right, unchanged. */}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 md:inset-x-auto md:top-auto md:right-4 md:bottom-4">
        {toasts.map((toast) => {
          const leaving = leavingIds.has(toast.id);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg transition-all duration-300 animate-toast-in md:animate-none md:opacity-100 md:translate-y-0 md:transition-none ${
                leaving ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-white/70 hover:text-white"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return showToast;
}
