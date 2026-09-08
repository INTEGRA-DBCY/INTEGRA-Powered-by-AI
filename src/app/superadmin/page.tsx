"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Shield, Cpu, School, Settings, LogOut, CheckCircle2, 
  AlertTriangle, Key, Search, PlusCircle, ArrowRight, Edit3, Trash, 
  Activity, Layers, UserPlus, UserCheck, ShieldCheck, Mail, Phone, Lock, Sparkles, UserCog
} from "lucide-react";
import { mockDB, User as DBUser, Symposium, College, SystemSettings, ActivityLog } from "@/lib/mock-db";
import { firebaseService } from "@/lib/firebase-service";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [symposiums, setSymposiums] = useState<Symposium[]>([]);
  const [activeSymposium, setActiveSymposium] = useState<Symposium | null>(null);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTabState] = useState<"editions" | "staff" | "colleges" | "security" | "logs">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("int_superadmin_active_tab") as any;
        if (["editions", "staff", "colleges", "security", "logs"].includes(saved)) return saved;
      } catch {}
    }
    return "editions";
  });

  const setActiveTab = (tab: "editions" | "staff" | "colleges" | "security" | "logs") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("int_superadmin_active_tab", tab);
        localStorage.removeItem("int_superadmin_active_tab");
      } catch {}
    }
  };

  // Edition Modal State
  const [showEditionModal, setShowEditionModal] = useState(false);
  const [editionFormData, setEditionFormData] = useState<Symposium>({
    id: "integra-2027",
    name: "INTEGRA",
    year: "2027",
    tagline: "Inter-Collegiate Technical Symposium",
    theme: "POWERED BY AI",
    symposiumDate: "11 – 09 – 2027",
    venue: "Don Bosco College, Yelagiri Hills",
    regFee: 150,
    maxParticipants: 500,
    maxEventsPerParticipant: 3,
    registrationOpen: true,
    status: "upcoming",
    venues: [],
    scheduleSlots: [],
    contactEmail: "integra@donbosco.ac.in",
    contactPhone: "+91 98765 43210",
    resultsPublished: false
  });

  // Staff Search & Filter State
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [passwordToast, setPasswordToast] = useState("");

  // Staff Password Reset Modal State
  const [selectedStaffUser, setSelectedStaffUser] = useState<DBUser | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState("");

  // Create Staff Modal State
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [createStaffForm, setCreateStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as DBUser["role"],
    department: "Computer Science",
    phone: "+91 90000 00000"
  });

  // Edit Staff Modal State
  const [editingStaffUser, setEditingStaffUser] = useState<DBUser | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as DBUser["role"],
    department: "",
    phone: ""
  });

  // College Manager State
  const [collegeName, setCollegeName] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);

  // System Settings Form
  const [sysSettingsForm, setSysSettingsForm] = useState<SystemSettings>({
    id: "sys-settings",
    eventTitle: "INTEGRA",
    eventYear: "2026",
    eventDateText: "September 11, 2026",
    countdownTarget: "2026-09-11T09:00:00",
    organizerDept: "PG & Research Department of Computer Science",
    hostCollege: "Don Bosco College (Co-Ed)",
    hostLocation: "Yelagiri Hills",
    tagline: "INTER-COLLEGE TECHNICAL SYMPOSIUM",
    feedbackEnabled: false,
    scoreboardEnabled: true,
    maxEventsSelection: 3,
    contactEmail: "integra@donbosco.ac.in",
    contactPhone: "+91 98765 43210"
  });

  // Emergency Purge Modal
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState("");

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || curr.role !== "super_admin") {
      router.push("/login");
      return;
    }
    setCurrentUser(curr);
    loadData(true);
    // Real-time Cloud Sync
    mockDB.syncFromCloud().then(() => {
      loadData(false);
    });
  }, []);

  const initialSuperSettingsLoadedRef = useRef(false);

  const loadData = (forceSettingsReload: boolean = false) => {
    const syms = mockDB.getSymposiums();
    setSymposiums(syms);
    const active = mockDB.getActiveSymposium();
    setActiveSymposium(active);
    setUsers(mockDB.getAllUsersRaw());
    setColleges(mockDB.getColleges());
    setActivityLogs(mockDB.getActivityLogs());
    if (!initialSuperSettingsLoadedRef.current || forceSettingsReload) {
      const sys = mockDB.getSettings();
      if (sys) {
        setSysSettingsForm(sys);
      }
      initialSuperSettingsLoadedRef.current = true;
    }
  };

  const handleSwitchEdition = async (id: string) => {
    mockDB.setActiveSymposiumId(id);
    loadData(true);
  };

  const handleSaveEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editionFormData.id.trim()) {
      alert("Please provide a unique Edition ID (e.g. integra-2027)");
      return;
    }
    try {
      const existing = symposiums.find(s => s.id === editionFormData.id);
      if (existing) {
        mockDB.updateSymposium(editionFormData);
      } else {
        mockDB.createSymposium(editionFormData);
      }
      setShowEditionModal(false);
      await mockDB.syncFromCloud(true);
    loadData();
      alert(`✓ Symposium Edition '${editionFormData.name} ${editionFormData.year}' saved successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to save symposium edition.");
    }
  };

  const handleDeleteEdition = async (id: string, name: string) => {
    if (symposiums.length <= 1) {
      alert("⚠️ Cannot delete the only existing symposium edition. Please create another edition first before removing this one.");
      return;
    }
    if (!confirm(`🚨 Are you sure you want to PERMANENTLY delete the symposium edition '${name}'?\n\nThis will remove the edition from Cloud Firestore and all devices.`)) {
      return;
    }
    try {
      mockDB.deleteSymposium(id, currentUser?.name || "Super Admin");
      setShowEditionModal(false);
      await mockDB.syncFromCloud(true);
    loadData();
      alert(`✓ Symposium edition '${name}' deleted successfully.`);
    } catch (e: any) {
      alert(e.message || "Failed to delete symposium edition.");
    }
  };

  // Staff CRUD Handlers
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStaffForm.name.trim() || !createStaffForm.email.trim() || !createStaffForm.password.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const newStaff: DBUser = {
        id: `user-${createStaffForm.role}-${Date.now().toString().slice(-4)}`,
        symposiumId: activeSymposium?.id || "integra-2026",
        name: createStaffForm.name.trim(),
        email: createStaffForm.email.trim().toLowerCase(),
        password: createStaffForm.password.trim(),
        role: createStaffForm.role,
        department: createStaffForm.department.trim() || "Operations",
        phone: createStaffForm.phone.trim() || "+91 90000 00000"
      };

      mockDB.addUser(newStaff);
      mockDB.logActivity(
        currentUser?.name || "System Controller",
        "System Controller",
        "STAFF_ACCOUNT_CREATED",
        `Created staff account for ${newStaff.name} (${newStaff.email}, role: ${newStaff.role})`
      );

      setShowCreateStaffModal(false);
      setCreateStaffForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
        department: "Computer Science",
        phone: "+91 90000 00000"
      });
      await mockDB.syncFromCloud(true);
    loadData();
      setPasswordToast(`✓ Staff account successfully created for ${newStaff.name} (${newStaff.role})`);
      setTimeout(() => setPasswordToast(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create staff account.");
    }
  };

  const handleSwitchAccount = async (targetUser: DBUser) => {
    mockDB.switchAccount(targetUser);
    
    if (targetUser.role === "coordinator") {
      router.push("/coordinator");
    } else if (targetUser.role === "judge") {
      router.push("/judge");
    } else if (targetUser.role === "volunteer") {
      router.push("/volunteer");
    } else if (targetUser.role === "stall_operator") {
      router.push("/stall");
    } else if (targetUser.role === "student") {
      router.push("/dashboard");
    } else if (targetUser.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/superadmin");
    }
  };

  const handleOpenEditStaff = async (staff: DBUser) => {
    setEditingStaffUser(staff);
    setEditStaffForm({
      name: staff.name,
      email: staff.email,
      password: staff.password || "admin123",
      role: staff.role,
      department: staff.department || "Operations",
      phone: staff.phone || "+91 90000 00000"
    });
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffUser) return;

    try {
      const updated: DBUser = {
        ...editingStaffUser,
        name: editStaffForm.name.trim(),
        email: editStaffForm.email.trim().toLowerCase(),
        password: editStaffForm.password.trim(),
        role: editStaffForm.role,
        department: editStaffForm.department.trim(),
        phone: editStaffForm.phone.trim()
      };

      mockDB.updateUser(updated);
      mockDB.logActivity(
        currentUser?.name || "System Controller",
        "System Controller",
        "STAFF_ACCOUNT_UPDATED",
        `Updated staff credentials for ${updated.name} (${updated.email}, role: ${updated.role})`
      );

      setEditingStaffUser(null);
      await mockDB.syncFromCloud(true);
    loadData();
      setPasswordToast(`✓ Staff record updated for ${updated.name}`);
      setTimeout(() => setPasswordToast(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update staff record.");
    }
  };

  const handleDeleteStaff = async (staff: DBUser) => {
    if (staff.id === currentUser?.id || staff.role === "super_admin" && users.filter(u => u.role === "super_admin").length <= 1) {
      alert("⚠️ Root System Controller account cannot be deleted.");
      return;
    }

    if (confirm(`Are you sure you want to permanently delete staff member "${staff.name}" (${staff.email})?`)) {
      mockDB.deleteUser(staff.id);
      mockDB.logActivity(
        currentUser?.name || "System Controller",
        "System Controller",
        "STAFF_ACCOUNT_DELETED",
        `Permanently removed staff account: ${staff.name} (${staff.email})`
      );
      await mockDB.syncFromCloud(true);
    loadData();
      setPasswordToast(`✓ Staff member ${staff.name} permanently deleted.`);
      setTimeout(() => setPasswordToast(""), 4000);
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser || !newStaffPassword.trim()) return;
    try {
      await mockDB.updateUserPasswordAsync(selectedStaffUser.id, newStaffPassword.trim(), currentUser?.name || "System Controller");
      setPasswordToast(`✓ Password successfully reset in Cloud Firestore for ${selectedStaffUser.name} (${selectedStaffUser.email})`);
      setSelectedStaffUser(null);
      setNewStaffPassword("");
      await mockDB.syncFromCloud(true);
      loadData();
      setTimeout(() => setPasswordToast(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update password.");
    }
  };

  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim() || !collegeCode.trim()) return;
    if (editingCollegeId) {
      mockDB.updateCollege({
        id: editingCollegeId,
        name: collegeName.trim(),
        code: collegeCode.trim().toUpperCase(),
        points: 0
      });
      setEditingCollegeId(null);
    } else {
      mockDB.addCollege({
        id: `col-${Date.now()}`,
        name: collegeName.trim(),
        code: collegeCode.trim().toUpperCase(),
        points: 0
      });
    }
    setCollegeName("");
    setCollegeCode("");
    await mockDB.syncFromCloud(true);
    loadData();
  };

  const handleDeleteCollege = async (id: string) => {
    if (confirm("Are you sure you want to remove this college from the master registry?")) {
      mockDB.deleteCollege(id);
      await mockDB.syncFromCloud(true);
    loadData();
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      mockDB.updateSettings(sysSettingsForm);
      await firebaseService.saveSettings(sysSettingsForm);
      loadData(true);
      alert("✓ Master System Settings saved successfully!");
    } catch (err: any) {
      alert(err?.message || "Failed to save settings");
    }
  };

  const handleEmergencyPurge = async () => {
    if (purgeInput.trim() !== "PURGE-DATABASE-PERMANENTLY") {
      alert("Verification text did not match. Action cancelled.");
      return;
    }
    mockDB.clearAllRegistrations();
    setShowPurgeConfirm(false);
    setPurgeInput("");
    await mockDB.syncFromCloud(true);
    loadData();
    alert("⚠️ All student registrations, scores, and activity rosters have been permanently cleared.");
  };

  const handleLogout = async () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const staffMembers = users.filter(u => u.role !== "student");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      {/* Top Root Navigation Bar - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-slate-200 shadow-xs px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] flex items-center justify-center shadow-md shadow-purple-500/30 border border-purple-400/30 shrink-0">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-black text-sm sm:text-base text-slate-900 font-extrabold tracking-wide">
                  SYSTEM CONTROLLER
                </h1>
                <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[9px] sm:text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ROOT / SUPER ADMIN
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-700 font-mono font-semibold mt-0.5">
                Master Governance • Active: <strong className="text-blue-900 font-bold">{activeSymposium?.name || "INTEGRA"} {activeSymposium?.year || "2026"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Quick Jump to Event Operations Admin */}
            <Link
              href="/admin"
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer truncate"
              title="Switch to Event Operations Admin Portal"
            >
              <Cpu size={13} className="text-[#0284C7] shrink-0" />
              <span>Event Ops Console</span>
              <ArrowRight size={11} className="shrink-0" />
            </Link>

            <button
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <LogOut size={12} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-5 sm:gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xl">
            <span className="block text-[10px] font-mono uppercase text-blue-700 font-bold tracking-wider px-2 pb-2">
              Controller Modules
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col gap-1.5">
              {[
                { id: "editions", label: `Editions (${symposiums.length})`, fullLabel: `Symposium Editions (${symposiums.length})`, icon: <Layers size={14} /> },
                { id: "staff", label: `Staff (${staffMembers.length})`, fullLabel: `Staff Management (${staffMembers.length})`, icon: <Key size={14} /> },
                { id: "colleges", label: `Colleges (${colleges.length})`, fullLabel: `College Registry (${colleges.length})`, icon: <School size={14} /> },
                { id: "security", label: "Settings", fullLabel: "Master System Settings", icon: <Settings size={14} /> },
                { id: "logs", label: `Audit Logs (${activityLogs.length})`, fullLabel: `Audit Trail Logs (${activityLogs.length})`, icon: <Activity size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-left p-2.5 sm:p-3 rounded-xl text-[11px] sm:text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-purple-600/25 text-blue-900 font-bold border border-purple-500/50 shadow-inner"
                      : "text-slate-700 font-bold hover:text-blue-700 hover:bg-slate-100 hover:bg-slate-100/40"
                  }`}
                >
                  <span className={activeTab === tab.id ? "text-blue-700 font-bold shrink-0" : "text-slate-700 font-semibold shrink-0"}>{tab.icon}</span>
                  <span className="md:hidden truncate">{tab.label}</span>
                  <span className="hidden md:inline truncate">{tab.fullLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick System Summary Card */}
          <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs space-y-2.5 font-mono">
            <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider block border-b border-slate-200 pb-1.5">
              System Health
            </span>
            <div className="flex justify-between items-center text-slate-800 font-semibold">
              <span>Environment:</span>
              <strong className="text-emerald-800 font-extrabold">ONLINE</strong>
            </div>
            <div className="flex justify-between items-center text-slate-800 font-semibold">
              <span>Total Staff:</span>
              <strong className="text-blue-700 font-bold">{staffMembers.length} Accounts</strong>
            </div>
            <div className="flex justify-between items-center text-slate-800 font-semibold">
              <span>Colleges:</span>
              <strong className="text-blue-700 font-bold">{colleges.length} Affiliated</strong>
            </div>
          </div>
        </aside>

        {/* Center Panel Workspace */}
        <main className="flex-1 space-y-6">
          {/* TAB 1: SYMPOSIUM EDITIONS LIFECYCLE */}
          {activeTab === "editions" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                      <Layers className="text-blue-700 font-bold" size={20} /> Symposium Editions Lifecycle Manager
                    </h2>
                    <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">
                      Create, clone, switch, or lock multi-year symposium editions without code redeployments.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditionFormData({
                        id: `integra-${new Date().getFullYear() + 1}`,
                        name: "INTEGRA",
                        year: `${new Date().getFullYear() + 1}`,
                        tagline: "Inter-Collegiate Technical Symposium",
                        theme: "POWERED BY AI",
                        symposiumDate: `11 – 09 – ${new Date().getFullYear() + 1}`,
                        venue: "Don Bosco College, Yelagiri Hills",
                        regFee: 150,
                        maxParticipants: 500,
                        maxEventsPerParticipant: 3,
                        registrationOpen: true,
                        status: "upcoming",
                        venues: [],
                        scheduleSlots: [],
                        contactEmail: "integra@donbosco.ac.in",
                        contactPhone: "+91 98765 43210",
                        resultsPublished: false
                      });
                      setShowEditionModal(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>Create New Edition</span>
                  </button>
                </div>

                {/* Editions Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {symposiums.map((sym) => {
                    const isActive = sym.id === activeSymposium?.id;
                    if (!mounted || !currentUser || currentUser.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING SUPERADMIN CREDENTIALS...</p>
          <p className="text-slate-500 text-[10px]">Access restricted to System Controllers.</p>
        </div>
      </div>
    );
  }

  if (!mounted || !currentUser || currentUser.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING SUPERADMIN ACCESS...</p>
          <p className="text-slate-500 text-[10px]">Access restricted to System Controllers.</p>
        </div>
      </div>
    );
  }

  return (
                      <div 
                        key={sym.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isActive 
                            ? "bg-indigo-50 border border-indigo-200 border-purple-500/60 shadow-lg shadow-purple-900/20" 
                            : "bg-white border border-slate-200 shadow-sm/60 border-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-blue-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded border border-purple-500/30 uppercase">
                              ID: {sym.id}
                            </span>
                            <h3 className="text-base font-heading font-black text-white mt-1">
                              {sym.name} {sym.year}
                            </h3>
                            <p className="text-xs text-slate-700 font-semibold">{sym.theme}</p>
                          </div>

                          {isActive ? (
                            <span className="bg-emerald-500/20 text-emerald-900 font-bold border border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE EDITION
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSwitchEdition(sym.id)}
                              className="bg-slate-100 hover:bg-purple-900 text-slate-900 font-bold hover:text-slate-900 font-bold border border-slate-700 hover:border-purple-500 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                            >
                              Switch Active
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 font-semibold bg-black/30 p-3 rounded-xl border border-white/5 my-3">
                          <div>📍 {sym.venue || "Campus Venue"}</div>
                          <div>📅 {sym.symposiumDate || "TBA"}</div>
                          <div>💰 Entry Fee: ₹{sym.regFee || 150}</div>
                          <div>👥 Max Cap: {sym.maxParticipants || 500}</div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${sym.registrationOpen ? "bg-emerald-400" : "bg-red-400"}`} />
                            <span className="text-slate-800 font-semibold">Registration: {sym.registrationOpen ? "OPEN" : "CLOSED"}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setEditionFormData(sym);
                                setShowEditionModal(true);
                              }}
                              className="text-blue-700 font-bold hover:text-blue-900 font-bold text-xs font-bold underline cursor-pointer"
                            >
                              Edit Settings
                            </button>
                            <button
                              onClick={() => handleDeleteEdition(sym.id, sym.name)}
                              className="text-rose-900 font-extrabold hover:text-rose-900 font-bold text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Delete edition ${sym.name}`}
                            >
                              <Trash size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF CRUD & MASTER PASSWORDS */}
          {activeTab === "staff" && (
            <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                    <Key className="text-blue-700 font-bold" size={20} /> Staff Accounts & Master Control
                  </h2>
                  <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">
                    Create, edit, reset passwords, or permanently remove Admins, Judges, Volunteers, Coordinators, and Food Staff.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateStaffModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  <UserPlus size={15} />
                  <span>Create New Staff Account</span>
                </button>
              </div>

              {passwordToast && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 border border-emerald-500 text-emerald-200 text-xs font-mono font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{passwordToast}</span>
                </div>
              )}

              {/* Filter & Search */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Search staff by name, email, role, or department..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-slate-900 font-bold placeholder:text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-700 font-semibold" />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {["all", "admin", "judge", "volunteer", "coordinator", "food_coordinator", "super_admin"].map(role => (
                    <button
                      key={role}
                      onClick={() => setStaffRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer ${
                        staffRoleFilter === role
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 shadow-sm hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200"
                      }`}
                    >
                      {role.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Table */}
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto scrollbar-thin border border-slate-200 rounded-2xl bg-black/40 shadow-inner">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-white border border-slate-200 shadow-sm/80 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-700 font-bold">
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Login Email</th>
                      <th className="p-3.5">System Role</th>
                      <th className="p-3.5">Department / Phone</th>
                      <th className="p-3.5">Credential Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {staffMembers
                      .filter(u => {
                        const matchesQuery = 
                          !staffSearchQuery ||
                          u.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
                          u.role.toLowerCase().includes(staffSearchQuery.toLowerCase());
                        const matchesRole = staffRoleFilter === "all" || u.role === staffRoleFilter;
                        return matchesQuery && matchesRole;
                      })
                      .map((staff) => (
                        <tr key={staff.id} className="hover:bg-white border border-slate-200 shadow-sm/40 transition-colors">
                          <td className="p-3.5">
                            <strong className="text-white block font-heading">{staff.name}</strong>
                            <span className="text-[10px] text-slate-700 font-semibold font-mono">{staff.id}</span>
                          </td>
                          <td className="p-3.5 text-blue-900 font-bold">
                            {staff.email}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                              staff.role === "super_admin" ? "bg-indigo-50 border border-indigo-200 text-blue-900 font-bold border-purple-600" :
                              staff.role === "admin" ? "bg-blue-50 border border-blue-200 text-blue-900 font-bold border-sky-600" :
                              staff.role === "judge" ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold border-emerald-600" :
                              staff.role === "volunteer" ? "bg-amber-50 border border-amber-200 text-orange-900 font-bold border-amber-600" :
                              staff.role === "coordinator" ? "bg-indigo-950 text-indigo-300 border-indigo-600" :
                              "bg-slate-100 text-slate-800 font-semibold border-slate-700"
                            }`}>
                              {staff.role}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-800 font-semibold font-sans">
                            <div className="text-xs">{staff.department || "Operations"}</div>
                            <div className="text-[10px] text-slate-700 font-semibold font-mono">{staff.phone || "—"}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold tracking-widest select-none">
                                ••••••••
                              </span>
                              <span className="text-[10px] text-emerald-800 font-bold font-mono">
                                (Secure)
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSwitchAccount(staff)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-purple-600/30"
                                title={`Switch active view to ${staff.name} (${staff.role})`}
                              >
                                <Sparkles size={12} className="text-orange-900 font-bold" />
                                <span>Switch</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStaffUser(staff);
                                  setNewStaffPassword("");
                                }}
                                className="bg-purple-600/20 hover:bg-purple-600/40 text-blue-900 font-bold border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Reset Password"
                              >
                                <Key size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(staff)}
                                className="bg-sky-600/20 hover:bg-sky-600/40 text-blue-900 font-bold border border-sky-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Edit Staff Details"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(staff)}
                                className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Delete Staff Member"
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COLLEGE REGISTRY */}
          {activeTab === "colleges" && (
            <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-base font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                  <School className="text-blue-700 font-bold" size={20} /> College Institution Master Registry
                </h2>
                <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">
                  Add, edit, or remove recognized collegiate institutions participating in symposiums.
                </p>
              </div>

              {/* Add College Form */}
              <form onSubmit={handleSaveCollege} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white border border-slate-200 shadow-sm/80 border border-slate-200 rounded-2xl text-xs font-mono">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">College Name *</label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Loyola College, Chennai"
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Institution Code *</label>
                  <input
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value)}
                    placeholder="e.g. LOYOLA"
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer shadow-md shadow-purple-600/30"
                  >
                    {editingCollegeId ? "Update College" : "Register College"}
                  </button>
                  {editingCollegeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCollegeId(null);
                        setCollegeName("");
                        setCollegeCode("");
                      }}
                      className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-3 py-2.5 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* College Cards Grid */}
              <div className="grid md:grid-cols-2 gap-3 font-mono text-xs">
                {colleges.map((col) => (
                  <div key={col.id} className="p-4 bg-white border border-slate-200 shadow-sm/60 border border-slate-200 hover:border-purple-500/40 rounded-xl flex justify-between items-center transition-all">
                    <div>
                      <strong className="text-white text-sm block font-sans">{col.name}</strong>
                      <span className="text-blue-700 font-bold text-[10px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded border border-purple-500/30 mt-1 inline-block">
                        Code: {col.code}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCollegeId(col.id);
                          setCollegeName(col.name);
                          setCollegeCode(col.code);
                        }}
                        className="bg-slate-100 hover:bg-slate-700 text-slate-900 font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCollege(col.id)}
                        className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border border-red-500/20"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MASTER SYSTEM SETTINGS */}
          {activeTab === "security" && (
            <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-base font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                  <Settings className="text-blue-700 font-bold" size={20} /> Master System Parameters & Controls
                </h2>
                <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">
                  Configure global parameters, institution details, and emergency controls.
                </p>
              </div>

              <form onSubmit={handleSaveGlobalSettings} className="space-y-5 text-xs font-mono">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Global Event Title</label>
                    <input
                      type="text"
                      value={sysSettingsForm.eventTitle}
                      onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, eventTitle: e.target.value })}
                      className="w-full bg-white border border-slate-200 shadow-sm border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Year</label>
                    <input
                      type="text"
                      value={sysSettingsForm.eventYear}
                      onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, eventYear: e.target.value })}
                      className="w-full bg-white border border-slate-200 shadow-sm border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host Institution</label>
                    <input
                      type="text"
                      value={sysSettingsForm.hostCollege || ""}
                      onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, hostCollege: e.target.value })}
                      className="w-full bg-white border border-slate-200 shadow-sm border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Department</label>
                    <input
                      type="text"
                      value={sysSettingsForm.organizerDept || ""}
                      onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, organizerDept: e.target.value })}
                      className="w-full bg-white border border-slate-200 shadow-sm border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 shadow-sm/70 rounded-xl border border-slate-200 space-y-3">
                  <span className="block text-[11px] text-blue-700 font-bold uppercase font-bold tracking-wider">Feature Toggles</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2.5 cursor-pointer text-slate-900 font-bold">
                      <input
                        type="checkbox"
                        checked={sysSettingsForm.feedbackEnabled}
                        onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, feedbackEnabled: e.target.checked })}
                        className="rounded border-slate-700 bg-white border border-slate-200 shadow-sm accent-purple-600 w-4 h-4 cursor-pointer"
                      />
                      <span>Enable Student Feedback Surveys</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer text-slate-900 font-bold">
                      <input
                        type="checkbox"
                        checked={sysSettingsForm.scoreboardEnabled}
                        onChange={(e) => setSysSettingsForm({ ...sysSettingsForm, scoreboardEnabled: e.target.checked })}
                        className="rounded border-slate-700 bg-white border border-slate-200 shadow-sm accent-purple-600 w-4 h-4 cursor-pointer"
                      />
                      <span>Enable Public Scoreboard Release</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-900 font-bold py-3.5 rounded-xl uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/30 transition-all"
                >
                  Save Master System Parameters
                </button>
              </form>

              {/* Emergency Danger Zone */}
              <div className="mt-8 pt-6 border-t border-red-500/20 space-y-3">
                <h3 className="text-sm font-heading font-black text-rose-900 font-extrabold flex items-center gap-2">
                  <AlertTriangle size={18} /> Emergency Root Database Controls
                </h3>
                <p className="text-xs text-slate-700 font-mono font-medium">
                  Purge registrations and event scores. Staff accounts and symposium editions are preserved.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(true)}
                  className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/40 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Initiate Factory Database Reset
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL LOGS */}
          {activeTab === "logs" && (
            <div className="bg-white border border-slate-200 shadow-sm border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                    <Activity className="text-blue-700 font-bold" size={20} /> Security & System Audit Trail
                  </h2>
                  <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">
                    Immutable activity log tracking all staff actions, score submissions, and system events.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto font-mono text-xs">
                {activityLogs.map((log) => (
                  <div key={log.id} className="py-3 flex justify-between items-center text-slate-800 font-semibold">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-700 font-bold">[{log.action}]</span>
                        <span className="text-white font-sans">{log.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-700 font-semibold">
                        Actor: {log.userName} ({log.userRole || "Staff"}) • ID: {log.userId}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-700 font-semibold shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Edition Create/Edit */}
      {showEditionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-sm border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-heading font-black text-white">
                Configure Symposium Edition
              </h3>
              <button onClick={() => setShowEditionModal(false)} className="text-slate-700 font-semibold hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEdition} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Edition ID *</label>
                  <input
                    type="text"
                    value={editionFormData.id}
                    onChange={(e) => setEditionFormData({ ...editionFormData, id: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Edition Year *</label>
                  <input
                    type="text"
                    value={editionFormData.year}
                    onChange={(e) => setEditionFormData({ ...editionFormData, year: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Title *</label>
                <input
                  type="text"
                  value={editionFormData.name}
                  onChange={(e) => setEditionFormData({ ...editionFormData, name: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Theme</label>
                <input
                  type="text"
                  value={editionFormData.theme}
                  onChange={(e) => setEditionFormData({ ...editionFormData, theme: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Date</label>
                  <input
                    type="text"
                    value={editionFormData.symposiumDate}
                    onChange={(e) => setEditionFormData({ ...editionFormData, symposiumDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Registration Fee (₹)</label>
                  <input
                    type="number"
                    value={editionFormData.regFee}
                    onChange={(e) => setEditionFormData({ ...editionFormData, regFee: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="regOpen"
                  checked={editionFormData.registrationOpen}
                  onChange={(e) => setEditionFormData({ ...editionFormData, registrationOpen: e.target.checked })}
                  className="rounded accent-purple-500 w-4 h-4"
                />
                <label htmlFor="regOpen" className="text-slate-800 font-semibold cursor-pointer">Allow Open Public Registration</label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Save Edition
                </button>
                {symposiums.some(s => s.id === editionFormData.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEdition(editionFormData.id, editionFormData.name)}
                    className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/40 px-3 py-2.5 rounded-xl cursor-pointer font-bold flex items-center gap-1.5"
                    title="Delete this symposium edition"
                  >
                    <Trash size={14} />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowEditionModal(false)}
                  className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Staff Member */}
      {showCreateStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-sm border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                <UserPlus size={16} className="text-blue-700 font-bold" /> Create New Staff Account
              </h3>
              <button onClick={() => setShowCreateStaffModal(false)} className="text-slate-700 font-semibold hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={createStaffForm.name}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, name: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Role / Position *</label>
                  <select
                    value={createStaffForm.role}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="admin">Event Admin</option>
                    <option value="judge">Event Judge</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="coordinator">Staff Coordinator</option>
                    <option value="food_coordinator">Food & Dining Manager</option>
                    <option value="super_admin">System Controller (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Login Email *</label>
                  <input
                    type="email"
                    value={createStaffForm.email}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, email: e.target.value })}
                    placeholder="e.g. ramesh@donbosco.ac.in"
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Initial Password *</label>
                  <input
                    type="text"
                    value={createStaffForm.password}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, password: e.target.value })}
                    placeholder="e.g. staff123"
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Department / Duty Station</label>
                  <input
                    type="text"
                    value={createStaffForm.department}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, department: e.target.value })}
                    placeholder="e.g. Computer Science / Lab A"
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={createStaffForm.phone}
                    onChange={(e) => setCreateStaffForm({ ...createStaffForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Create Staff Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateStaffModal(false)}
                  className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Staff Member */}
      {editingStaffUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-sm border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                <Edit3 size={16} className="text-blue-700 font-bold" /> Edit Staff Account Details
              </h3>
              <button onClick={() => setEditingStaffUser(null)} className="text-slate-700 font-semibold hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={editStaffForm.name}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Role / Position *</label>
                  <select
                    value={editStaffForm.role}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="admin">Event Admin</option>
                    <option value="judge">Event Judge</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="coordinator">Staff Coordinator</option>
                    <option value="food_coordinator">Food & Dining Manager</option>
                    <option value="super_admin">System Controller (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Login Email *</label>
                  <input
                    type="email"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Password *</label>
                  <input
                    type="text"
                    value={editStaffForm.password}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, password: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Department / Station</label>
                  <input
                    type="text"
                    value={editStaffForm.department}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={editStaffForm.phone}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-slate-900 font-bold py-2.5 rounded-xl uppercase tracking-wider cursor-pointer shadow-lg shadow-sky-600/30"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStaffUser(null)}
                  className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Reset Staff Password */}
      {selectedStaffUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-sm border border-purple-500/40 rounded-2xl max-w-md w-full p-6 text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-heading font-black text-slate-900 font-extrabold flex items-center gap-2">
                <Key size={16} className="text-blue-700 font-bold" /> Reset Staff Password
              </h3>
              <button onClick={() => setSelectedStaffUser(null)} className="text-slate-700 font-semibold hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-200 text-slate-800 font-semibold space-y-1">
              <div><strong>Target Staff:</strong> {selectedStaffUser.name}</div>
              <div><strong>Login Email:</strong> {selectedStaffUser.email}</div>
              <div><strong>Role:</strong> <span className="uppercase text-blue-700 font-bold">{selectedStaffUser.role}</span></div>
            </div>

            <form onSubmit={handleResetStaffPassword} className="space-y-3">
              <div>
                <label className="block text-slate-800 font-bold font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Passcode *</label>
                <input
                  type="text"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Enter new password (e.g. admin123)"
                  required
                  className="w-full bg-slate-50 border border-slate-700 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Set New Password
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStaffUser(null)}
                  className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Emergency Database Purge Confirm */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-rose-50 border border-rose-200 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#180A0A] border border-red-500/60 rounded-2xl max-w-md w-full p-6 text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-red-900/60 pb-3">
              <h3 className="text-sm font-heading font-black text-rose-900 font-extrabold flex items-center gap-2">
                <AlertTriangle size={18} /> CONFIRM EMERGENCY PURGE
              </h3>
              <button onClick={() => setShowPurgeConfirm(false)} className="text-slate-700 font-semibold hover:text-white cursor-pointer">✕</button>
            </div>

            <p className="text-slate-800 font-semibold leading-relaxed font-sans">
              This action will permanently delete all student registrations, offline payment verifications, event evaluations, and food tokens. Staff accounts and symposium templates will remain intact.
            </p>

            <div className="space-y-2">
              <label className="block text-[10px] text-rose-900 font-extrabold uppercase font-bold">
                Type &quot;PURGE-DATABASE-PERMANENTLY&quot; to confirm:
              </label>
              <input
                type="text"
                value={purgeInput}
                onChange={(e) => setPurgeInput(e.target.value)}
                placeholder="PURGE-DATABASE-PERMANENTLY"
                className="w-full bg-black border border-red-700 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleEmergencyPurge}
                disabled={purgeInput !== "PURGE-DATABASE-PERMANENTLY"}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Execute Database Purge
              </button>
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                className="bg-slate-100 hover:bg-slate-700 text-slate-800 font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
