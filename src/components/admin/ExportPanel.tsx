"use client";

import { useState } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  Database, 
  FileCheck,
  CheckSquare,
  MailCheck,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/context/ToastContext";
import { Applicant, approveApplicantWithRole } from "@/lib/db";

interface ExportPanelProps {
  allApplicants: Applicant[];
  filteredApplicants: Applicant[];
  selectedIds: string[];
  refreshData?: () => Promise<void>;
}

export default function ExportPanel({ allApplicants, filteredApplicants, selectedIds, refreshData }: ExportPanelProps) {
  const { addToast } = useToast();
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const [approving, setApproving] = useState(false);
  const [resending, setResending] = useState(false);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN") + " " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getExportData = () => {
    const list = scope === "all" ? allApplicants : filteredApplicants;
    return list.map((app) => ({
      Name: app.name,
      "Registration Number": app.registrationNumber,
      Year: app.year,
      Department: app.department,
      Section: app.section,
      Email: app.email,
      "Phone Number": app.phone,
      "First Priority": app.priority1,
      "Second Priority": app.priority2,
      "Third Priority": app.priority3,
      "Approved Role": app.approvedRole || "None",
      "Reference Number": app.referenceNumber || "None",
      Status: app.status.toUpperCase(),
      "Applied Date": formatDate(app.timestamp)
    }));
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      addToast("No applications found to export.", "warning");
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CSI_Applicants");

      // Auto-size columns for premium aesthetics
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(...data.map(row => (row as any)[key]?.toString().length || 0), key.length) + 3
      }));
      ws["!cols"] = colWidths;

      const fileName = `CSI_KARE_Applicants_${scope === "all" ? "All" : "Filtered"}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addToast("Excel sheet generated and downloaded!", "success");
    } catch (error) {
      console.error("Excel export error:", error);
      addToast("Failed to export Excel report.", "error");
    }
  };

  const handleExportCsv = () => {
    const data = getExportData();
    if (data.length === 0) {
      addToast("No applications found to export.", "warning");
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","), // header row
        ...data.map(row => 
          headers.map(fieldName => {
            const value = (row as any)[fieldName]?.toString() || "";
            // Escape double quotes and wrap in quotes if there's a comma
            const escaped = value.replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') 
              ? `"${escaped}"` 
              : escaped;
          }).join(",")
        )
      ];

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `CSI_KARE_Applicants_${scope === "all" ? "All" : "Filtered"}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast("CSV data exported successfully!", "success");
    } catch (error) {
      console.error("CSV export error:", error);
      addToast("Failed to export CSV report.", "error");
    }
  };

  const handleBulkMergePdf = () => {
    if (selectedIds.length === 0) {
      addToast("Please select at least one approved applicant using the checkboxes.", "warning");
      return;
    }
    
    const idsQuery = selectedIds.join(",");
    window.open(`/api/download-merged-letters?ids=${idsQuery}`, "_blank");
    addToast("Generating combined appointment letters PDF...", "info");
  };

  const handleBulkApproveAndEmail = async () => {
    if (selectedIds.length === 0) {
      addToast("Please select applicants using the checkboxes.", "warning");
      return;
    }

    const pendingSelected = allApplicants.filter(
      (app) => selectedIds.includes(app.id) && app.status === "pending"
    );

    if (pendingSelected.length === 0) {
      addToast("No pending applicants are currently selected for approval.", "warning");
      return;
    }

    const confirmAction = window.confirm(
      `Confirm Action:\nAre you sure you want to approve and send selection emails to all ${pendingSelected.length} selected pending candidates?`
    );
    if (!confirmAction) return;

    setApproving(true);
    addToast(`Processing bulk approvals and emails for ${pendingSelected.length} candidates...`, "info");
    
    try {
      // Execute approvals in parallel
      await Promise.all(
        pendingSelected.map((app) => 
          approveApplicantWithRole(app.id, app.priority1 || "Branch Coordinator")
        )
      );

      addToast(`Successfully approved and emailed ${pendingSelected.length} applicants!`, "success");
      
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      console.error("Bulk approval error:", err);
      addToast("An error occurred during bulk approvals. Please check logs/SMTP configurations.", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleResendAll = async () => {
    const approvedAll = allApplicants.filter((app) => app.status === "approved");
    if (approvedAll.length === 0) {
      addToast("No approved applicants found to resend emails to.", "warning");
      return;
    }

    const confirmAction = window.confirm(
      `Resend appointment emails to ALL ${approvedAll.length} approved applicants?\nThis will resend the email to every approved candidate.`
    );
    if (!confirmAction) return;

    setResending(true);
    addToast(`Resending emails to ${approvedAll.length} approved applicants...`, "info");

    let success = 0;
    let failed = 0;

    await Promise.allSettled(
      approvedAll.map(async (app) => {
        try {
          const res = await fetch("/api/resend-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: app.id }),
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      })
    );

    if (failed === 0) {
      addToast(`✅ All ${success} emails resent successfully!`, "success");
    } else {
      addToast(`⚠️ ${success} sent, ${failed} failed. Check SMTP settings.`, "warning");
    }

    setResending(false);
  };

  return (
    <div className="glass-panel p-5 border-white/5 flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-xl shadow-lg">
      
      {/* Description */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-white font-extrabold text-sm tracking-wide">
            Export & Data Controls
          </h4>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage spreadsheets or perform batch approvals and downloads.
          </p>
        </div>

        {/* Scope toggler */}
        <div className="flex bg-slate-950/80 border border-white/5 rounded-xl p-1 shrink-0 ml-0 sm:ml-4 select-none">
          <button
            type="button"
            onClick={() => setScope("filtered")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              scope === "filtered"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Filtered ({filteredApplicants.length})
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              scope === "all"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({allApplicants.length})
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end select-none">
        
        {/* Bulk Approve & Email Selected */}
        <button
          onClick={handleBulkApproveAndEmail}
          disabled={selectedIds.length === 0 || approving}
          className={`flex-grow sm:flex-grow-0 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border cursor-pointer ${
            selectedIds.length > 0 && !approving
              ? "bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white border-blue-500/25 shadow-md shadow-indigo-950/20"
              : "bg-slate-900/10 border-white/5 text-slate-500 cursor-not-allowed opacity-50"
          }`}
          title="Approve selected pending applicants and send selection emails in one click"
        >
          {approving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>Approve & Email ({selectedIds.length})</span>
            </>
          )}
        </button>

        {/* Resend All Emails */}
        <button
          onClick={handleResendAll}
          disabled={resending || approving}
          className={`flex-grow sm:flex-grow-0 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border cursor-pointer ${
            !resending && !approving
              ? "bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white border-violet-500/25 shadow-md shadow-purple-950/20"
              : "bg-slate-900/10 border-white/5 text-slate-500 cursor-not-allowed opacity-50"
          }`}
          title="Resend appointment emails to all approved applicants"
        >
          {resending ? (
            <><Loader2 className="w-4 h-4 animate-spin text-violet-400" /><span>Resending...</span></>
          ) : (
            <><MailCheck className="w-4 h-4 text-violet-400" /><span>Resend All Emails</span></>
          )}
        </button>

        {/* Bulk Merge PDF */}
        <button
          onClick={handleBulkMergePdf}
          disabled={selectedIds.length === 0}
          className={`flex-grow sm:flex-grow-0 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border cursor-pointer ${
            selectedIds.length > 0
              ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-500/20 shadow-md shadow-amber-950/20"
              : "bg-slate-900/10 border-white/5 text-slate-500 cursor-not-allowed opacity-50"
          }`}
          title="Download A4 letters of selected approved applicants merged into one PDF"
        >
          <FileCheck className="w-4 h-4 text-amber-400" />
          <span>Merge letters ({selectedIds.length})</span>
        </button>

        {/* CSV */}
        <button
          onClick={handleExportCsv}
          className="flex-grow sm:flex-grow-0 py-2.5 px-4 rounded-xl bg-slate-900 border border-white/8 hover:bg-white/5 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Export CSV</span>
        </button>

        {/* Excel */}
        <button
          onClick={handleExportExcel}
          className="flex-grow sm:flex-grow-0 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-emerald-500/25 shadow-md shadow-emerald-950/20 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>

      </div>

    </div>
  );
}
