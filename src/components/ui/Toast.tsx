"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; title: string; message?: string; kind: ToastKind }
interface ToastContextValue { toast: (title: string, message?: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((title: string, message?: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, title, message, kind }]);
    window.setTimeout(() => remove(id), 4400);
  }, [remove]);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite" aria-atomic="false">
    <AnimatePresence initial={false}>{items.map((item) => {
      const Icon = item.kind === "success" ? CheckCircle2 : item.kind === "error" ? CircleAlert : Info;
      return <motion.div key={item.id} role="status" className={`toast toast-${item.kind}`} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 32 }}>
        <Icon size={18} /><div className="toast-copy"><strong>{item.title}</strong>{item.message && <span>{item.message}</span>}</div><button className="icon-button toast-close" onClick={() => remove(item.id)} aria-label="Dismiss notification"><X size={15} /></button>
      </motion.div>;
    })}</AnimatePresence>
  </div></ToastContext.Provider>;
}
