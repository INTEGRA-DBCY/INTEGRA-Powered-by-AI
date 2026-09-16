"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, Cpu, Shield, Award, Calendar, RefreshCw, LogOut, CheckCircle2, 
  AlertCircle, Download, QrCode, Sparkles, Compass, Lock, Users, PlusCircle, UserPlus, Check, X, Search, Utensils, Trophy, Eye, MapPin, Receipt, BookOpen
} from "lucide-react";
import { 
  mockDB, User as DBUser, Mission, Certificate, Team, TeamJoinRequest, FoodToken, Score, Symposium, College
} from "@/lib/mock-db";
import { pdfHelper } from "@/lib/pdf-helper";
import { validateFullName, validateEmail, validateDepartment, validateCollege } from "@/lib/validation";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [previewCertModal, setPreviewCertModal] = useState<Certificate | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [foodToken, setFoodToken] = useState<FoodToken | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [activeTab, setActiveTab] = useState("passport");
  const [resubmitTxId, setResubmitTxId] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, number>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Event & Team Registration Modal State
  const [eventSearch, setEventSearch] = useState("");
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>("All");
  const [createTeamModalEvent, setCreateTeamModalEvent] = useState<Mission | null>(null);
  const [createdTeamSuccess, setCreatedTeamSuccess] = useState<any>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    phone: "",
    gender: "Male",
    college: "",
    customCollege: "",
    shift: "",
    department: "",
    year: "3rd Year",
    photoUrl: ""
  });
  const [editProfileError, setEditProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [inviteMemberModalTeam, setInviteMemberModalTeam] = useState<Team | null>(null);
  const [inviteParticipantIdInput, setInviteParticipantIdInput] = useState("");
  const [joinTeamModalEvent, setJoinTeamModalEvent] = useState<Mission | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [joinTargetInput, setJoinTargetInput] = useState("");
  const [actionError, setActionError] = useState("");

  // First Login Password Reset State
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");

  const loadDashboardData = (curr: DBUser) => {
    setUser(curr);
    const activeSym = mockDB.getActiveSymposium();
    setSymposium(activeSym);
    setMissions(mockDB.getMissions());
    setColleges(mockDB.getColleges());
    setSettings(mockDB.getSettings());
    setTeams(mockDB.getTeams());
    setJoinRequests(mockDB.getJoinRequests(curr.participantId || curr.id));
    
    // Food Token lookup or generation if verified
    const tokens = mockDB.getFoodTokens();
    const myToken = tokens.find(t => t.participantId === (curr.participantId || curr.id));
    if (myToken) setFoodToken(myToken);
    else if (curr.paymentStatus === "Verified") {
      setFoodToken(mockDB.generateFoodToken(curr));
    }

    if (curr.isFirstLogin === true) {
      setShowFirstLoginModal(true);
    }
    
    const allCerts = mockDB.getCertificates();
    const studentCerts = allCerts.filter(c => c.recipientId === curr.id || c.recipientId === curr.registrationId || c.recipientId === curr.participantId);
    setCerts(studentCerts);

    // Fetch scores if published
    const allScores = mockDB.getScores();
    setScores(allScores.filter(s => s.studentId === curr.id || s.studentId === curr.participantId));
  };

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || curr.role !== "student") {
      router.push("/login");
      return;
    }
    loadDashboardData(curr);

    // Real-time Cloud Sync
    mockDB.syncFromCloud().then(() => {
      const freshUser = mockDB.getCurrentUser() || curr;
      loadDashboardData(freshUser);
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    if (settings?.feedbackQuestions) {
      const initial: Record<string, number> = {};
      settings.feedbackQuestions.forEach((q: string) => {
        initial[q] = 5;
      });
      setFeedbackRatings(initial);
    }
  }, [settings]);

  const handleOpenEditProfile = () => {
    if (!user) return;
    const isStandardCollege = colleges.some(c => c.name === user.college);
    setEditProfileForm({
      name: user.name || "",
      phone: user.phone || "",
      gender: user.gender || "Male",
      college: isStandardCollege ? (user.college || "") : (user.college ? "Other College" : ""),
      customCollege: isStandardCollege ? "" : (user.college || ""),
      shift: user.shift || "",
      department: user.department || "",
      year: user.year || "3rd Year",
      photoUrl: (user.photoUrl as string) || ""
    });
    setEditProfileError("");
    setShowEditProfileModal(true);
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEditProfileError("");

    const nameVal = validateFullName(editProfileForm.name);
    if (!nameVal.valid) {
      setEditProfileError(nameVal.error || "Invalid Full Name.");
      return;
    }

    if (!editProfileForm.phone.trim() || editProfileForm.phone.trim().replace(/\D/g, "").length !== 10) {
      setEditProfileError("Mobile number must be exactly 10 digits.");
      return;
    }

    if (!editProfileForm.gender) {
      setEditProfileError("Please select your gender.");
      return;
    }

    if (!editProfileForm.college) {
      setEditProfileError("Please select your college.");
      return;
    }

    if (editProfileForm.college === "Other College") {
      const colVal = validateCollege(editProfileForm.customCollege);
      if (!colVal.valid) {
        setEditProfileError(colVal.error || "Invalid college name.");
        return;
      }
    }

    const deptVal = validateDepartment(editProfileForm.department);
    if (!deptVal.valid) {
      setEditProfileError(deptVal.error || "Invalid department name.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const finalCollege = editProfileForm.college === "Other College" ? editProfileForm.customCollege.trim() : editProfileForm.college;
      const updatedUser: DBUser = {
        ...user,
        name: editProfileForm.name.trim(),
        phone: editProfileForm.phone.trim().replace(/\D/g, "").slice(0, 10),
        gender: editProfileForm.gender,
        college: finalCollege,
        shift: editProfileForm.shift ? editProfileForm.shift.trim() : undefined,
        department: editProfileForm.department.trim(),
        year: editProfileForm.year,
        photoUrl: editProfileForm.photoUrl
      };

      await mockDB.updateUserAsync(updatedUser);
      setUser(updatedUser);
      setShowEditProfileModal(false);
      alert("Personal information updated successfully!");
    } catch (err: any) {
      setEditProfileError(err.message || "Failed to save profile changes.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordChangeError("Password cannot be blank.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Passwords do not match.");
      return;
    }
    
    if (user) {
      const updatedUser = {
        ...user,
        password: newPassword.trim(),
        isFirstLogin: false
      };
      mockDB.updateUser(updatedUser);
      setUser(updatedUser);
      setShowFirstLoginModal(false);
      alert("Password updated successfully! Welcome to your dashboard.");
    }
  };

  const handleRefresh = () => {
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (curr) {
      loadDashboardData(curr);
    }
    mockDB.syncFromCloud().then(() => {
      const freshUser = mockDB.getCurrentUser() || curr;
      if (freshUser) {
        loadDashboardData(freshUser);
      }
    });
  };

  const handleDemoVerify = () => {
    if (!user) return;
    mockDB.verifyPayment(user.id, "Admin Desk", "Demo Verification at Desk", "Cash");
    handleRefresh();
  };

  const handleResubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !resubmitTxId.trim()) return;

    user.paymentStatus = "Pending";
    user.paymentDetails = {
      txId: resubmitTxId.trim(),
      date: new Date().toLocaleDateString("en-IN"),
      mode: "Other Offline Payment"
    };
    mockDB.updateUser(user);
    setResubmitTxId("");
    handleRefresh();
    alert("Updated payment transaction reference submitted! Pending admin review.");
  };

  const triggerHallTicketDownload = async () => {
    if (!user) return;
    await pdfHelper.downloadHallTicket(user, missions);
  };

  const triggerPassportDownload = async () => {
    if (!user) return;
    await pdfHelper.downloadHallTicket(user, missions);
  };

  const triggerCertificateDownload = (cert: Certificate) => {
    pdfHelper.downloadCertificate(cert);
  };

  const handleRegisterIndividual = (missionId: string) => {
    setActionError("");
    if (!user) return;
    if (user.paymentStatus !== "Verified") {
      setActionError("Your payment must be verified before registering for events.");
      return;
    }

    try {
      mockDB.registerForEvent(user.id, missionId);
      handleRefresh();
      alert("Successfully registered for individual event!");
    } catch (err: any) {
      setActionError(err.message || "Could not register for event.");
    }
  };

  const handleUnregisterEvent = (missionId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to unregister from this event?")) {
      mockDB.unregisterFromEvent(user.id, missionId);
      handleRefresh();
    }
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!user || !createTeamModalEvent || !teamNameInput.trim()) return;

    try {
      mockDB.createTeam(createTeamModalEvent.id, teamNameInput.trim(), user.participantId || user.id);
      setCreateTeamModalEvent(null);
      setTeamNameInput("");
      handleRefresh();
      alert("Team created successfully! You are registered as Team Leader.");
    } catch (err: any) {
      setActionError(err.message || "Failed to create team.");
    }
  };

  const handleInviteMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!user || !inviteMemberModalTeam || !inviteParticipantIdInput.trim()) return;

    try {
      mockDB.inviteTeamMember(inviteMemberModalTeam.id, user.participantId || user.id, inviteParticipantIdInput.trim());
      setInviteMemberModalTeam(null);
      setInviteParticipantIdInput("");
      handleRefresh();
      alert("Team invitation sent to participant!");
    } catch (err: any) {
      setActionError(err.message || "Failed to send invitation.");
    }
  };

  const handleJoinTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!user || !joinTeamModalEvent || !joinTargetInput.trim()) return;

    try {
      mockDB.joinTeam(joinTargetInput.trim(), joinTeamModalEvent.id, user.participantId || user.id);
      setJoinTeamModalEvent(null);
      setJoinTargetInput("");
      handleRefresh();
      alert("Join request sent to team leader!");
    } catch (err: any) {
      setActionError(err.message || "Failed to join team.");
    }
  };

  const handleRespondRequest = (reqId: string, accept: boolean) => {
    try {
      mockDB.respondJoinRequest(reqId, accept);
      handleRefresh();
      alert(accept ? "Member added to team!" : "Request rejected.");
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !user) return;

    await mockDB.submitFeedback({
      id: `fb-${Date.now()}`,
      studentName: user.name,
      college: user.college,
      rating: feedbackRating,
      ratings: feedbackRatings,
      comment: feedbackText.trim(),
      timestamp: new Date().toLocaleString()
    });

    setFeedbackText("");
    setFeedbackSubmitted(true);
    alert("Thank you for your valuable feedback!");
  };

  if (!user) return null;

  const maxEvents = symposium?.maxEventsPerParticipant || 3;
  const userMissions = missions.filter(m => user.registeredEvents?.includes(m.id));
  
  // Category Breakdown Counts (1 Technical, 1 Non-Technical, 1 Cultural)
  const registeredTechMission = userMissions.find(m => (m.category || "").toLowerCase() === "technical");
  const registeredNonTechMission = userMissions.find(m => (m.category || "").toLowerCase() === "non-technical");
  const registeredCulturalMission = userMissions.find(m => (m.category || "").toLowerCase() === "cultural");

  const techCount = registeredTechMission ? 1 : 0;
  const nonTechCount = registeredNonTechMission ? 1 : 0;
  const culturalCount = registeredCulturalMission ? 1 : 0;

  const filteredEvents = missions.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(eventSearch.toLowerCase()) || 
      (m.category || "").toLowerCase().includes(eventSearch.toLowerCase()) ||
      (m.venue || "").toLowerCase().includes(eventSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    if (eventCategoryFilter === "All") return true;
    return (m.category || "").toLowerCase() === eventCategoryFilter.toLowerCase();
  });
  const myTeams = teams.filter(t => 
    t.leaderId === user.participantId || 
    t.leaderId === user.id || 
    (t.members && t.members.some((m: any) => {
      const mId = typeof m === "string" ? m : (m.studentId || m.id);
      return mId === user.participantId || mId === user.id;
    }))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-purple-200 px-4 sm:px-6 lg:px-8 py-3 shadow-xl">
        <div className="w-full max-w-[1680px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-blue-700 transition-colors">
                    {symposium?.name || "INTEGRA"} {symposium?.year || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-blue-100 text-blue-900 border border-blue-300 font-bold font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    PARTICIPANT
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Candidate Portal • <strong className="text-blue-700">{user.name}</strong> ({user.participantId || user.id})
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end font-mono">
            <button 
              onClick={handleRefresh} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-emerald-800 font-extrabold hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Refresh Data Logs"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
            </button>
            
            <button 
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main body split layout */}
      <main className="flex-1 w-full max-w-[1680px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 lg:gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-72 lg:w-80 shrink-0 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200 flex flex-col items-center text-center shadow-xl">
            <div className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-purple-500/60 mb-2.5 sm:mb-3 bg-slate-100 shadow-md shrink-0">
              <img 
                src={user.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"} 
                alt={user.name} 
                className="w-full h-full object-cover" 
              />
              <label className="absolute inset-0 bg-black/70 text-white text-[9px] font-bold flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-mono">
                <span>CHANGE</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const newUrl = evt.target?.result as string;
                        const updated = { ...user, photoUrl: newUrl };
                        mockDB.updateUser(updated);
                        setUser(updated);
                        alert("Photo updated successfully!");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <h2 className="text-sm sm:text-base font-heading font-black text-slate-900 leading-tight">{user.name}</h2>
            <div className="flex flex-col gap-0.5 mt-1 font-mono text-[9.5px] sm:text-[10px]">
              <span className="text-blue-900 font-extrabold">ID: {user.participantId || user.id}</span>
              <span className="text-slate-600 font-medium truncate max-w-[200px]">REG: {user.registrationId}</span>
            </div>
          </div>

          {/* Responsive Navigation Tabs (Grid on mobile, list on desktop) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xl font-mono text-xs font-bold">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col gap-1.5">
              {[
                { id: "passport", label: "AI Passport", fullLabel: "AI Passport", icon: <BookOpen size={14} /> },
                { id: "event_registration", label: `Events (${userMissions.length}/${maxEvents})`, fullLabel: `Event Registration (${userMissions.length}/${maxEvents})`, icon: <Compass size={14} /> },
                { id: "teams", label: `Teams (${myTeams.length})`, fullLabel: `My Teams (${myTeams.length})`, icon: <Users size={14} /> },
                { id: "food_token", label: "Food Token", fullLabel: "Food Token (Lunch)", icon: <Utensils size={14} /> },
                ...(symposium?.resultsPublished ? [{ id: "results", label: "Results", fullLabel: "My Results", icon: <Trophy size={14} /> }] : []),
                ...(settings?.feedbackEnabled ? [{ id: "feedback", label: "Feedback", fullLabel: "Submit Feedback", icon: <Sparkles size={14} /> }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? "bg-blue-600/25 text-blue-700 border border-purple-500/50 shadow-inner" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className={activeTab === tab.id ? "text-blue-600 shrink-0" : "text-slate-700 font-semibold shrink-0"}>{tab.icon}</span>
                  <span className="md:hidden truncate">{tab.label}</span>
                  <span className="hidden md:inline truncate">{tab.fullLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Participant Summary Card - Fills Sidebar Empty Space */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                PARTICIPANT BRIEF
              </span>
              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                user.paymentStatus === "Verified" 
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}>
                {user.paymentStatus === "Verified" ? "VERIFIED" : "PENDING"}
              </span>
            </div>
            
            <div className="space-y-2 font-sans">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Institution</span>
                <strong className="text-slate-900 text-xs font-bold block truncate" title={user.college}>
                  {user.college || "Not Specified"}
                </strong>
              </div>

              {user.shift && (
                <div className="flex items-center justify-between bg-purple-50/70 border border-purple-200/80 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10.5px] font-mono text-purple-900 font-bold">College Shift</span>
                  <span className="text-[11px] font-mono font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 shadow-xs">
                    {user.shift}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-[11px]">
                <span className="text-slate-600 font-mono">Department</span>
                <strong className="text-slate-900 font-mono truncate max-w-[130px]">{user.department || "N/A"}</strong>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-[11px]">
                <span className="text-slate-600 font-mono">Registered Events</span>
                <strong className="text-blue-700 font-mono font-bold">{userMissions.length} / {maxEvents}</strong>
              </div>
            </div>
          </div>

          {/* Helpdesk & Venue Info Card - Fills Sidebar Empty Space */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-purple-500/40 rounded-2xl p-4 shadow-xl space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
              <span>📍</span>
              <span>SYMPOSIUM HELPDESK</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
              {symposium?.venue ? `Venue: ${symposium.venue}` : "Don Bosco College, Yelagiri Hills"}
            </p>
            <div className="pt-1.5 border-t border-slate-800 text-[10.5px] text-slate-400 font-mono flex items-center justify-between">
              <span>Support Desk:</span>
              <strong className="text-amber-300 font-bold">{symposium?.contactPhone || "+91 98765 43210"}</strong>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 space-y-5 sm:space-y-6 min-w-0">
          
          {/* Payment Status Banners - High Contrast & Fully Visible */}
          {user.paymentStatus === "Pending" ? (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-amber-400 bg-amber-50 relative overflow-hidden shadow-xl">
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="p-2 rounded-xl bg-amber-200/80 border border-amber-300 text-amber-800 shrink-0 mt-0.5 shadow-xs">
                  <AlertCircle size={22} className="text-amber-800" />
                </div>
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-black text-amber-950 text-sm uppercase tracking-wider">
                      OFFLINE PAYMENT PENDING
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                      ACTION REQUIRED AT REGISTRATION DESK
                    </span>
                  </div>
                  <p className="text-amber-950 font-medium leading-relaxed font-sans text-xs">
                    Your Participant ID is <strong className="text-amber-950 font-black font-mono bg-amber-200/90 px-1.5 py-0.5 rounded border border-amber-300 select-all">{user.participantId || user.id}</strong> (Reg No: <strong className="text-amber-950 font-black font-mono bg-amber-200/90 px-1.5 py-0.5 rounded border border-amber-300 select-all">{user.registrationId}</strong>). Please pay the registration fee (₹{symposium?.regFee ?? 150}) at the Registration Desk to verify your entry. Once verified, Event Registrations, Team Invitations, Hall Ticket, AI Passport, and Food Token will be unlocked.
                  </p>
                </div>
              </div>
            </div>
          ) : user.paymentStatus === "Rejected" ? (
            <div className="p-5 rounded-3xl border-2 border-red-400 bg-rose-50 space-y-4 shadow-xl">
              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-red-200/80 border border-red-300 text-red-800 shrink-0 mt-0.5 shadow-xs">
                  <AlertCircle className="text-red-800" size={22} />
                </div>
                <div className="text-xs space-y-1">
                  <h3 className="font-heading font-black text-red-950 text-sm uppercase tracking-wider">PAYMENT REJECTED</h3>
                  <p className="text-red-950 font-medium leading-relaxed font-sans">
                    Reason: <strong className="text-red-950 font-black">{user.paymentRejectionReason || "Registration fee not received."}</strong>. Please visit the Registration Desk with your Participant ID: <strong className="text-red-950 font-black font-mono bg-red-200/90 px-1.5 py-0.5 rounded border border-red-300">{user.participantId || user.id}</strong>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleResubmitPayment} className="flex gap-3 text-xs max-w-md pt-2 font-mono">
                <input
                  type="text"
                  value={resubmitTxId}
                  onChange={(e) => setResubmitTxId(e.target.value)}
                  placeholder="Enter offline payment receipt/ref no..."
                  required
                  className="flex-1 bg-white border border-red-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-500 font-mono text-[11px]"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-xl transition-transform hover:scale-[1.01] uppercase tracking-wider text-[10px] cursor-pointer shadow-md"
                >
                  Resubmit Reference
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-3xl border border-emerald-500/40 bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs shadow-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-800 font-extrabold shrink-0" size={18} />
                <span className="text-emerald-900 font-bold font-sans">
                  Payment Verified. Event Registrations, Team Invites & Passes Unlocked!
                </span>
              </div>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-red-300 text-red-950 text-xs text-center font-mono font-black shadow-md animate-in fade-in duration-200">
              ⚠️ {actionError}
            </div>
          )}

          {/* TAB 1: AI Passport */}
          {activeTab === "passport" && (
            <div className="space-y-6 font-mono">
              
              {/* Top Download Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-300 p-4 rounded-2xl shadow-xl max-w-4xl mx-auto">
                <div className="text-center sm:text-left">
                  <h3 className="text-sm font-heading font-black text-slate-900 uppercase tracking-wider">Participant AI Passport Credential</h3>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">Click below to download your official 1-page entry pass (PDF).</p>
                </div>
                <button
                  onClick={triggerPassportDownload}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider font-mono shrink-0"
                >
                  <Download size={18} />
                  <span>Download AI Passport (PDF)</span>
                </button>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  FULL ON-SCREEN AI PASSPORT DOCUMENT CARD (MATCHES PDF EXACTLY)
                 ───────────────────────────────────────────────────────────── */}
              <div id="ai-passport-card" className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl relative space-y-6 max-w-4xl mx-auto text-slate-900 selection:bg-blue-200">
                
                {/* 1. INSTITUTIONAL BRANDING HEADER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-300 pb-5 text-center sm:text-left">
                  {/* Left: College */}
                  <div className="flex items-center gap-3">
                    <img src="/college-logo.png" alt="Don Bosco College Logo" className="h-12 w-12 object-contain shrink-0" />
                    <div>
                      <h4 className="font-heading font-black text-xs text-slate-900 tracking-wide">DON BOSCO COLLEGE</h4>
                      <p className="text-[10px] text-slate-600 font-sans font-bold">(CO-ED), YELAGIRI HILLS • TAMIL NADU</p>
                    </div>
                  </div>

                  {/* Center: Symposium 5-Line Branding */}
                  <div className="text-center font-mono space-y-1">
                    <h3 className="text-lg font-heading font-black tracking-wider text-slate-900 leading-none uppercase">INTEGRA</h3>
                    <div className="text-xs font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-700 tracking-widest uppercase leading-none">THE AI FESTIVAL</div>
                    <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider leading-none">Technology : Powered by AI<span className="text-emerald-600 font-mono font-black animate-pulse">|</span></div>
                    <div className="text-[9.5px] font-black text-orange-600 tracking-wider uppercase leading-none">INNOVATE . INSPIRE . INTEGRATE</div>
                    <div className="text-[9px] font-black text-blue-700 tracking-widest uppercase leading-none">[ TECHNICAL SYMPOSIUM ]</div>
                  </div>

                  {/* Right: Department */}
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <h4 className="font-heading font-black text-xs text-slate-900 tracking-wide">PG & RESEARCH DEPT.</h4>
                      <p className="text-[10px] text-slate-600 font-sans font-bold">OF COMPUTER SCIENCE</p>
                    </div>
                    <img src="/dept-logo.png" alt="CS Department Logo" className="h-12 w-12 object-contain shrink-0" />
                  </div>
                </div>

                {/* 2. MAIN TITLE BANNER: PARTICIPANT AI PASSPORT */}
                <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between px-5 border-t-2 border-b-2 border-cyan-400 shadow-md">
                  <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">[ OFFICIAL AI PASSPORT ]</span>
                  <h2 className="text-sm sm:text-base font-heading font-black uppercase tracking-wider text-white">PARTICIPANT AI PASSPORT</h2>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">[ AY 2026-27 ]</span>
                </div>

                {/* 3. PARTICIPANT IDENTITY SECTION */}
                <div className="bg-slate-50 border border-slate-300 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-6 items-center shadow-inner">
                  {/* Left Photo & ID Box */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-28 h-32 rounded-xl border-2 border-slate-900 overflow-hidden bg-white p-1 shadow-md relative">
                      <img 
                        src={user.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"} 
                        alt={user.name} 
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="bg-slate-900 text-white w-28 py-1 rounded-lg border border-cyan-400 text-center">
                      <span className="block text-[8px] text-cyan-400 uppercase tracking-widest">PARTICIPANT ID</span>
                      <strong className="text-xs font-mono font-black text-white">{user.participantId || user.id}</strong>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">FULL NAME</span>
                      <strong className="text-sm font-sans font-black text-slate-900">{user.name.toUpperCase()}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">COLLEGE INSTITUTION</span>
                      <strong className="text-xs font-sans font-bold text-slate-900 truncate block">
                        {user.college}{user.shift ? ` (${user.shift})` : ""}
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">DEPARTMENT</span>
                      <strong className="text-xs font-sans font-bold text-slate-800">{user.department || "Computer Science"}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">YEAR OF STUDY</span>
                      <strong className="text-xs font-sans font-bold text-slate-800">{user.year || "3rd Year"}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">MOBILE CONTACT</span>
                      <strong className="text-xs font-mono font-bold text-blue-900">{user.phone || "+91 98765 43210"}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">EMAIL ADDRESS</span>
                      <strong className="text-xs font-mono font-bold text-slate-800 truncate block">{user.email}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. REGISTERED EVENTS & VERIFICATION QR CODE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                  
                  {/* Events Table (2 Cols Wide) */}
                  <div className="lg:col-span-2 bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center border-l-4 border-cyan-400">
                        <span className="text-xs font-bold uppercase tracking-wider">REGISTERED EVENTS</span>
                        <span className="text-[10px] text-cyan-400 font-mono">[ {userMissions.length} CONFIRMED ]</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-slate-200 text-slate-700 uppercase text-[9.5px]">
                            <tr>
                              <th className="px-3 py-2">S.NO</th>
                              <th className="px-3 py-2">EVENT</th>
                              <th className="px-3 py-2">TYPE</th>
                              <th className="px-3 py-2">TIME</th>
                              <th className="px-3 py-2">VENUE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-900 bg-white">
                            {userMissions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic text-xs font-sans">
                                  No events registered yet. Go to <strong className="text-blue-600">Event Registration</strong> tab to select events.
                                </td>
                              </tr>
                            ) : (
                              userMissions.map((m, idx) => (
                                <tr key={m.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-500 font-bold">{String(idx + 1).padStart(2, "0")}</td>
                                  <td className="px-3 py-2 font-bold text-slate-900">{m.name}</td>
                                  <td className="px-3 py-2 text-blue-700 font-semibold">{m.maxTeamSize && m.maxTeamSize > 1 ? "Team" : "Individual"}</td>
                                  <td className="px-3 py-2 text-slate-600 text-[10px]">{m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : (m.duration || "10:00 AM")}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{m.venue || "Lab A"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Verification QR Card */}
                  <div className="bg-white border border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
                    <div className="bg-slate-900 text-white w-full py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      SCAN FOR VERIFICATION
                    </div>
                    <div className="p-2 border-2 border-slate-900 rounded-xl bg-white shadow-md">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ symposiumId: symposium?.id || "integra-2026", participantId: user.participantId || user.id, name: user.name, role: user.role }))}`}
                        alt="Verification QR"
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                    <div className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">PARTICIPANT VERIFICATION</div>
                    <div className="text-xs font-mono font-black text-slate-900">{user.participantId || user.id}</div>
                  </div>
                </div>

                {/* 5. EVENT DAY INFORMATION */}
                <div className="bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-900 text-white px-4 py-1.5 flex justify-between items-center border-l-4 border-orange-500 text-xs font-bold uppercase">
                    <span>EVENT DAY INFORMATION</span>
                    <span className="text-[10px] text-cyan-400 font-mono">[ SCHEDULE & VENUE ]</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 p-3 text-center text-xs">
                    <div className="p-2">
                      <span className="block text-[9px] text-cyan-700 font-bold uppercase">DATE</span>
                      <strong className="text-slate-900 font-bold block">{symposium?.symposiumDate || "September 16, 2026"}</strong>
                      <span className="text-[9px] text-slate-500">Event Day</span>
                    </div>
                    <div className="p-2">
                      <span className="block text-[9px] text-emerald-700 font-bold uppercase">REGISTRATION</span>
                      <strong className="text-slate-900 font-bold block">09:00 AM - 09:30 AM</strong>
                      <span className="text-[9px] text-slate-500">Desk Check-in</span>
                    </div>
                    <div className="p-2">
                      <span className="block text-[9px] text-blue-700 font-bold uppercase">VENUE</span>
                      <strong className="text-slate-900 font-bold block">Don Bosco College</strong>
                      <span className="text-[9px] text-slate-500">Yelagiri Hills</span>
                    </div>
                    <div className="p-2">
                      <span className="block text-[9px] text-orange-700 font-bold uppercase">REPORTING</span>
                      <strong className="text-slate-900 font-bold block">15 Mins Before Event</strong>
                      <span className="text-[9px] text-slate-500">Mandatory Presence</span>
                    </div>
                  </div>
                </div>

                {/* 6. IMPORTANT INSTRUCTIONS */}
                <div className="bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-900 text-white px-4 py-1.5 flex justify-between items-center border-l-4 border-cyan-400 text-xs font-bold uppercase">
                    <span>IMPORTANT INSTRUCTIONS</span>
                    <span className="text-[10px] text-cyan-400 font-mono">[ MANDATORY EVENT PROTOCOLS ]</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">01</span>
                      <span>Carry this AI Passport throughout the event.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">02</span>
                      <span>Carry your valid College ID.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">03</span>
                      <span>Report to the venue before the event begins.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">04</span>
                      <span>Follow the rules of each registered event.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">05</span>
                      <span>AI Passport is non-transferable.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">06</span>
                      <span>Do not share your QR code with another participant.</span>
                    </div>
                  </div>
                </div>

                {/* 7. CLEAN FOOTER BAR */}
                <div className="border-t border-slate-300 pt-4 text-center">
                  <div className="text-xs font-black text-slate-900 tracking-wider uppercase">THINK DIFFERENT • CREATE DIFFERENT • COMPETE DIFFERENT</div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">OFFICIAL DIGITAL PARTICIPANT CREDENTIAL • POWERED BY AI</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Event Registration & Slot Clash Engine */}
          {activeTab === "event_registration" && (
            <div className="space-y-6">
              {/* Category Quota Tracker Banner: 1 Technical, 1 Non-Technical, 1 Cultural */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-2xl border border-purple-500/40">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-purple-500/30 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xl">🎯</span>
                      <h3 className="text-lg font-heading font-black tracking-wide text-white">Event Registration Track</h3>
                      <span className="text-xs font-mono font-black bg-purple-400/20 text-purple-200 border border-purple-400/40 px-3 py-0.5 rounded-full">
                        {userMissions.length} / 3 Maximum Events
                      </span>
                    </div>
                    <p className="text-xs text-purple-200/80 font-sans mt-1">
                      Symposium Policy: Each participant can register for at most <strong className="text-white">1 Technical</strong>, <strong className="text-white">1 Non-Technical</strong>, and <strong className="text-white">1 Cultural</strong> event.
                    </p>
                  </div>
                  <div className="text-[11px] font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 shrink-0">
                    Rule 3-Track Allocation
                  </div>
                </div>

                {/* 3 Category Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
                  {/* Track 1: Technical */}
                  <div className={`p-4 rounded-2xl border-2 transition-all ${
                    techCount > 0 
                      ? "bg-emerald-950/60 border-emerald-400/80 text-emerald-100 shadow-lg shadow-emerald-950/40" 
                      : "bg-white/5 border-purple-300/30 text-slate-200 hover:border-purple-400/50"
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💻</span>
                        <span className="font-extrabold text-xs uppercase tracking-wider">Technical</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        techCount > 0 ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
                      }`}>
                        {techCount} / 1
                      </span>
                    </div>
                    <div className="mt-2.5 text-[11px] truncate">
                      {registeredTechMission ? (
                        <span className="font-bold text-emerald-300 flex items-center gap-1">
                          <span>✓</span>
                          <span className="truncate">{registeredTechMission.name}</span>
                        </span>
                      ) : (
                        <span className="text-purple-200/60 italic">0 of 1 Selected</span>
                      )}
                    </div>
                  </div>

                  {/* Track 2: Non-Technical */}
                  <div className={`p-4 rounded-2xl border-2 transition-all ${
                    nonTechCount > 0 
                      ? "bg-emerald-950/60 border-emerald-400/80 text-emerald-100 shadow-lg shadow-emerald-950/40" 
                      : "bg-white/5 border-purple-300/30 text-slate-200 hover:border-purple-400/50"
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎨</span>
                        <span className="font-extrabold text-xs uppercase tracking-wider">Non-Technical</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        nonTechCount > 0 ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
                      }`}>
                        {nonTechCount} / 1
                      </span>
                    </div>
                    <div className="mt-2.5 text-[11px] truncate">
                      {registeredNonTechMission ? (
                        <span className="font-bold text-emerald-300 flex items-center gap-1">
                          <span>✓</span>
                          <span className="truncate">{registeredNonTechMission.name}</span>
                        </span>
                      ) : (
                        <span className="text-purple-200/60 italic">0 of 1 Selected</span>
                      )}
                    </div>
                  </div>

                  {/* Track 3: Cultural */}
                  <div className={`p-4 rounded-2xl border-2 transition-all ${
                    culturalCount > 0 
                      ? "bg-emerald-950/60 border-emerald-400/80 text-emerald-100 shadow-lg shadow-emerald-950/40" 
                      : "bg-white/5 border-purple-300/30 text-slate-200 hover:border-purple-400/50"
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💃</span>
                        <span className="font-extrabold text-xs uppercase tracking-wider">Cultural</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        culturalCount > 0 ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
                      }`}>
                        {culturalCount} / 1
                      </span>
                    </div>
                    <div className="mt-2.5 text-[11px] truncate">
                      {registeredCulturalMission ? (
                        <span className="font-bold text-emerald-300 flex items-center gap-1">
                          <span>✓</span>
                          <span className="truncate">{registeredCulturalMission.name}</span>
                        </span>
                      ) : (
                        <span className="text-purple-200/60 italic">0 of 1 Selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Row: Category Pills & Search */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1">
                {/* Category Filter Tabs */}
                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  {[
                    { id: "All", label: "All Events", badge: `${missions.length}` },
                    { id: "Technical", label: "💻 Technical", badge: `${techCount}/1` },
                    { id: "Non-Technical", label: "🎨 Non-Technical", badge: `${nonTechCount}/1` },
                    { id: "Cultural", label: "💃 Cultural", badge: `${culturalCount}/1` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEventCategoryFilter(tab.id)}
                      className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                        eventCategoryFilter === tab.id
                          ? "bg-purple-700 text-white border-purple-500 shadow-purple-500/20"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        eventCategoryFilter === tab.id ? "bg-purple-900 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {tab.badge}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64 font-mono">
                  <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Search events..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Events Cards Grid - 3 Columns on Widescreen to fill empty space */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {filteredEvents.map(event => {
                  const isRegistered = user.registeredEvents?.includes(event.id);
                  const isTeamEvent = event.type === "Team";
                  const registeredCount = mockDB.getUsers().filter(u => u.registeredEvents?.includes(event.id)).length;
                  const availableSeats = Math.max(0, event.maxCapacity - registeredCount);
                  const isClosed = event.status === "Closed" || availableSeats === 0;

                  // Category limit check
                  const catCheck = !isRegistered ? mockDB.checkCategoryLimit(user.id, event.id) : { allowed: true };

                  // Slot clash check for unselected events
                  const clashInfo = !isRegistered ? mockDB.checkEventSlotClash(user.id, event.id) : { hasClash: false };

                  const isCultural = (event.category || "").toLowerCase() === "cultural";
                  const isTech = (event.category || "").toLowerCase() === "technical";

                  return (
                    <div key={event.id} className="bg-white border border-purple-200 rounded-3xl p-5 flex flex-col justify-between space-y-3 shadow-xl hover:border-purple-500/50 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap gap-1.5">
                            {/* Category Badge */}
                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-md font-bold ${
                              isCultural
                                ? "bg-purple-100 border border-purple-300 text-purple-950 font-black"
                                : isTech
                                ? "bg-blue-100 border border-blue-300 text-blue-950 font-black"
                                : "bg-amber-100 border border-amber-300 text-amber-950 font-black"
                            }`}>
                              {event.category || "Event"}
                            </span>

                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-md font-bold ${isTeamEvent ? "bg-indigo-50 border border-indigo-200 text-blue-700" : "bg-blue-50 border border-blue-200 text-blue-900"}`}>
                              {isTeamEvent ? `TEAM (${event.minTeamSize}-${event.maxTeamSize})` : "INDIVIDUAL"}
                            </span>

                            {event.slot && (
                              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md font-bold bg-slate-100 border border-slate-300 text-slate-700">
                                {event.slot}
                              </span>
                            )}
                          </div>

                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${isClosed ? "bg-rose-50 border border-rose-200 text-rose-900" : "bg-emerald-50 border border-emerald-200 text-emerald-900"}`}>
                            {isClosed ? "CLOSED" : "OPEN"}
                          </span>
                        </div>

                        <h4 className="text-base font-heading font-black text-slate-900">{event.name}</h4>
                        <p className="text-[11px] text-slate-700 mt-1 font-sans">📍 Venue: {event.venue} | ⏰ Time: {event.startTime || "10:00 AM"} - {event.endTime || "10:50 AM"}</p>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-[10px] font-mono text-slate-600 font-medium">
                          <div>Seats: <span className="text-emerald-800 font-extrabold">{availableSeats} / {event.maxCapacity}</span></div>
                          <div>Max Teams: <span className="text-blue-900 font-extrabold">{event.maxTeams || 50}</span></div>
                        </div>

                        {/* Warnings: Category Limit or Slot Clash */}
                        {!isRegistered && !catCheck.allowed && (
                          <div className="mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded-xl text-[10.5px] font-mono text-amber-950 font-bold leading-tight">
                            🔒 {catCheck.reason}
                          </div>
                        )}

                        {!isRegistered && catCheck.allowed && clashInfo.hasClash && (
                          <div className="mt-2.5 p-2 bg-rose-50 border border-rose-300 rounded-xl text-[10.5px] font-mono text-rose-950 font-bold leading-tight">
                            ⚠️ {clashInfo.message}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 font-mono">
                        {isRegistered ? (
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-emerald-950 font-mono text-[10px] font-black">
                            <span>✓ REGISTERED ({event.category})</span>
                            <button
                              onClick={() => handleUnregisterEvent(event.id)}
                              className="text-rose-900 hover:text-rose-700 text-[10px] underline font-black cursor-pointer ml-2"
                            >
                              Drop Event
                            </button>
                          </div>
                        ) : user.paymentStatus !== "Verified" ? (
                          <div className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold font-mono text-[10px] py-2 rounded-xl text-center font-semibold">
                            🔒 REQUIRES VERIFIED PAYMENT
                          </div>
                        ) : isClosed ? (
                          <div className="w-full bg-slate-100 border border-slate-200 text-rose-900 font-extrabold font-mono text-[10px] py-2 rounded-xl text-center font-bold">
                            SEATS FULL / CLOSED
                          </div>
                        ) : !catCheck.allowed ? (
                          <div className="w-full bg-amber-100 border border-amber-300 text-amber-950 font-mono text-[10.5px] py-2.5 rounded-xl text-center font-black">
                            1/1 {event.category.toUpperCase()} REGISTERED
                          </div>
                        ) : clashInfo.hasClash ? (
                          <div className="w-full bg-rose-50 border border-rose-300 text-rose-950 font-mono text-[10px] py-2 rounded-xl text-center font-bold">
                            TIME CLASH – CANNOT SELECT
                          </div>
                        ) : isTeamEvent ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCreateTeamModalEvent(event)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-[10px] uppercase font-mono flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-purple-600/30 transition-all"
                            >
                              <PlusCircle size={12} />
                              <span>Create Team</span>
                            </button>
                            <button
                              onClick={() => setJoinTeamModalEvent(event)}
                              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-2 rounded-xl text-[10px] uppercase font-mono flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-sky-600/30 transition-all"
                            >
                              <Users size={12} />
                              <span>Join Team</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegisterIndividual(event.id)}
                            className="w-full bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-extrabold py-2 rounded-xl text-xs uppercase font-mono transition-transform hover:scale-[1.01] cursor-pointer shadow-lg shadow-purple-600/30"
                          >
                            Register Individual
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Team Formation & Member Invitations */}
          {activeTab === "teams" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-black text-slate-900">Team Management Center</h3>
                <p className="text-xs text-slate-600 font-sans">Create teams, invite verified participants by Participant ID, and respond to invitations.</p>
              </div>

              {/* Pending Received Join Requests & Invitations */}
              {joinRequests.filter(r => (r.status || "").toLowerCase() === "pending").length > 0 && (
                <div className="p-4 rounded-3xl bg-white border border-purple-500/40 space-y-3 shadow-xl">
                  <h4 className="text-xs font-heading font-bold text-blue-600 flex items-center gap-2 font-mono">
                    <UserPlus size={14} />
                    Pending Team Invitations &amp; Join Requests
                  </h4>
                  <div className="space-y-2.5 font-mono">
                    {joinRequests.filter(r => (r.status || "").toLowerCase() === "pending").map(req => {
                      const isIncomingJoinRequest = req.type === "join_request" && (req.leaderId === user.participantId || req.leaderId === user.id);
                      const targetEvent = missions.find(m => m.id === (req.missionId || req.eventId));

                      return (
                        <div key={req.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs shadow-md">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${isIncomingJoinRequest ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-purple-100 text-purple-900 border border-purple-300"}`}>
                                {isIncomingJoinRequest ? "JOIN REQUEST" : "TEAM INVITATION"}
                              </span>
                              <span className="font-black text-slate-900 font-sans text-sm">{req.teamName}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-sans mt-1">
                              {isIncomingJoinRequest ? (
                                <>Candidate <strong className="text-blue-700 font-semibold">{req.studentName}</strong> ({req.studentParticipantId || req.studentId}) wants to join your team for <strong>{targetEvent?.name || req.missionId}</strong>.</>
                              ) : (
                                <>Team Leader <strong className="text-blue-700 font-semibold">{req.leaderName || req.leaderId}</strong> invited you to join for <strong>{targetEvent?.name || req.missionId}</strong>.</>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleRespondRequest(req.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl cursor-pointer text-xs flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Check size={14} />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleRespondRequest(req.id, false)}
                              className="bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold px-3.5 py-1.5 rounded-xl cursor-pointer text-xs flex items-center gap-1 transition-colors"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My Active Teams */}
              {myTeams.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-600 text-xs font-medium shadow-xl font-mono">
                  You are not part of any team yet. Go to Event Registration to create or join a team!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {myTeams.map(team => {
                    const isLeader = team.leaderId === user.participantId || team.leaderId === user.id;
                    return (
                      <div key={team.id} className="bg-white border border-purple-300 rounded-3xl p-5 flex flex-col justify-between space-y-3 shadow-xl">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-blue-700 px-2 py-1 rounded-lg border border-purple-500/50">
                              <span className="text-[10px] font-mono font-black text-blue-900 font-bold">TEAM ID: {team.id}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(team.id);
                                  alert(`Team ID copied to clipboard: ${team.id}`);
                                }}
                                className="text-[9.5px] bg-purple-900 hover:bg-purple-800 text-white px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors"
                                title="Copy Team ID"
                              >
                                📋 Copy
                              </button>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${isLeader ? "bg-amber-50 border border-amber-200 text-orange-600 border-amber-500/40" : "bg-blue-50 border border-blue-200 text-blue-900 font-bold border-sky-500/40"}`}>
                              {isLeader ? "TEAM LEADER" : "MEMBER"}
                            </span>
                          </div>

                          <h4 className="text-base font-heading font-black text-slate-900">{team.teamName}</h4>
                          <p className="text-[11px] text-slate-700 font-sans">Event: <strong className="text-blue-900 font-bold font-mono font-bold">{team.eventName || team.missionName || missions.find(m => m.id === (team.missionId || team.eventId))?.name || "Competition Session"}</strong></p>

                          <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] font-mono space-y-1">
                            <div className="text-slate-600 font-bold uppercase">Members ({team.members.length}):</div>
                            <div className="flex flex-wrap gap-1.5">
                              {team.members.map((mItem: any, idx: number) => {
                                const isString = typeof mItem === "string";
                                const mId = isString ? mItem : (mItem.studentId || mItem.id || "");
                                const mName = isString ? mItem : (mItem.name || mId);
                                const isLeader = mId === team.leaderId || (mItem.role === "Leader");

                                return (
                                  <span key={idx} className="bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 font-bold flex items-center gap-1">
                                    <span>{mName}</span>
                                    {mId && mId !== mName && <span className="text-slate-600 text-[9px]">({mId})</span>}
                                    {isLeader && <span title="Team Leader">👑</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {isLeader && (
                          <button
                            onClick={() => setInviteMemberModalTeam(team)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-xs uppercase font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
                          >
                            <UserPlus size={14} />
                            <span>Invite Member by Participant ID</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Food Token */}
          {activeTab === "food_token" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-heading font-black text-slate-900">Digital Food Token</h3>
                <p className="text-xs text-slate-600 font-sans">Present this QR code at the dining hall entrance to claim your symposium lunch.</p>
              </div>

              {user.paymentStatus !== "Verified" ? (
                <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 border border-amber-500/40 text-center text-orange-600 text-xs font-mono shadow-xl">
                  🔒 Food Token is locked pending offline payment verification at the Registration Desk.
                </div>
              ) : foodToken ? (
                <div className="max-w-md mx-auto bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/40 relative overflow-hidden">
                  <div className="flex justify-between items-center border-b border-emerald-500/30 pb-4 mb-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest font-mono text-emerald-300 font-bold">OFFICIAL MEAL VOUCHER</span>
                      <h4 className="text-lg font-heading font-black text-white">{symposium?.name || "INTEGRA"} DINING</h4>
                    </div>
                    <span className={`text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider ${foodToken.status === "Used" ? "bg-red-500 text-white" : "bg-emerald-400 text-slate-950"}`}>
                      {foodToken.status === "Used" ? "REDEEMED" : "ACTIVE"}
                    </span>
                  </div>

                  <div className="bg-slate-50 text-slate-900 font-bold rounded-2xl p-5 flex flex-col items-center text-center space-y-3 border border-emerald-500/30 shadow-inner">
                    <div className="w-44 h-44 bg-white border border-slate-200 rounded-2xl p-2 flex items-center justify-center shadow-md">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ symposiumId: symposium?.id || "integra-2026", participantId: user.participantId || user.id, tokenId: foodToken.id, type: "FOOD" }))}`}
                        alt="Food QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs font-mono pt-1">
                      <div className="text-blue-900 font-extrabold text-sm">{user.name} ({user.participantId})</div>
                    </div>
                  </div>

                  <div className="mt-4 text-[10px] text-emerald-200 font-mono text-center">
                    Single-use token. Food volunteers scan at dining entrance.
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-600 text-xs font-mono shadow-xl">
                  Generating food token...
                </div>
              )}
            </div>
          )}



          {/* TAB 6: Results */}
          {activeTab === "results" && symposium?.resultsPublished && (
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-black text-slate-900">Official Symposium Results</h3>
              {scores.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-600 text-xs font-mono shadow-xl">
                  Evaluation results are published. No scores recorded under your participant ID yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {scores.map(s => (
                    <div key={s.id} className="p-5 rounded-3xl bg-white border border-purple-300 shadow-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-blue-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded border border-purple-500/40">
                          {s.missionId}
                        </span>
                        <span className="text-base font-heading font-extrabold text-orange-500">
                          {s.totalScore} / 100 PTS
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans italic">&ldquo;{s.remarks}&rdquo;</p>
                      <div className="text-[10px] font-mono text-slate-600">Evaluated by: {s.submittedBy}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: AI Passport (Hall Ticket) */}
          {activeTab === "hallticket" && (
            <div className="bg-white border border-purple-200 p-6 rounded-3xl space-y-6 shadow-xl font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
                    <QrCode className="text-blue-600" size={20} /> Official AI Passport
                  </h3>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">
                    Your official INTEGRA {symposium?.year || "2026"} entry pass, QR verification key & hall ticket.
                  </p>
                </div>
                <button
                  onClick={triggerHallTicketDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                >
                  <Download size={16} />
                  <span>Download AI Passport PDF</span>
                </button>
              </div>

              {/* Passport QR & Participant Card */}
              <div className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-purple-500/40 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold block">OFFICIAL VERIFICATION PASS</span>
                    <h4 className="text-base font-heading font-black text-white">{symposium?.name || "INTEGRA"} AI PASSPORT</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {user.paymentStatus === "Verified" ? "VERIFIED" : "PENDING"}
                  </span>
                </div>

                <div className="bg-white text-slate-900 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 border border-slate-200 shadow-inner">
                  <div className="w-44 h-44 bg-white border border-slate-200 rounded-2xl p-2 flex items-center justify-center shadow-md">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ symposiumId: symposium?.id || "integra-2026", participantId: user.participantId || user.id, name: user.name, role: user.role }))}`}
                      alt="AI Passport QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs font-mono pt-1">
                    <div className="text-blue-950 font-black text-base">{user.name}</div>
                    <div className="text-blue-700 font-extrabold text-xs">ID: {user.participantId || user.id}</div>
                    <div className="text-slate-600 text-[10px] mt-0.5">{user.college}</div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-slate-300 font-mono text-center">
                  Present this QR code at campus gate & event venues for instant entry verification.
                </div>
              </div>

              {/* Campus Gate Entry Verification Logs */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-bold text-slate-900">Campus Main Gate Entry Status</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${user.checkInStatus?.checkedIn ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                    {user.checkInStatus?.checkedIn ? "VERIFIED" : "NOT SCANNED YET"}
                  </span>
                </div>
                <div className="text-slate-700 leading-relaxed font-mono text-[11px] p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {user.checkInStatus?.checkedIn ? (
                    <div>
                      <p className="text-emerald-800 font-bold">✓ Campus Gate Entrance verified.</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">Scan Time: {user.checkInStatus.time}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-amber-800 font-bold">⚠️ Entry checkpoint scan required at main entrance.</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">Present your AI Passport QR code to security volunteers at the main gate.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE TEAM MODAL */}
      {createTeamModalEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono">
            <h3 className="text-base font-heading font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="text-blue-600" size={18} />
              Create Team for {createTeamModalEvent.name}
            </h3>
            <p className="text-xs text-slate-700 font-sans">As Team Leader, enter your team name. Your Participant ID ({user.participantId || user.id}) will be assigned as Leader ID.</p>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 font-mono font-bold leading-relaxed space-y-1">
              <div>⚠️ <strong>Strict Category Policy:</strong> You can register for at most 1 Technical, 1 Non-Technical, and 1 Cultural event. Creating a team reserves your spot for this {createTeamModalEvent.category} event.</div>
              <div>⚠️ <strong>Department Rule:</strong> Only 1 team from 1 department of 1 college is allowed to register per event. All team members must belong to {user.department || "your department"} of {user.college || "your college"}.</div>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Team Name *</label>
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="e.g. Cyber Knights"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateTeamModalEvent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold font-mono font-bold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold font-mono py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {inviteMemberModalTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono">
            <h3 className="text-base font-heading font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="text-blue-600" size={18} />
              Invite Member to {inviteMemberModalTeam.teamName}
            </h3>
            <p className="text-xs text-slate-700 font-sans">Enter the candidate&apos;s verified Participant ID (e.g. VIS-2026-0045) to send an invitation.</p>

            <form onSubmit={handleInviteMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Participant ID *</label>
                <input
                  type="text"
                  value={inviteParticipantIdInput}
                  onChange={(e) => setInviteParticipantIdInput(e.target.value)}
                  placeholder="e.g. VIS-2026-0045"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteMemberModalTeam(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold font-mono font-bold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold font-mono py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN TEAM MODAL */}
      {joinTeamModalEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-sky-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono">
            <h3 className="text-base font-heading font-black text-slate-900 flex items-center gap-2">
              <Users className="text-blue-900 font-extrabold" size={18} />
              Join Team for {joinTeamModalEvent.name}
            </h3>
            <p className="text-xs text-slate-700 font-sans">Enter the Team ID, Team Name, or Team Leader&apos;s Participant ID to send a join request.</p>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-950 font-mono font-bold">
              ℹ️ <strong>Category Track:</strong> Joining this team will count as your 1 {joinTeamModalEvent.category} event registration.
            </div>

            <form onSubmit={handleJoinTeamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Team Name, Team ID, or Leader ID *</label>
                <input
                  type="text"
                  value={joinTargetInput}
                  onChange={(e) => setJoinTargetInput(e.target.value)}
                  placeholder="e.g. VIS-2026-0045 or SquadName"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinTeamModalEvent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold font-mono font-bold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold font-mono py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-sky-600/30"
                >
                  Send Join Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {/* ── EDIT PERSONAL INFORMATION MODAL ───────────────────────────────────── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans text-slate-900 font-bold animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <span className="text-[9.5px] font-mono text-orange-600 font-bold uppercase tracking-widest block">PARTICIPANT PROFILE EDITOR</span>
                <h3 className="text-base font-heading font-black text-slate-900">Edit Personal Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-600 hover:text-slate-900 text-sm font-mono p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editProfileError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-red-950 text-xs font-mono font-bold">
                ⚠️ {editProfileError}
              </div>
            )}

            <form onSubmit={handleSaveProfileSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editProfileForm.name}
                  onChange={e => setEditProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Mobile Number (10 Digits) *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editProfileForm.phone}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Gender *</label>
                  <select
                    value={editProfileForm.gender}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-amber-500 font-mono cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">College Institution *</label>
                  <select
                    value={editProfileForm.college}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, college: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 font-mono cursor-pointer"
                  >
                    <option value="">Select College</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Other College">Other Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Department *</label>
                  <input
                    type="text"
                    value={editProfileForm.department}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, department: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-amber-500 font-sans"
                  />
                </div>
              </div>

              {editProfileForm.college === "Other College" && (
                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Specify College Name *</label>
                  <input
                    type="text"
                    value={editProfileForm.customCollege}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, customCollege: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-amber-500 font-sans"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Academic Year *</label>
                  <select
                    value={editProfileForm.year}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, year: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 font-mono cursor-pointer"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="Final Year">Final Year</option>
                    <option value="Post Graduate (PG)">Post Graduate (PG)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Shift (If Applicable)</label>
                  <select
                    value={editProfileForm.shift || ""}
                    onChange={e => setEditProfileForm(prev => ({ ...prev, shift: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 font-mono cursor-pointer"
                  >
                    <option value="">Not Applicable / Regular</option>
                    <option value="Shift I">Shift I (Day / Morning)</option>
                    <option value="Shift II">Shift II (Evening / Self-Financed)</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload in Profile Editor */}
              <div>
                <label className="block text-slate-700 text-[10.5px] uppercase font-bold mb-1">Update Passport Photo (.JPG, .PNG)</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                  <div className="w-12 h-14 rounded-lg border border-purple-500/40 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                    {editProfileForm.photoUrl ? (
                      <img src={editProfileForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-slate-600" size={20} />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validMimes = ["image/jpeg", "image/jpg", "image/png"];
                        const fileExt = file.name.split('.').pop()?.toLowerCase();
                        if (!validMimes.includes(file.type) && !["jpg", "jpeg", "png"].includes(fileExt || "")) {
                          alert("Only JPEG, JPG, and PNG image files are allowed.");
                          e.target.value = "";
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const rawData = evt.target?.result as string;
                          try {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              const maxDim = 240;
                              let width = img.width;
                              let height = img.height;
                              if (width > height) {
                                if (width > maxDim) {
                                  height = Math.round((height * maxDim) / width);
                                  width = maxDim;
                                }
                              } else {
                                if (height > maxDim) {
                                  width = Math.round((width * maxDim) / height);
                                  height = maxDim;
                                }
                              }
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext("2d");
                              ctx?.drawImage(img, 0, 0, width, height);
                              const compressed = canvas.toDataURL("image/jpeg", 0.7);
                              setEditProfileForm(prev => ({ ...prev, photoUrl: compressed }));
                            };
                            img.onerror = () => {
                              setEditProfileForm(prev => ({ ...prev, photoUrl: rawData }));
                            };
                            img.src = rawData;
                          } catch {
                            setEditProfileForm(prev => ({ ...prev, photoUrl: rawData }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-[11px] text-slate-700 font-mono file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-orange-600 file:text-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5"
                >
                  <span>{isSavingProfile ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEAM CREATED SUCCESS MODAL ────────────────────────────────────── */}
      {createdTeamSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl font-sans text-center animate-scaleUp">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 border-2 border-emerald-500 text-emerald-800 font-extrabold rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg">
              🎉
            </div>

            <div>
              <span className="text-[10px] font-mono text-emerald-800 font-extrabold uppercase tracking-widest font-bold block">TEAM REGISTRATION SUCCESSFUL</span>
              <h3 className="text-xl font-heading font-black text-slate-900 mt-1">Team Created!</h3>
              <p className="text-xs text-slate-700 font-sans mt-1">
                You are registered as Team Leader for <strong className="text-slate-900 font-extrabold">{createdTeamSuccess.name}</strong>.
              </p>
            </div>

            {/* TEAM ID HIGHLIGHT BOX */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-cyan-500/50 space-y-2">
              <span className="text-[10px] font-mono text-blue-900 font-extrabold uppercase tracking-wider block">OFFICIAL TEAM ID</span>
              <div className="flex items-center justify-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-cyan-400/40">
                <span className="text-lg font-mono font-black text-blue-900 font-bold select-all tracking-wider">
                  {createdTeamSuccess.id}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdTeamSuccess.id);
                    alert(`Team ID copied to clipboard: ${createdTeamSuccess.id}`);
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  📋 Copy ID
                </button>
              </div>
              <p className="text-[10.5px] font-mono text-slate-600 leading-tight">
                ⚠️ Share this Team ID with your teammates so they can enter it to join your squad!
              </p>
            </div>

            <button
              onClick={() => setCreatedTeamSuccess(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              Done & Proceed to Dashboard
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
