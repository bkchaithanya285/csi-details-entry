"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Hash, 
  BookOpen, 
  Layers, 
  Mail, 
  Phone, 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  Shield
} from "lucide-react";
import { checkRegistrationExists, checkEmailExists, submitApplicant, getRoleCounts } from "@/lib/db";
import { ROLE_LIMITS } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import confetti from "canvas-confetti";

const ROLE_OPTIONS = [
  "President",
  "Secretary",
  "Treasurer",
  "Chairperson",
  "Vice Chairperson",
  "Event Coordinator Team Lead",
  "Technical Team Lead",
  "Web Development Team Lead",
  "Research Team Lead",
  "Content Team Lead",
  "Social Media Team Lead",
  "Event Coordinator Team",
  "Technical Team",
  "Web Development Team",
  "Research Team",
  "Content Team",
  "Social Media Team"
];

export default function ApplicationForm() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [year] = useState("III Year"); // Internally defaulted
  const [department] = useState("CSE"); // Default and Read Only
  const [section, setSection] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Appointed Role Selector State
  const [assignedRole, setAssignedRole] = useState(ROLE_OPTIONS[0]);

  // Seat Counts from Database
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

  const academicYearStr = "2026-2027";
  const [appliedRegNo, setAppliedRegNo] = useState("");
  const [appliedName, setAppliedName] = useState("");

  // Load database seat usage on mount
  useEffect(() => {
    async function loadRoleUsage() {
      try {
        const counts = await getRoleCounts();
        setRoleCounts(counts);
        
        // Find first available role that is not filled
        const firstAvailable = ROLE_OPTIONS.find(role => {
          const count = counts[role] || 0;
          const limit = ROLE_LIMITS[role] || Infinity;
          return count < limit;
        });
        if (firstAvailable) {
          setAssignedRole(firstAvailable);
        }
      } catch (err) {
        console.error("Error loading role limits:", err);
      }
    }
    loadRoleUsage();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedReg = localStorage.getItem("csiAppliedRegNo");
      const savedName = localStorage.getItem("csiAppliedName");
      if (savedReg && savedName) {
        setAppliedRegNo(savedReg);
        setAppliedName(savedName);
        setIsSuccess(true);
      }
    }
  }, []);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#1e3a8a", "#d97706", "#3b82f6"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#1e3a8a", "#d97706", "#3b82f6"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast("Full Name is required.", "warning");
      return;
    }
    if (!regNo.trim() || regNo.trim().length < 8) {
      addToast("Please enter a valid Registration Number.", "warning");
      return;
    }
    if (!section.trim()) {
      addToast("Section code is required.", "warning");
      return;
    }
    
    // College Email Validator Check
    if (!email.trim() || !email.endsWith("@klu.ac.in")) {
      addToast("Please enter your official college email address (ending with @klu.ac.in).", "error");
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      addToast("Please enter a valid 10-digit mobile number.", "warning");
      return;
    }

    // Verify limit again before final submission to prevent race conditions
    try {
      const freshCounts = await getRoleCounts();
      const currentCount = freshCounts[assignedRole] || 0;
      const limit = ROLE_LIMITS[assignedRole] || Infinity;
      if (currentCount >= limit) {
        addToast(`The position for ${assignedRole} has just been filled. Please choose another role.`, "error");
        setRoleCounts(freshCounts);
        return;
      }
    } catch (err) {
      console.error("Pre-submission limit validation error:", err);
    }

    setLoading(true);
    try {
      const regExists = await checkRegistrationExists(regNo);
      if (regExists) {
        addToast("A record with this registration number already exists.", "error");
        setLoading(false);
        return;
      }

      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        addToast("A record with this email address already exists.", "error");
        setLoading(false);
        return;
      }

      await submitApplicant({
        name,
        registrationNumber: regNo,
        year,
        department,
        section,
        email,
        phone,
        priority1: assignedRole,
        priority2: assignedRole,
        priority3: assignedRole,
      });

      localStorage.setItem("csiAppliedRegNo", regNo.trim().toUpperCase());
      localStorage.setItem("csiAppliedName", name.trim());
      setAppliedRegNo(regNo.trim().toUpperCase());
      setAppliedName(name.trim());

      addToast("Information submitted successfully!", "success");
      setIsSuccess(true);
      triggerConfetti();

    } catch (err: any) {
      console.error(err);
      // Show the actual server error (e.g. position filled) if available
      const msg = err?.message || "Failed to submit information. Please try again.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const getOptionLabel = (role: string) => {
    const count = roleCounts[role] || 0;
    const limit = ROLE_LIMITS[role] || Infinity;

    if (count >= limit) {
      return `${role} (Position Filled)`;
    }
    return role;
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-3xl p-8 sm:p-10 text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-md">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-wide">
            Registration Completed! 🎉
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Thank you, <strong className="text-white font-bold">{appliedName}</strong>. Your information registry details have been recorded in the CSI KARE database.
          </p>

          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 mb-8 text-left space-y-3 max-w-sm mx-auto">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest border-b border-white/5 pb-2 mb-1 flex justify-between">
              <span>Registration Ticket</span>
              <span className="text-emerald-400 font-bold">• Active</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Reg Number</span>
              <span className="text-amber-500 font-mono font-bold tracking-wider">{appliedRegNo}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Department</span>
              <span className="text-white font-bold">CSE</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Active Term</span>
              <span className="text-slate-300 font-medium">AY {academicYearStr}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Status</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">Pending Review</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => {
                localStorage.removeItem("csiAppliedRegNo");
                localStorage.removeItem("csiAppliedName");
                setIsSuccess(false);
                setName("");
                setRegNo("");
                setSection("");
                setEmail("");
                setPhone("");
              }}
              className="text-xs text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              Submit Another Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmitForm} className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-350">
        
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="space-y-6">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-white mb-1">CSI KARE Member Information Directory</h4>
            <p className="text-slate-400 text-xs">Fill out all student details and assigned position below to submit your registration entry.</p>
          </div>

          {/* Grid 1: Name and Registration Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Full Name (Block Letters Only)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="ENTER FULL NAME"
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-700 uppercase"
                />
              </div>
            </div>

            {/* Registration Number Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Registration Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 9921004123"
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all uppercase placeholder:text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Grid 2: Department and Section Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Department - Read Only */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                Department
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  readOnly
                  value="CSE"
                  className="w-full bg-slate-900/10 border border-white/5 text-slate-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Section Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Section Code
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={section}
                  onChange={(e) => setSection(e.target.value.toUpperCase())}
                  placeholder="e.g. 24S10"
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all uppercase placeholder:text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Grid 3: Email and WhatsApp Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Email Address */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                College Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="e.g. student@klu.ac.in"
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                WhatsApp Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Grid 4: Single Role Selector Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Select Appointed Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full bg-[#020c1b] border border-white/8 focus:border-blue-500 rounded-xl px-4 py-3.5 pl-10 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                {ROLE_OPTIONS.map((role) => {
                  const count = roleCounts[role] || 0;
                  const limit = ROLE_LIMITS[role] || Infinity;
                  const isFilled = count >= limit;
                  return (
                    <option key={role} value={role} disabled={isFilled}>
                      {getOptionLabel(role)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Submission Button */}
          <div className="border-t border-white/5 pt-6 select-none">
            {(() => {
              const selectedCount = roleCounts[assignedRole] || 0;
              const selectedLimit = ROLE_LIMITS[assignedRole] || Infinity;
              const isSelectedRoleFilled = selectedCount >= selectedLimit;
              return (
                <>
                  {isSelectedRoleFilled && (
                    <p className="text-red-400 text-xs font-bold text-center mb-3 animate-pulse">
                      ⚠ The position for &quot;{assignedRole}&quot; is already fully appointed. Please select another role.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || isSelectedRoleFilled}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Submitting Entry...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Submit Details</span>
                      </>
                    )}
                  </button>
                </>
              );
            })()}
          </div>
        </div>

      </form>
    </div>
  );
}
