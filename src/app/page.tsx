"use client";

import { motion } from "framer-motion";
import { Sparkles, FileText, CheckSquare } from "lucide-react";
import ApplicationForm from "@/components/ApplicationForm";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col bg-[#020617] text-slate-100 selection:bg-blue-500/30 selection:text-white transition-colors duration-300">
      
      {/* Sleek subtle background glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Modern Minimal Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#020617]/70 backdrop-blur-md border-b border-white/5 select-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 bg-white p-0.5 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="object-contain w-full h-full" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide block leading-none">CSI KARE</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Member Directory</span>
            </div>
          </div>
          
          <nav className="flex items-center gap-5">
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full flex flex-col justify-center">
        
        {/* Hero Section */}
        <section className="text-center mb-10 select-none">
          {/* logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-block mb-5"
          >
            <div className="relative w-16 h-16 mx-auto bg-white p-1 rounded-2xl border border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="CSI Logo" className="object-contain w-full h-full" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3"
          >
            CSI KARE <span className="text-blue-500">Student Member Registry</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed"
          >
            Official details collection and record verification form for student branch coordinators. Please supply accurate contact and role credentials to compile your member profile.
          </motion.p>
        </section>

        {/* Dynamic Registry Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full"
        >
          <ApplicationForm />
        </motion.div>

      </main>

      {/* Minimalistic Footer */}
      <footer className="border-t border-white/5 bg-[#020617] py-8 select-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-500 font-medium">
          <div>
            <h5 className="font-bold text-slate-400">CSI KARE Student Branch</h5>
            <p className="mt-0.5">Kalasalingam Academy of Research and Education</p>
          </div>
          <div>
            &copy; {new Date().getFullYear()} CSI KARE. All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
