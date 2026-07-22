"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true); // Default to dark mode for premium look

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem("csiTheme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const darkActive = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    
    setIsDark(darkActive);
    
    if (darkActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("csiTheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("csiTheme", "light");
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-slate-900/10 dark:bg-white/5 border border-slate-900/10 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-900/20 dark:hover:bg-white/10 transition-colors shadow-sm cursor-pointer shrink-0"
      aria-label="Toggle Theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 0 : 1,
            rotate: isDark ? 90 : 0,
            opacity: isDark ? 0 : 1
          }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="absolute"
        >
          <Sun className="w-5 h-5 text-amber-600" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 1 : 0,
            rotate: isDark ? 0 : -90,
            opacity: isDark ? 1 : 0
          }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="absolute"
        >
          <Moon className="w-5 h-5 text-indigo-400" />
        </motion.div>
      </div>
    </motion.button>
  );
}
