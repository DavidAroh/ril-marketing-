"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; description?: string };

const ToastContext = React.createContext<{ toast: (t: Omit<Toast, "id">) => void }>({
  toast: () => {},
});

export const useToast = () => React.useContext(ToastContext);

let nextId = 1;

const VISIBLE_MS = 4000;
const EXIT_MS = 170;

function ToastItem({ item, onDone }: { item: Toast; onDone: (id: number) => void }) {
  const [mounted, setMounted] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  // Mounted-flag pattern: interruptible transition, works everywhere.
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    const show = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(() => onDone(item.id), EXIT_MS);
    }, VISIBLE_MS);
    return () => window.clearTimeout(show);
  }, [item.id, onDone]);

  return (
    <div
      role="status"
      data-mounted={mounted}
      data-leaving={leaving}
      className={cn("toast-item rounded-md border bg-background p-4 shadow-lg")}
    >
      <p className="text-sm font-medium">{item.title}</p>
      {item.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDone={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
