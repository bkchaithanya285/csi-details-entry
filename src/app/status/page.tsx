"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, Clock, FileDown, AlertCircle, Loader2 } from "lucide-react";

interface ApplicantStatus {
  name: string;
  registrationNumber: string;
  status: "pending" | "approved" | "rejected";
  approvedRole?: string;
  referenceNumber?: string;
  id: string;
}

export default function StatusPage() {
  const [regNo, setRegNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicantStatus | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(`/api/status?regNo=${encodeURIComponent(regNo.trim().toUpperCase())}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("No application found for this registration number. Please check and try again.");
        } else {
          setError("Something went wrong. Please try again later.");
        }
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      {/* Background glows */}
      <div className="fixed top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#020617]/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="relative w-8 h-8 bg-white p-0.5 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="CSI Logo" className="object-contain w-full h-full" />
          </div>
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide block leading-none">CSI KARE</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Selection Status</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow pt-28 pb-20 px-4 max-w-xl mx-auto w-full flex flex-col justify-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 select-none"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-1 border border-white/10 shadow-xl mb-5 mx-auto overflow-hidden">
            <img src="/logo.jpg" alt="CSI Logo" className="object-contain w-full h-full" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Check Your <span className="text-blue-500">Selection Status</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Enter your registration number to check your CSI KARE Core Team selection status and download your appointment letter.
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-900/60 border border-white/8 rounded-2xl p-6 backdrop-blur-xl shadow-2xl"
        >
          <form onSubmit={handleCheck} className="flex flex-col gap-4">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Registration Number
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                placeholder="e.g. 2127CS0001"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/8 text-white placeholder-slate-600 text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 transition-all"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !regNo.trim()}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
              ) : (
                <><Search className="w-4 h-4" /> Check Status</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 flex items-start gap-3 bg-rose-950/30 border border-rose-500/20 rounded-2xl p-5 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 leading-relaxed">{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 space-y-4"
            >
              {/* Status Banner */}
              {result.status === "approved" ? (
                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-extrabold text-emerald-400 text-sm uppercase tracking-wider">Selected ✅</p>
                      <p className="text-slate-400 text-xs mt-0.5">Congratulations on your selection!</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 font-semibold">Name</span>
                      <span className="text-white font-bold">{result.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 font-semibold">Reg. No.</span>
                      <span className="text-white font-mono font-bold">{result.registrationNumber}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-slate-500 font-semibold">Appointed Role</span>
                      <span className="text-blue-400 font-extrabold">{result.approvedRole}</span>
                    </div>
                    {result.referenceNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Reference No.</span>
                        <span className="text-slate-300 font-mono">{result.referenceNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  <a
                    href={`/api/download-letter?id=${result.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-950/30 border border-blue-500/20"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Official Appointment Letter (PDF)
                  </a>
                </div>
              ) : (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-extrabold text-amber-400 text-sm uppercase tracking-wider">Under Review ⏳</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Hi <strong className="text-white">{result.name}</strong>, your application is currently being reviewed by our Faculty and Executive Board. Results will be announced soon. Stay tuned!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#020617] py-6 text-center text-[11px] text-slate-600 select-none">
        © {new Date().getFullYear()} CSI KARE Student Branch — Kalasalingam Academy of Research and Education
      </footer>
    </div>
  );
}
