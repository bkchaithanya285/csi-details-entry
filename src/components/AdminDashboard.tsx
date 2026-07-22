"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  ShieldAlert, 
  Trash2, 
  LogOut, 
  Loader2, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Send,
  Sparkles
} from "lucide-react";
import { getApplicants, deleteAllApplicants, Applicant } from "@/lib/db";
import { ROLE_LIMITS } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import ExportPanel from "./admin/ExportPanel";
import ApplicantTable from "./admin/ApplicantTable";

interface AdminDashboardProps {
  logout: () => Promise<void>;
  userEmail: string | null;
}

export default function AdminDashboard({ logout, userEmail }: AdminDashboardProps) {
  const { addToast } = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchApplicants = useCallback(async () => {
    try {
      const data = await getApplicants();
      setApplicants(data);
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
      addToast("Failed to fetch applicant database.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleClearAll = async () => {
    const confirmClear = window.confirm(
      "⚠️ WARNING: Are you absolutely sure you want to delete ALL applicant records?\nThis will permanently delete all entries in Firestore and cannot be undone!"
    );
    if (!confirmClear) return;

    setClearing(true);
    try {
      const res = await deleteAllApplicants();
      addToast(`Cleared ${res.count} records from database.`, "success");
      setSelectedIds([]);
      await fetchApplicants();
    } catch (error) {
      console.error("Clear error:", error);
      addToast("Failed to clear database.", "error");
    } finally {
      setClearing(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const counts = {
      total: applicants.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      mailSent: 0,
    };

    const deptDist: Record<string, number> = {};
    const yearDist: Record<string, number> = {};
    const roleDist: Record<string, number> = {};

    // Initialize all 18 roles to 0 in distribution
    Object.keys(ROLE_LIMITS).forEach(role => {
      roleDist[role] = 0;
    });

    applicants.forEach((app) => {
      if (app.status === "approved") {
        counts.approved++;
        counts.mailSent++; // approved users are emailed automatically
      } else if (app.status === "rejected") {
        counts.rejected++;
      } else {
        counts.pending++;
      }

      // Department distribution
      const d = app.department.toUpperCase();
      deptDist[d] = (deptDist[d] || 0) + 1;

      // Year distribution
      const y = app.year;
      yearDist[y] = (yearDist[y] || 0) + 1;

      // Priority 1 Role distribution
      const r = app.approvedRole || app.priority1;
      if (r) {
        roleDist[r] = (roleDist[r] || 0) + 1;
      }
    });

    return { counts, deptDist, yearDist, roleDist };
  }, [applicants]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wider">
            Loading CSI database registry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Top Header Card */}
      <div className="glass-panel p-6 border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              CSI KARE Admin Dashboard
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Logged in: <strong className="text-slate-200 font-bold">{userEmail || "Faculty Admin"}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Clear database */}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearing || applicants.length === 0}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete All Entries</span>
          </button>

          {/* Sign out */}
          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-slate-800 border border-white/5 hover:bg-white/5 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* STATS COUNT GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total applications */}
        <div className="glass-panel p-5 bg-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-blue-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total applications</span>
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats.counts.total}</h3>
        </div>

        {/* Pending */}
        <div className="glass-panel p-5 bg-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-amber-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending review</span>
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats.counts.pending}</h3>
        </div>

        {/* Approved */}
        <div className="glass-panel p-5 bg-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-emerald-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats.counts.approved}</h3>
        </div>

        {/* Rejected */}
        <div className="glass-panel p-5 bg-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-rose-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rejected</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats.counts.rejected}</h3>
        </div>

        {/* Mails sent */}
        <div className="glass-panel p-5 bg-slate-900/40 shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3 text-purple-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Orders emailed</span>
            <Send className="w-4 h-4" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats.counts.mailSent}</h3>
        </div>

      </div>

      {/* SEAT MATRIX PANEL (Vercel-style capacity manager) */}
      <div className="glass-panel p-6 bg-slate-900/40 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>CSI KARE Office Seat Matrix & Capacity Manager</span>
          </h4>
          <span className="text-[9px] text-slate-400 font-extrabold uppercase bg-slate-950/80 px-2.5 py-1 rounded-full border border-white/5">
            AY 2026-2027
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1.5">
          {Object.entries(ROLE_LIMITS).map(([role, limit]) => {
            const count = stats.roleDist[role] || 0;
            const isFilled = count >= limit;
            const isUnlimited = limit === Infinity;

            return (
              <div 
                key={role} 
                className={`bg-slate-950/30 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                  isFilled 
                    ? "border-rose-500/10 hover:border-rose-500/20" 
                    : "border-white/5 hover:border-blue-500/20"
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-white text-xs font-bold truncate max-w-[150px]" title={role}>
                    {role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                    isFilled 
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {isFilled ? "Filled" : "Available"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-2 border-t border-white/5">
                  <span>Registrants:</span>
                  <span className={isFilled ? "text-rose-400 font-bold" : "text-slate-200"}>
                    {count} / {isUnlimited ? "∞" : limit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ANALYTICS PANEL (SVG distribution bars for department and classroom) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Department distribution */}
        <div className="glass-panel p-6 bg-slate-900/40 shadow-lg space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span>Department Share</span>
          </h4>
          <div className="space-y-3.5 pt-2">
            {Object.keys(stats.deptDist).length > 0 ? (
              Object.entries(stats.deptDist).map(([dept, count]) => {
                const pct = ((count / stats.counts.total) * 100).toFixed(0);
                return (
                  <div key={dept} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">{dept}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950/60 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-xs italic">No data entries</p>
            )}
          </div>
        </div>

        {/* Classroom Section distribution */}
        <div className="glass-panel p-6 bg-slate-900/40 shadow-lg space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span>Classroom Sections Audit</span>
          </h4>
          <div className="space-y-3.5 pt-2">
            {Object.keys(stats.yearDist).length > 0 ? (
              Object.entries(stats.yearDist).map(([yr, count]) => {
                const pct = ((count / stats.counts.total) * 100).toFixed(0);
                return (
                  <div key={yr} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">{yr}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950/60 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-xs italic">No data entries</p>
            )}
          </div>
        </div>

      </div>

      {/* BULK DOWNLOAD / ACTIONS CENTER */}
      <ExportPanel 
        allApplicants={applicants} 
        filteredApplicants={filteredApplicants} 
        selectedIds={selectedIds}
        refreshData={fetchApplicants}
      />

      {/* APPLICANTS TABLE REGISTRY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-3 border-l-2 border-blue-500 select-none">
          <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
            Applications registry
          </h2>
          <span className="text-[10px] bg-slate-900 text-slate-400 border border-white/5 font-extrabold px-2.5 py-1 rounded-full uppercase">
            {filteredApplicants.length} records filtered
          </span>
        </div>

        <ApplicantTable 
          applicants={applicants}
          refreshData={fetchApplicants}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onFilteredChange={setFilteredApplicants}
        />
      </div>

    </div>
  );
}
