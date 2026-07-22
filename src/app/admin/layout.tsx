"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wider">
            Verifying Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-100">
      {/* Admin header */}
      <header className="glass-navbar fixed top-0 inset-x-0 z-50 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 bg-white p-1 rounded-xl shadow-md border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="object-contain w-full h-full" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white tracking-wide block leading-none">CSI KARE</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">Control Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Portal Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {children}
      </main>
    </div>
  );
}
