"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "error":
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-emerald-950/80 border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-950/20";
      case "error":
        return "bg-rose-950/80 border-rose-500/30 text-rose-100 shadow-lg shadow-rose-950/20";
      case "warning":
        return "bg-amber-950/80 border-amber-500/30 text-amber-100 shadow-lg shadow-amber-950/20";
      case "info":
      default:
        return "bg-slate-900/90 border-slate-700/50 text-slate-100 shadow-lg shadow-slate-900/30";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md ${getStyles(
        toast.type
      )}`}
    >
      {getIcon(toast.type)}
      <div className="flex-grow text-sm font-medium leading-normal">{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-white/40 hover:text-white transition-colors shrink-0 p-0.5 rounded-md hover:bg-white/5"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
