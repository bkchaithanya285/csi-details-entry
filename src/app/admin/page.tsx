"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AdminDashboard from "@/components/AdminDashboard";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, isAdmin, login, logout } = useAuth();
  const { addToast } = useToast();
  
  // Login Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedFields, setFocusedFields] = useState<Record<string, boolean>>({});

  const handleFocus = (field: string) => {
    setFocusedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: string, value: string) => {
    if (!value) {
      setFocusedFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      addToast("Email and password are required.", "warning");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      addToast("Signed in as Admin successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Authentication failed. Check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return <AdminDashboard logout={logout} userEmail={user ? user.email : "Faculty Admin"} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] py-12 px-4 sm:px-6 lg:px-8 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full glass-panel p-8 bg-slate-900/40 backdrop-blur-xl border-white/5 shadow-2xl relative overflow-hidden"
      >
        {/* Glowing border glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4 bg-blue-500/10 text-blue-500 p-3 rounded-2xl border border-blue-500/20 shadow-md flex items-center justify-center overflow-hidden animate-float">
            <ShieldCheck className="w-8 h-8" />
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20 blur-sm"></div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">Admin Portal</h2>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Enter authorized faculty or administrator credentials to manage appointment orders.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-6">
          
          {/* Email input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Admin Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin username"
                className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3.5 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Access Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3.5 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Alert note */}
          <div className="text-[10px] text-slate-500 leading-normal text-justify bg-slate-950/40 border border-white/5 p-3.5 rounded-xl">
            * Note: For local development testing, you can use <strong>admin</strong> with password <strong>Tony@285</strong> to login as administrator.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Access Control Panel</span>
            )}
          </button>

        </form>
      </motion.div>
    </div>
  );
}
