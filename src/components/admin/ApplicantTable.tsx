"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Trash2, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Edit,
  Mail,
  MailCheck,
  FileText,
  Save,
  X
} from "lucide-react";
import { updateApplicantStatus, deleteApplicant, approveApplicantWithRole, updateApplicant, Applicant } from "@/lib/db";
import { useToast } from "@/context/ToastContext";

const DEPT_OPTIONS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"];
const YEAR_OPTIONS = ["II Year", "III Year", "IV Year"];
const STATUS_OPTIONS = ["pending", "approved"];
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

interface ApplicantTableProps {
  applicants: Applicant[];
  refreshData: () => Promise<void>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onFilteredChange: (filtered: Applicant[]) => void;
}

export default function ApplicantTable({
  applicants,
  refreshData,
  selectedIds,
  setSelectedIds,
  onFilteredChange,
}: ApplicantTableProps) {
  const { addToast } = useToast();

  // Search & Filters State
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Table States
  const [sortBy, setSortBy] = useState<keyof Applicant>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Edit Form state
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [editName, setEditName] = useState("");
  const [editRegNo, setEditRegNo] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  // Apply Filters, Sort, and Search
  const processedApplicants = useMemo(() => {
    let result = [...applicants];

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.registrationNumber.toLowerCase().includes(q) ||
          a.phone.includes(q)
      );
    }

    // 2. Department filter
    if (deptFilter) {
      result = result.filter((a) => a.department === deptFilter);
    }

    // 3. Year filter
    if (yearFilter) {
      result = result.filter((a) => a.year === yearFilter);
    }

    // 4. Role filter
    if (roleFilter) {
      result = result.filter((a) => a.approvedRole === roleFilter || a.priority1 === roleFilter);
    }

    // 5. Status filter
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    // 6. Sort
    result.sort((a, b) => {
      let aVal = a[sortBy] ?? "";
      let bVal = b[sortBy] ?? "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Notify parent of updates
    onFilteredChange(result);

    return result;
  }, [applicants, search, deptFilter, yearFilter, roleFilter, statusFilter, sortBy, sortOrder, onFilteredChange]);

  // Paginated records
  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedApplicants.slice(start, start + itemsPerPage);
  }, [processedApplicants, currentPage]);

  const totalPages = Math.ceil(processedApplicants.length / itemsPerPage);

  // Checkbox interactions
  const handleSelectAll = () => {
    const pageIds = paginatedApplicants.map(a => a.id);
    const allPageSelected = pageIds.every(id => selectedIds.includes(id));

    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...pageIds]);
        return Array.from(unique);
      });
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Trigger individual appointment email dispatch (Send Once)
  const handleSendAppointmentEmail = async (app: Applicant) => {
    if (app.status === "approved") {
      addToast("Applicant has already been emailed. Duplicate emails skipped.", "warning");
      return;
    }

    setActionLoading(true);
    try {
      const assigned = app.priority1 || "Branch Coordinator";
      const res = await approveApplicantWithRole(app.id, assigned);
      addToast(`Appointment email sent to ${app.name}! REF NO: ${res.referenceNumber}`, "success");
      await refreshData();
      
      if (selectedApplicant && selectedApplicant.id === app.id) {
        setSelectedApplicant(prev => prev ? { 
          ...prev, 
          status: "approved", 
          approvedRole: assigned, 
          referenceNumber: res.referenceNumber 
        } : null);
      }
    } catch (error) {
      console.error("Individual email dispatch error:", error);
      addToast("Failed to dispatch appointment email. Check SMTP settings.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Resend appointment email to already-approved applicants
  const handleResendEmail = async (app: Applicant) => {
    if (app.status !== "approved") return;
    const confirmSend = window.confirm(`Resend appointment email to ${app.name} (${app.email})?`);
    if (!confirmSend) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast(`Appointment email resent to ${app.name}!`, "success");
    } catch (err) {
      console.error("Resend email error:", err);
      addToast("Failed to resend email. Check SMTP settings.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Launch Edit Mode with applicant details pre-loaded
  const handleStartEdit = (app: Applicant) => {
    setEditingApplicant(app);
    setEditName(app.name);
    setEditRegNo(app.registrationNumber);
    setEditYear(app.year);
    setEditDept(app.department);
    setEditSection(app.section);
    setEditEmail(app.email);
    setEditPhone(app.phone);
    setEditRole(app.approvedRole || app.priority1 || ROLE_OPTIONS[0]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApplicant) return;

    if (!editName.trim() || !editRegNo.trim() || !editSection.trim() || !editEmail.trim()) {
      addToast("Please fill in all required fields.", "warning");
      return;
    }

    setActionLoading(true);
    try {
      await updateApplicant(editingApplicant.id, {
        name: editName.trim(),
        registrationNumber: editRegNo.trim().toUpperCase(),
        year: editYear,
        department: editDept,
        section: editSection.trim().toUpperCase(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim(),
        priority1: editRole,
        priority2: editRole,
        priority3: editRole,
        // Also update approvedRole if they were already approved
        ...(editingApplicant.status === "approved" ? { approvedRole: editRole } : {})
      });

      addToast("Details updated successfully in database!", "success");
      setEditingApplicant(null);
      await refreshData();

      // Update active selected applicant modal details
      if (selectedApplicant && selectedApplicant.id === editingApplicant.id) {
        setSelectedApplicant(prev => prev ? {
          ...prev,
          name: editName.trim(),
          registrationNumber: editRegNo.trim().toUpperCase(),
          year: editYear,
          department: editDept,
          section: editSection.trim().toUpperCase(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim(),
          priority1: editRole,
          ...(editingApplicant.status === "approved" ? { approvedRole: editRole } : {})
        } : null);
      }

    } catch (err) {
      console.error("Save edits error:", err);
      addToast("Failed to save changes. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    setDeleteConfirmId(null);
    if (selectedApplicant && selectedApplicant.id === id) {
      setSelectedApplicant(null);
    }
    
    setActionLoading(true);
    try {
      await deleteApplicant(id);
      addToast("Applicant deleted successfully.", "success");
      setSelectedIds(prev => prev.filter(rowId => rowId !== id));
      await refreshData();
    } catch (error) {
      console.error("Delete error:", error);
      addToast("Failed to delete applicant.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWhatsApp = (app: Applicant) => {
    const role = app.approvedRole || app.priority1 || "Core Team Member";
    const letterUrl = `${window.location.origin}/api/download-letter?id=${app.id}`;

    let message = "";

    if (app.status === "approved") {
      message =
`🎉 Congratulations *${app.name}*!

You've been selected as *${role}* in *CSI KARE Student Branch* for 2026–2027! 🏆

📄 Download your Appointment Letter:
🔗 ${letterUrl}

Welcome to the team! 🚀
— *CSI KARE*`;
    } else {
      message =
`👋 Hi *${app.name}*!

Your application to *CSI KARE Core Team 2026–2027* has been received ✅

We'll notify you once results are out. Stay tuned! 📩
— *CSI KARE*`;
    }

    const link = `https://wa.me/91${app.phone}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank");
    addToast("Opening WhatsApp with pre-typed message...", "info");
  };

  const toggleSort = (field: keyof Applicant) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN") + " " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const isAllSelected = paginatedApplicants.length > 0 && paginatedApplicants.every(a => selectedIds.includes(a.id));

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Bar */}
      <div className="glass-panel p-5 space-y-4 bg-slate-900/40 backdrop-blur-xl">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Name, Registration Number, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold"
          />
        </div>

        {/* Filter select grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none">
              <Filter className="w-3 h-3 text-blue-500" /> Dept
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/5 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Departments</option>
              {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none">
              <Filter className="w-3 h-3 text-blue-500" /> Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/5 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Years</option>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none">
              <Filter className="w-3 h-3 text-blue-500" /> Priority Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/5 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 select-none">
              <Filter className="w-3 h-3 text-blue-500" /> Email Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-white/5 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s === "approved" ? "EMAILED" : "NOT EMAILED"}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Main Data Table */}
      <div className="glass-panel overflow-hidden bg-slate-900/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-[10px] font-extrabold tracking-widest uppercase bg-white/2 select-none">
                <th className="py-4 px-4 text-center w-12">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:text-white" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-4 px-4 cursor-pointer hover:text-white" onClick={() => toggleSort("registrationNumber")}>
                  <div className="flex items-center gap-1.5">
                    <span>Reg Number</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-4 px-4">Classroom</th>
                <th className="py-4 px-4">Assigned Role</th>
                <th className="py-4 px-4 text-center">Email Status</th>
                <th className="py-4 px-6 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("timestamp")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Applied Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApplicants.map((app) => {
                const isSelected = selectedIds.includes(app.id);
                return (
                  <tr 
                    key={app.id}
                    className={`border-b border-white/5 hover:bg-white/2 transition-colors ${
                      isSelected ? "bg-blue-500/2" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectRow(app.id)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="py-4 px-6 font-bold text-white tracking-wide">
                      {app.name}
                    </td>

                    {/* Reg No */}
                    <td className="py-4 px-4 font-mono tracking-wider text-slate-400 font-bold">
                      {app.registrationNumber}
                    </td>

                    {/* Classroom */}
                    <td className="py-4 px-4 text-slate-300 font-semibold">
                      {app.year} &bull; {app.department} &bull; Sec {app.section}
                    </td>

                    {/* Role Priority / Appointed */}
                    <td className="py-4 px-4">
                      {app.status === "approved" ? (
                        <span className="text-blue-400 font-extrabold text-xs bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 rounded-full">
                          {app.approvedRole || app.priority1 || "Branch Coordinator"}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{app.priority1}</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        app.status === "approved"
                          ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                          : "bg-amber-950/40 border-amber-500/20 text-amber-400"
                      }`}>
                        {app.status === "approved" ? "Emailed" : "Not Emailed"}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-6 text-right font-medium text-slate-500">
                      {formatDate(app.timestamp)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* View details */}
                        <button
                          type="button"
                          onClick={() => setSelectedApplicant(app)}
                          className="p-2 rounded-lg bg-white/5 border border-white/8 text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit details */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(app)}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-all border border-blue-500/20 cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp greeting */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(app)}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all border border-emerald-500/20 cursor-pointer"
                          title="Send WhatsApp Greeting"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Email appointment order button / Resend for approved */}
                        {app.status !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleSendAppointmentEmail(app)}
                            disabled={actionLoading}
                            className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all border border-indigo-500/20 cursor-pointer disabled:opacity-50"
                            title="Send Appointment Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* PDF Download */}
                            <a
                              href={`/api/download-letter?id=${app.id}`}
                              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition-all border border-amber-500/20 cursor-pointer inline-flex items-center justify-center"
                              title="Download PDF Letter"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                            {/* Resend Email */}
                            <button
                              type="button"
                              onClick={() => handleResendEmail(app)}
                              disabled={actionLoading}
                              className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all border border-indigo-500/20 cursor-pointer disabled:opacity-50"
                              title="Resend Appointment Email"
                            >
                              <MailCheck className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Delete row */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(app.id)}
                          className="p-2 rounded-lg bg-slate-950/20 border border-white/5 text-rose-500/80 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
                          title="Delete Candidate Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {processedApplicants.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-semibold select-none">
                    No applications matches your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="border-t border-white/5 py-4 px-6 flex items-center justify-between bg-slate-950/20 select-none">
            <span className="text-slate-400 text-xs">
              Showing page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({processedApplicants.length} entries)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-white/8 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-white/8 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl border-white/8 bg-[#020c1b] shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white">Applicant details: {selectedApplicant.name}</h3>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-slate-400 hover:text-white text-xl p-1.5 font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Registration Number</span>
                <span className="text-white font-mono font-bold">{selectedApplicant.registrationNumber}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Year of Study</span>
                <span className="text-white font-bold">{selectedApplicant.year}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Department</span>
                <span className="text-white font-bold">{selectedApplicant.department}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Section</span>
                <span className="text-white font-bold">{selectedApplicant.section}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl col-span-2">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Email Address</span>
                <span className="text-white font-semibold block truncate">{selectedApplicant.email}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl col-span-2">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Phone number</span>
                <span className="text-white font-semibold block">{selectedApplicant.phone}</span>
              </div>
              <div className="bg-white/2 border border-white/5 p-3.5 rounded-xl col-span-2">
                <span className="text-slate-500 font-extrabold text-[10px] block mb-1 uppercase tracking-wider">Selected Appointed Position</span>
                <span className="text-white font-bold block">{selectedApplicant.approvedRole || selectedApplicant.priority1 || "Branch Coordinator"}</span>
              </div>

              {selectedApplicant.status === "approved" && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl col-span-2 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 font-extrabold">Emailed Role:</span>
                    <strong className="text-white font-extrabold uppercase">{selectedApplicant.approvedRole}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Order Reference:</span>
                    <strong className="text-slate-300 font-mono">{selectedApplicant.referenceNumber}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 pt-4 border-t border-white/5">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                selectedApplicant.status === "approved"
                  ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-950/40 border-amber-500/20 text-amber-400"
              }`}>
                {selectedApplicant.status === "approved" ? "Emailed" : "Not Emailed"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSendWhatsApp(selectedApplicant)}
                  className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                {selectedApplicant.status === "approved" && (
                  <a
                    href={`/api/download-letter?id=${selectedApplicant.id}`}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-500/25"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedApplicant(null);
                    setDeleteConfirmId(selectedApplicant.id);
                  }}
                  className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 hover:bg-rose-700 hover:text-white transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {editingApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleSaveEdit} className="glass-panel w-full max-w-xl border-white/8 bg-[#020c1b] shadow-2xl p-6 sm:p-8 relative max-h-[95vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Applicant Details</h3>
                <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Update registry fields for {editingApplicant.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApplicant(null)}
                className="text-slate-400 hover:text-white text-xl p-1.5 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.toUpperCase())}
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none uppercase"
                />
              </div>

              {/* Registration Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Registration Number</label>
                <input
                  type="text"
                  required
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value.toUpperCase())}
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none uppercase"
                />
              </div>

              {/* Year level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Year level</label>
                <select
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="w-full bg-[#020c1b] border border-white/8 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-[#020c1b] border border-white/8 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Section Code</label>
                <input
                  type="text"
                  required
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value.toUpperCase())}
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none uppercase"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">College Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value.toLowerCase())}
                  className="w-full bg-[#020813]/60 border border-white/8 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                />
              </div>

              {/* Appointed Role */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Appointed Position / Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-[#020c1b] border border-white/8 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

            </div>

            <div className="flex gap-3 pt-4 border-t border-white/5 justify-end select-none">
              <button
                type="button"
                onClick={() => setEditingApplicant(null)}
                className="py-2.5 px-5 rounded-xl border border-white/8 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-blue-500/25 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="glass-panel w-full max-w-sm border-rose-500/30 bg-[#020c1b] p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4 animate-bounce" />
            <h4 className="text-white font-extrabold text-base mb-2">Delete Applicant Record?</h4>
            <p className="text-slate-400 text-xs mb-6">Are you sure you want to permanently delete this application? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-grow py-2.5 rounded-lg border border-white/8 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteApplicant(deleteConfirmId)}
                className="flex-grow py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all border border-rose-500/25 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
