"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  Cpu,
  DollarSign,
  Download,
  Edit,
  Edit2,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Key,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PieChart,
  Plus,
  PlusCircle,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  School,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Store,
  Trash,
  Trash2,
  Trophy,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Volume2,
  X
} from "lucide-react";
import { 
  mockDB, User as DBUser, UserRole, Mission, College, Announcement, Score, Symposium, ActivityLog, VolunteerDuty, Certificate,
  RefreshmentStall, RefreshmentTransaction, RefreshmentToken, RefreshmentItem
} from "@/lib/mock-db";
import { firebaseService } from "@/lib/firebase-service";
import { pdfHelper } from "@/lib/pdf-helper";
import { validateFullName, validateEmail, validateDepartment, validateCollege } from "@/lib/validation";
import { CameraQRScanner } from "@/components/CameraQRScanner";

// Helper to compress uploaded images to prevent Firestore 1MB document limit exceptions
const compressImageFile = (file: File, maxDim: number = 400, quality: number = 0.88): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
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
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressed = canvas.toDataURL(mimeType, quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [symposiums, setSymposiums] = useState<Symposium[]>([]);
  const [activeSymposium, setActiveSymposium] = useState<Symposium | null>(null);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("int_admin_active_tab");
        if (saved) return saved;
      } catch {}
    }
    return "dashboard";
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("int_admin_active_tab", tab);
        localStorage.removeItem("int_admin_active_tab");
      } catch {}
    }
  };
  const [flyerPosterFormat, setFlyerPosterFormat] = useState<"landscape" | "portrait">("landscape");

  const [searchQuery, setSearchQuery] = useState("");

  // Student Roster Filter & Search State
  const [studentFilterStatus, setStudentFilterStatus] = useState<"All" | "Verified" | "Pending" | "CheckedIn">("All");
  const [studentCollegeFilter, setStudentCollegeFilter] = useState("All");
  const [studentEventFilter, setStudentEventFilter] = useState("All");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Teams Roster Filter & Search State
  const [teamsFilterStatus, setTeamsFilterStatus] = useState<"All" | "Complete" | "Waiting for Members" | "Draft">("All");
  const [teamsEventFilter, setTeamsEventFilter] = useState("All");
  const [teamsSearchQuery, setTeamsSearchQuery] = useState("");

  // Scorecards & Results Filter & Search State
  const [scoresFilterStatus, setScoresFilterStatus] = useState<"All" | "Locked" | "Unlocked">("All");
  const [scoresEventFilter, setScoresEventFilter] = useState("All");
  const [scoresSearchQuery, setScoresSearchQuery] = useState("");

  // Activity Audit Logs Filter & Search State
  const [auditActionFilter, setAuditActionFilter] = useState<string>("All");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  // Missions / Events Filter & Search State
  const [eventCategoryFilter, setMissionCategoryFilter] = useState("All");
  const [missionSearchQuery, setMissionSearchQuery] = useState("");

  // Coordinators & Judges Search State
  const [coordSearchQuery, setCoordSearchQuery] = useState("");
  const [judgeSearchQuery, setJudgeSearchQuery] = useState("");

  // Payment Verification Search & Filter State
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<"All" | "Pending" | "Verified" | "Rejected">("Pending");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentCollegeFilter, setPaymentCollegeFilter] = useState("All");
  const [adminCameraScannerOpen, setAdminCameraScannerOpen] = useState(false);
  const [adminScanMessage, setAdminScanMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Verification & Rejection Modal State
  const [verifyModalStudent, setVerifyModalStudent] = useState<DBUser | null>(null);
  const [verifyPaymentMode, setVerifyPaymentMode] = useState<"Cash" | "Bank Transfer" | "UPI Transfer" | "Other Offline Payment">("Cash");
  const [verifyRemarks, setVerifyRemarks] = useState("Verified at Registration Desk");
  const [rejectModalStudent, setRejectModalStudent] = useState<DBUser | null>(null);
  const [rejectReason, setRejectReason] = useState("Registration entry fee not received.");

  // Symposium Creation, Editing & Cloning State
  const [newSymposiumModalOpen, setNewSymposiumModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [editSymposiumModalOpen, setEditSymposiumModalOpen] = useState(false);
  const [editSymData, setEditSymData] = useState<Symposium | null>(null);
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [newSymData, setNewSymData] = useState({
    id: "",
    name: "INTEGRA",
    theme: "Powered by AI",
    tagline: "INTER-COLLEGE TECHNICAL SYMPOSIUM",
    year: "2027",
    academicYear: "AY27-28",
    symposiumDate: "September 10, 2027",
    venue: "Don Bosco College (Co-Ed), Yelagiri Hills",
    regFee: 200
  });

  // Volunteer Management State
  const [volunteers, setVolunteers] = useState<DBUser[]>([]);
  const [volSearchQuery, setVolSearchQuery] = useState("");
  const [volStationFilter, setVolStationFilter] = useState("All");
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [volFormData, setVolFormData] = useState<Partial<DBUser>>({
    name: "",
    email: "",
    phone: "",
    department: "Computer Science",
    password: "volunteer",
    volunteerDuty: {
      station: "Gate Entry",
      venueName: "Campus Main Gate Entry",
      shift: "Full Day",
      status: "Active",
      notes: ""
    }
  });

  // Announcement State
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState<Announcement["category"]>("General");

  // Organizer Refreshment Desks Management State
  const [refreshmentStalls, setRefreshmentStalls] = useState<RefreshmentStall[]>([]);
  const [refreshmentTxns, setRefreshmentTxns] = useState<RefreshmentTransaction[]>([]);
  const [refreshmentOverview, setRefreshmentOverview] = useState<any>(null);
  const [stallFilter, setStallFilter] = useState("All");
  const [txnStatusFilter, setTxnStatusFilter] = useState("All");
  const [txnSearchQuery, setTxnSearchQuery] = useState("");
  const [stallModalOpen, setStallModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<Partial<RefreshmentStall> | null>(null);
  const [newStallItemName, setNewStallItemName] = useState("");
  const [newStallItemPrice, setNewStallItemPrice] = useState<number>(10);
  const [adjustBalanceModalOpen, setAdjustBalanceModalOpen] = useState(false);
  const [adjustTargetParticipantId, setAdjustTargetParticipantId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState("Admin Refreshment Allowance Adjustment");
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalTargetTxn, setReversalTargetTxn] = useState<RefreshmentTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState("Mistaken punch / customer request");
  const [refreshmentAllowanceInput, setRefreshmentAllowanceInput] = useState<number>(20);

  // Certificate Generator & Vault State
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [certType, setCertType] = useState<"Winner" | "Runner-up">("Winner");
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [certPrizeDetails, setCertPrizeDetails] = useState("");
  const [bulkIssuing, setBulkIssuing] = useState(false);
  const [certSearchQuery, setCertSearchQuery] = useState("");
  const [certFilterType, setCertFilterType] = useState<"All" | "Winner" | "Runner-up" | "Participation" | "Volunteer" | "Coordinator">("All");
  const [certFilterEvent, setCertFilterEvent] = useState("All");
  const [previewCertModal, setPreviewCertModal] = useState<Certificate | null>(null);
  const [certTemplateDesignerOpen, setCertTemplateDesignerOpen] = useState(false);
  const [certTemplateSavedToast, setCertTemplateSavedToast] = useState(false);
  const [certCollegeName, setCertCollegeName] = useState("ABC ENGINEERING COLLEGE");
  const [certCollegeTagline, setCertCollegeTagline] = useState("Excellence Through Innovation");
  const [certCollegeLogoUrl, setCertCollegeLogoUrl] = useState("/college-logo.png");
  const [certDeptName, setCertDeptName] = useState("DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING");
  const [certDeptTagline, setCertDeptTagline] = useState("Innovate • Code • Elevate");
  const [certDeptLogoUrl, setCertDeptLogoUrl] = useState("/dept-logo.png");
  const [certCoordinatorName, setCertCoordinatorName] = useState("Prof. Event Coordinator");
  const [certHodName, setCertHodName] = useState("Dr. Head of Department");
  const [certPrincipalName, setCertPrincipalName] = useState("Rev. Dr. Principal");

  // Manage Events Form State
  const [missionName, setMissionName] = useState("");
  const [missionCategory, setMissionCategory] = useState("");
  const [missionDifficulty, setMissionDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Expert">("Medium");
  const [missionDuration, setMissionDuration] = useState("");
  const [missionVenue, setMissionVenue] = useState("");
  const [missionSlot, setMissionSlot] = useState("SLOT 1");
  const [missionStartTime, setMissionStartTime] = useState("10:00 AM");
  const [missionEndTime, setMissionEndTime] = useState("10:50 AM");
  const [missionAssignedJudgeId, setMissionAssignedJudgeId] = useState("");
  const [missionCoordinator, setMissionCoordinator] = useState("");
  const [missionPhone, setMissionPhone] = useState("");
  const [missionRulesInput, setMissionRulesInput] = useState("");
  const [missionCriteriaInput, setMissionCriteriaInput] = useState("");
  const [missionLogoUrl, setMissionLogoUrl] = useState("");

  const [missionType, setMissionType] = useState<"Individual" | "Team">("Individual");
  const [missionMinTeamSize, setMissionMinTeamSize] = useState(1);
  const [missionMaxTeamSize, setMissionMaxTeamSize] = useState(1);
  const [missionMaxCapacity, setMissionMaxCapacity] = useState(50);
  const [missionMaxTeams, setMissionMaxTeams] = useState(50);
  const [missionStatus, setMissionStatus] = useState<"Open" | "Closed">("Open");
  const [missionEventDate, setMissionEventDate] = useState("2026-09-11");
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);

  const handleOpenEditMission = (m: Mission) => {
    setEditingMissionId(m.id);
    setMissionName(m.name);
    setMissionCategory(m.category || "");
    setMissionType(m.type || "Individual");
    setMissionMinTeamSize(m.minTeamSize || 1);
    setMissionMaxTeamSize(m.maxTeamSize || 1);
    setMissionMaxCapacity(m.maxCapacity || 50);
    setMissionMaxTeams(m.maxTeams || 50);
    setMissionStatus(m.status || "Open");
    setMissionEventDate(m.eventDate || "2026-09-11");
    setMissionDifficulty(m.difficulty || "Medium");
    setMissionDuration(m.duration || "50 Mins");
    setMissionVenue(m.venue || "");
    setMissionSlot(m.slot || "SLOT 1");
    setMissionStartTime(m.startTime || "10:00 AM");
    setMissionEndTime(m.endTime || "10:50 AM");
    setMissionCoordinator(m.coordinator || "");
    setMissionPhone(m.phone || "");
    setMissionRulesInput(m.rules ? m.rules.join("\n") : "");
    setMissionCriteriaInput(m.criteria ? m.criteria.join(", ") : "");
    setMissionLogoUrl(m.logoUrl || "");
    setMissionAssignedJudgeId(m.assignedJudgeId || "");
  };

  const handleCancelEditMission = () => {
    setEditingMissionId(null);
    setShowCreateEventForm(false);
    setMissionName("");
    setMissionCategory("");
    setMissionDuration("");
    setMissionVenue("");
    setMissionCoordinator("");
    setMissionPhone("");
    setMissionRulesInput("");
    setMissionCriteriaInput("");
    setMissionLogoUrl("");
    setMissionAssignedJudgeId("");
    setMissionType("Individual");
    setMissionMinTeamSize(1);
    setMissionMaxTeamSize(1);
    setMissionMaxCapacity(50);
    setMissionMaxTeams(50);
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionName.trim()) {
      alert("Please provide the Event Name.");
      return;
    }
    if (!missionCategory.trim()) {
      alert("Please select or enter an Event Category / Domain.");
      return;
    }
    if (!missionVenue.trim()) {
      alert("Please enter the Event Venue location.");
      return;
    }
    if (!missionCoordinator.trim()) {
      alert("Please select a Lead Staff Coordinator from the dropdown or enter a coordinator name.");
      return;
    }

    setIsCloudSyncing(true);
    try {
      if (editingMissionId) {
        const existing = missions.find(m => m.id === editingMissionId);
        const assignedJudgeUser = users.find(u => u.id === missionAssignedJudgeId && u.role === "judge");

        const updatedMission: Mission = {
          ...(existing || {}),
          id: editingMissionId,
          symposiumId: existing?.symposiumId || activeSymposium?.id || mockDB.getActiveSymposiumId() || "integra-2026",
          name: missionName.trim(),
          category: missionCategory.trim(),
          type: missionType,
          minTeamSize: missionType === "Team" ? missionMinTeamSize : 1,
          maxTeamSize: missionType === "Team" ? missionMaxTeamSize : 1,
          maxCapacity: missionMaxCapacity,
          maxTeams: missionMaxTeams,
          status: missionStatus,
          eventDate: missionEventDate,
          slot: missionSlot,
          startTime: missionStartTime,
          endTime: missionEndTime,
          assignedJudgeId: missionAssignedJudgeId || undefined,
          assignedJudgeName: assignedJudgeUser ? assignedJudgeUser.name : existing?.assignedJudgeName,
          difficulty: missionDifficulty,
          duration: missionDuration || "50 Mins",
          venue: missionVenue.trim(),
          coordinator: missionCoordinator.trim(),
          phone: missionPhone || "+91 99999 99999",
          rules: missionRulesInput ? missionRulesInput.split("\n").map(r => r.trim()).filter(Boolean) : ["Event participation rules apply."],
          criteria: missionCriteriaInput ? missionCriteriaInput.split(",").map(c => c.trim()).filter(Boolean) : ["Performance", "Quality", "Innovation"],
          logoUrl: missionLogoUrl.trim() || undefined
        };

        await mockDB.updateMissionAsync(updatedMission);
        handleCancelEditMission();
        setMissionCategoryFilter("All");
        setMissionSearchQuery("");
        await mockDB.syncFromCloud(true);
        fetchData();
        alert(`✓ Event '${updatedMission.name}' updated successfully in Cloud Firestore!`);
      } else {
        let cleanId = missionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!cleanId) cleanId = `event-${Date.now()}`;
        const allMissions = mockDB.getMissions();
        if (allMissions.some(m => m.id === cleanId)) {
          cleanId = `${cleanId}-${Date.now().toString().slice(-4)}`;
        }

        const assignedJudgeUser = users.find(u => u.id === missionAssignedJudgeId && u.role === "judge");

        const newMission: Mission = {
          id: cleanId,
          symposiumId: activeSymposium?.id || mockDB.getActiveSymposiumId() || "integra-2026",
          name: missionName.trim(),
          category: missionCategory.trim(),
          type: missionType,
          minTeamSize: missionType === "Team" ? missionMinTeamSize : 1,
          maxTeamSize: missionType === "Team" ? missionMaxTeamSize : 1,
          maxCapacity: missionMaxCapacity,
          maxTeams: missionMaxTeams,
          status: missionStatus,
          eventDate: missionEventDate,
          slot: missionSlot,
          startTime: missionStartTime,
          endTime: missionEndTime,
          assignedJudgeId: missionAssignedJudgeId || undefined,
          assignedJudgeName: assignedJudgeUser ? assignedJudgeUser.name : undefined,
          difficulty: missionDifficulty,
          duration: missionDuration || "50 Mins",
          venue: missionVenue.trim(),
          coordinator: missionCoordinator.trim(),
          phone: missionPhone || "+91 99999 99999",
          rules: missionRulesInput ? missionRulesInput.split("\n").map(r => r.trim()).filter(Boolean) : ["Event participation rules apply."],
          criteria: missionCriteriaInput ? missionCriteriaInput.split(",").map(c => c.trim()).filter(Boolean) : ["Performance", "Quality", "Innovation"],
          logoUrl: missionLogoUrl.trim() || undefined
        };

        await mockDB.addMissionAsync(newMission);
        handleCancelEditMission();
        setMissionCategoryFilter("All");
        setMissionSearchQuery("");
        await mockDB.syncFromCloud(true);
        fetchData();
        alert(`✓ New Event '${newMission.name}' created, published, and saved to Cloud Firestore!`);
      }
    } catch (err: any) {
      alert("Error saving event: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const downloadExportFile = (filename: string, headers: string, rows: string, isExcel: boolean = false) => {
    const bom = "\uFEFF";
    const content = bom + headers + "\n" + rows;
    const mimeType = isExcel ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8";
    const ext = isExcel ? ".xls" : ".csv";
    const finalName = filename.replace(/\.(csv|xls)$/i, "") + ext;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportTeamsCSV = (isExcel: boolean = false) => {
    const allTeams = mockDB.getTeams();
    const allMissions = mockDB.getMissions();
    const allUsers = mockDB.getUsers();

    const headers = "TeamID,EventID,EventName,TeamName,LeaderID,LeaderName,MembersCount,Members";
    const rows = allTeams.map(t => {
      const eventId = t.eventId || t.missionId || "N/A";
      const eventObj = allMissions.find(m => m.id === eventId);
      const eventName = (t as any).eventName || (t as any).missionName || eventObj?.name || "N/A";
      const teamName = t.teamName || t.name || "N/A";
      const leaderId = t.leaderId || "N/A";
      const leaderUser = allUsers.find(u => u.id === leaderId || u.participantId === leaderId);
      const leaderName = t.leaderName || leaderUser?.name || "N/A";

      const membersList = (t.members || []).map((m: any) => {
        if (typeof m === "string") return m;
        return `${m.name || "Member"} (${m.studentId || m.id || ""})`;
      }).join("; ");

      return `"${t.id}","${eventId}","${eventName.replace(/"/g, '""')}","${teamName.replace(/"/g, '""')}","${leaderId}","${leaderName.replace(/"/g, '""')}",${(t.members || []).length},"${membersList.replace(/"/g, '""')}"`;
    }).join("\n");

    downloadExportFile("integra_2026_registered_teams", headers, rows, isExcel);
  };

  

  const handleDeleteMission = async (id: string) => {
    if (confirm("Are you sure you want to delete this event from Cloud Firestore?")) {
      // Millisecond 0: Optimistic instant removal from memory & React state
      mockDB.deleteMission(id, currentUser?.name || "Admin");
      setMissions(prev => prev.filter(m => m.id !== id && m.name.toLowerCase().trim() !== id.toLowerCase().trim()));
      fetchData();

      // Background cloud purge
      setIsCloudSyncing(true);
      try {
        await mockDB.deleteMissionAsync(id, currentUser?.name || "Admin");
        await mockDB.syncFromCloud(true);
        fetchData();
      } catch (err: any) {
        console.error("Background event deletion cloud error:", err);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleCreateOrUpdateCollege = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim() || !colCode.trim()) return;

    if (editingCollegeId) {
      mockDB.updateCollege({
        id: editingCollegeId,
        name: colName.trim(),
        code: colCode.trim().toUpperCase(),
        points: 0
      });
      setEditingCollegeId(null);
      alert("College details updated successfully!");
    } else {
      const colId = colName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      // Prevent duplicates
      if (colleges.some(c => c.id === colId || c.code === colCode.trim().toUpperCase())) {
        alert("A college with this name or code already exists!");
        return;
      }

      mockDB.addCollege({
        id: colId,
        name: colName.trim(),
        code: colCode.trim().toUpperCase(),
        points: 0
      });
      alert("New college profile registered successfully!");
    }

    setColName("");
    setColCode("");
    setColPoints(0);
    fetchData();
  };

  const handleAssignStaff = async (missionId: string, coordinatorEmailOrId: string, judgeId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    const coordUser = users.find(u => 
      (u.email?.toLowerCase().trim() === coordinatorEmailOrId.toLowerCase().trim() || 
       u.id === coordinatorEmailOrId || 
       u.name?.toLowerCase().trim() === coordinatorEmailOrId.toLowerCase().trim()) && 
      (u.role === "coordinator" || u.roles?.includes("coordinator"))
    );
    
    const judgeUser = users.find(u => 
      (u.id === judgeId || 
       u.email?.toLowerCase().trim() === judgeId.toLowerCase().trim() || 
       u.name?.toLowerCase().trim() === judgeId.toLowerCase().trim()) && 
      (u.role === "judge" || u.roles?.includes("judge"))
    );

    const updatedMission: Mission = {
      ...mission,
      coordinator: coordUser ? coordUser.name : (coordinatorEmailOrId === "" ? "Unassigned" : (coordinatorEmailOrId || "Unassigned")),
      phone: coordUser?.phone || mission.phone || "+91 99999 99999",
      assignedJudgeId: judgeUser ? judgeUser.id : (judgeId === "" ? undefined : mission.assignedJudgeId),
      assignedJudgeName: judgeUser ? judgeUser.name : (judgeId === "" ? undefined : mission.assignedJudgeName)
    };

    setIsCloudSyncing(true);
    try {
      await mockDB.updateMissionAsync(updatedMission);
      await mockDB.syncFromCloud(true);
      fetchData();
      alert(`✓ Staff assignments updated for '${mission.name}' in Cloud Firestore!`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteCollege = (id: string) => {
    if (confirm("Are you sure you want to delete this college profile? This cannot be undone.")) {
      mockDB.deleteCollege(id);
      fetchData();
    }
  };

  const handleEditCollegeClick = (col: College) => {
    setEditingCollegeId(col.id);
    setColName(col.name);
    setColCode(col.code);
    setColPoints(col.points);
  };

  // System Settings State
  const [sysTitle, setSysTitle] = useState("");
  const [sysYear, setSysYear] = useState("");
  const [sysDateText, setSysDateText] = useState("");
  const [sysTarget, setSysTarget] = useState("");
  const [sysDept, setSysDept] = useState("");
  const [sysCollege, setSysCollege] = useState("");
  const [sysLocation, setSysLocation] = useState("");
  const [sysTagline, setSysTagline] = useState("");
  const [sysFeedbackEnabled, setSysFeedbackEnabled] = useState(false);
  const [sysScoreboardEnabled, setSysScoreboardEnabled] = useState(true);
  const [sysMaxEventsSelection, setSysMaxMissionsSelection] = useState(3);
  const [sysHeroDescription, setSysHeroDescription] = useState("");
  const [sysAboutText, setSysAboutText] = useState("");
  const [sysContactEmail, setSysContactEmail] = useState("");
  const [sysContactPhone, setSysContactPhone] = useState("");
  const [sysMapCoordinates, setSysMapCoordinates] = useState("");

  // Gallery Customizer CRUD State
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [newGalUrl, setNewGalUrl] = useState("");
  const [newGalPhotoData, setNewGalPhotoData] = useState("");
  const [newGalFileName, setNewGalFileName] = useState("");
  const [newGalTag, setNewGalTag] = useState("");

  // FAQ Customizer CRUD State
  const [faqItems, setFaqItems] = useState<any[]>([]);
  const [newFAQQuestion, setNewFAQQuestion] = useState("");
  const [newFAQAnswer, setNewFAQAnswer] = useState("");
  const [editingFAQId, setEditingFAQId] = useState<string | null>(null);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [sysFeedbackQuestions, setSysFeedbackQuestions] = useState<string[]>([]);

  // Password Manager State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const [visiblePasswordMap, setVisiblePasswordMap] = useState<Record<string, boolean>>({});
  const [passManagerSearch, setPassManagerSearch] = useState("");
  const [passManagerRoleFilter, setPassManagerRoleFilter] = useState("all");

  const [editingStudentPointsId, setEditingStudentPointsId] = useState<string | null>(null);
  const [overridePointsValue, setOverridePointsValue] = useState(0);

  // Staff & Roles Management State
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("All");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffFormData, setStaffFormData] = useState<{
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: DBUser["role"];
    department?: string;
    phone?: string;
  }>({
    name: "",
    email: "",
    password: "",
    role: "coordinator",
    department: "Computer Science",
    phone: ""
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [inspectingUser, setInspectingUser] = useState<DBUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<DBUser | null>(null);
  const [selectedRolesForModal, setSelectedRolesForModal] = useState<UserRole[]>([]);
  const [quickSwitchModalOpen, setQuickSwitchModalOpen] = useState(false);
  const [openSidebarSections, setOpenSidebarSections] = useState<{ [key: string]: boolean }>({
    participants: true,
    staff: true,
    operations: true
  });

  const toggleSidebarSection = (key: string) => {
    setOpenSidebarSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Coordinators CRUD State
  const [coordName, setCoordName] = useState("");
  const [coordEmail, setCoordEmail] = useState("");
  const [coordPasscode, setCoordPasscode] = useState("");
  const [editingCoordinatorId, setEditingCoordinatorId] = useState<string | null>(null);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);

  // Judges CRUD State
  const [judgeName, setJudgeName] = useState("");
  const [judgeEmail, setJudgeEmail] = useState("");
  const [judgePasscode, setJudgePasscode] = useState("");
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);

  const handleOverrideScore = (studentId: string, newPoints: number) => {
    const targetStudent = users.find(u => u.id === studentId);
    if (targetStudent) {
      const updated = { ...targetStudent, xp: newPoints };
      mockDB.updateUser(updated);
      fetchData();
      setEditingStudentPointsId(null);
      alert(`Scoreboard points for student ${targetStudent.name} successfully overridden to ${newPoints} Points!`);
    }
  };

  const handleResetAllScores = () => {
    if (confirm("⚠️ WARNING: This will reset all student scores to 0 Points. Are you sure you want to proceed?")) {
      const allUsers = mockDB.getUsers();
      allUsers.forEach(u => {
        if (u.role === "student") {
          u.xp = 0;
          u.achievements = ["Registered"];
          mockDB.updateUser(u);
        }
      });
      fetchData();
      alert("All participant scores have been successfully reset to 0 Points!");
    }
  };

  // Account Switching & Role Permission Handlers
  const handleDeleteStaffUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this staff user profile? This cannot be undone.")) {
      setIsCloudSyncing(true);
      try {
        await mockDB.deleteUserAsync(userId);
        await mockDB.syncFromCloud(true);
        fetchData();
        alert("✓ Staff user removed successfully!");
      } catch (err: any) {
        alert("Error deleting user: " + (err.message || err));
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleSwitchAccount = (targetUser: DBUser) => {
    mockDB.switchAccount(targetUser);
    setQuickSwitchModalOpen(false);
    
    // Route to appropriate portal based on role
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
    } else {
      router.push("/admin");
    }
  };

  const handleOpenRoleModal = (user: DBUser) => {
    setRoleChangeUser(user);
    const existing: UserRole[] = Array.isArray(user.roles) && user.roles.length > 0 
      ? user.roles 
      : (user.role ? [user.role as UserRole] : ["student" as UserRole]);
    setSelectedRolesForModal(existing);
  };

  const handleToggleRoleInModal = (role: UserRole) => {
    if (selectedRolesForModal.includes(role)) {
      if (selectedRolesForModal.length === 1) {
        alert("A user must have at least one assigned role.");
        return;
      }
      setSelectedRolesForModal(selectedRolesForModal.filter(r => r !== role));
    } else {
      setSelectedRolesForModal([...selectedRolesForModal, role]);
    }
  };

  const handleSaveAssignedRoles = async () => {
    if (!roleChangeUser || selectedRolesForModal.length === 0) return;
    setIsCloudSyncing(true);
    try {
      await mockDB.assignUserRoles(roleChangeUser.id, selectedRolesForModal, currentUser?.name || "Administrator");
      await mockDB.syncFromCloud(true);
      fetchData();
      const userName = roleChangeUser.name;
      setRoleChangeUser(null);
      alert(`✓ Roles [${selectedRolesForModal.join(", ")}] assigned to ${userName}! Now they can log in once and switch between their assigned roles.`);
    } catch (err: any) {
      alert("Error assigning roles: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: DBUser["role"]) => {
    if (!newRole) return;
    setIsCloudSyncing(true);
    try {
      await mockDB.changeUserRole(userId, newRole, currentUser?.name || "Administrator");
      await mockDB.syncFromCloud(true);
      fetchData();
      setRoleChangeUser(null);
      alert(`✓ User role successfully updated to '${newRole.toUpperCase()}' in Cloud Firestore!`);
    } catch (err: any) {
      alert("Error changing user role: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleToggleRoleForInspectingUser = async (role: UserRole) => {
    if (!inspectingUser) return;
    const currentRoles: UserRole[] = Array.isArray(inspectingUser.roles) && inspectingUser.roles.length > 0 
      ? inspectingUser.roles 
      : [inspectingUser.role || "coordinator"];
    
    let newRoles: UserRole[];
    if (currentRoles.includes(role)) {
      if (currentRoles.length === 1) {
        alert("A staff member must have at least one assigned role.");
        return;
      }
      newRoles = currentRoles.filter(r => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }

    const updated: DBUser = {
      ...inspectingUser,
      roles: newRoles,
      role: newRoles[0]
    };
    setInspectingUser(updated);

    setIsCloudSyncing(true);
    try {
      await mockDB.assignUserRoles(inspectingUser.id, newRoles, currentUser?.name || "Administrator");
      await mockDB.syncFromCloud(true);
      fetchData();
    } catch (err: any) {
      alert("Error updating roles: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleSaveStaffUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateFullName(staffFormData.name);
    if (!nameVal.valid) {
      alert(nameVal.error);
      return;
    }
    const emailVal = validateEmail(staffFormData.email);
    if (!emailVal.valid) {
      alert(emailVal.error);
      return;
    }
    if (staffFormData.department) {
      const deptVal = validateDepartment(staffFormData.department);
      if (!deptVal.valid) {
        alert(deptVal.error);
        return;
      }
    }

    setIsCloudSyncing(true);
    try {
      if (editingStaffId) {
        const match = users.find(u => u.id === editingStaffId);
        if (match) {
          const updated: DBUser = {
            ...match,
            name: staffFormData.name.trim(),
            email: staffFormData.email.trim().toLowerCase(),
            password: staffFormData.password?.trim() || match.password || "staff123",
            role: staffFormData.role,
            department: staffFormData.department?.trim() || "Computer Science",
            phone: staffFormData.phone?.trim() || match.phone || "+91 99999 99999"
          };
          await mockDB.updateUserAsync(updated);
          alert(`✓ Staff member '${updated.name}' updated successfully!`);
        }
      } else {
        const prefix = staffFormData.role || "user";
        const newUserId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newStaff: DBUser = {
          id: newUserId,
          name: staffFormData.name.trim(),
          email: staffFormData.email.trim().toLowerCase(),
          password: staffFormData.password?.trim() || "staff123",
          role: staffFormData.role,
          department: staffFormData.department?.trim() || "Computer Science",
          phone: staffFormData.phone?.trim() || "+91 99999 99999",
          symposiumId: activeSymposium?.id || "integra-2026"
        };
        await mockDB.addUserAsync(newStaff);
        setInspectingUser(newStaff);
        const defaultRoles: UserRole[] = ["coordinator"];
        setSelectedRolesForModal(defaultRoles);
        alert(`✓ Staff profile '${newStaff.name}' created! Now assign their granted roles below so they can switch roles upon logging in.`);
      }

      setStaffFormData({
        name: "",
        email: "",
        password: "",
        role: "coordinator",
        department: "Computer Science",
        phone: ""
      });
      setEditingStaffId(null);
      setStaffSearchQuery("");
      await mockDB.syncFromCloud(true);
      fetchData();
    } catch (err: any) {
      alert("Error saving staff user: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCreateOrUpdateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordName.trim()) {
      alert("Please enter the Coordinator's Name.");
      return;
    }
    if (!coordEmail.trim()) {
      alert("Please enter the Coordinator's Email Address.");
      return;
    }

    setIsCloudSyncing(true);
    try {
      if (editingCoordinatorId) {
        const match = users.find(u => u.id === editingCoordinatorId);
        if (match) {
          const updated: DBUser = {
            ...match,
            name: coordName.trim(),
            email: coordEmail.trim().toLowerCase(),
            password: coordPasscode.trim() || match.password || "",
            role: "coordinator",
            symposiumId: match.symposiumId || activeSymposium?.id || "integra-2026"
          };
          await mockDB.updateUserAsync(updated);
          alert("✓ Event Coordinator profile updated successfully in Cloud Firestore!");
        }
      } else {
        const newCoordId = `coord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newCoord: DBUser = {
          id: newCoordId,
          name: coordName.trim(),
          email: coordEmail.trim().toLowerCase(),
          password: coordPasscode.trim() || "",
          role: "coordinator",
          symposiumId: activeSymposium?.id || "integra-2026",
          department: "Computer Science"
        };
        await mockDB.addUserAsync(newCoord);
        alert("✓ New Event Coordinator registered successfully in Cloud Firestore!");
      }

      setCoordName("");
      setCoordEmail("");
      setCoordPasscode("");
      setEditingCoordinatorId(null);
      setCoordSearchQuery("");
      await mockDB.syncFromCloud(true);
      fetchData();
    } catch (err: any) {
      alert("Error saving coordinator: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteCoordinator = async (id: string) => {
    if (confirm("Are you sure you want to delete this coordinator? They will be removed from all assigned missions.")) {
      setIsCloudSyncing(true);
      try {
        const coordUser = users.find(u => u.id === id);
        if (coordUser) {
          const allMissions = mockDB.getMissions();
          for (const m of allMissions) {
            if (m.coordinator === coordUser.name) {
              await mockDB.updateMissionAsync({
                ...m,
                coordinator: "Unassigned"
              });
            }
          }
        }
        await mockDB.deleteUserAsync(id);
        fetchData();
        alert("Coordinator deleted from Cloud Firestore.");
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleCreateOrUpdateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName.trim()) {
      alert("Please enter the Judge's Name.");
      return;
    }
    if (!judgeEmail.trim()) {
      alert("Please enter the Judge's Email Address.");
      return;
    }

    setIsCloudSyncing(true);
    try {
      if (editingJudgeId) {
        const match = users.find(u => u.id === editingJudgeId);
        if (match) {
          const updated: DBUser = {
            ...match,
            name: judgeName.trim(),
            email: judgeEmail.trim().toLowerCase(),
            password: judgePasscode.trim() || match.password || "",
            role: "judge",
            symposiumId: match.symposiumId || activeSymposium?.id || "integra-2026"
          };
          await mockDB.updateUserAsync(updated);
          alert("✓ Mission Judge profile updated successfully in Cloud Firestore!");
        }
      } else {
        const newJudgeId = `judge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newJudge: DBUser = {
          id: newJudgeId,
          name: judgeName.trim(),
          email: judgeEmail.trim().toLowerCase(),
          password: judgePasscode.trim() || "",
          role: "judge",
          symposiumId: activeSymposium?.id || "integra-2026",
          department: "Computer Science"
        };
        await mockDB.addUserAsync(newJudge);
        alert("✓ New Mission Judge registered successfully in Cloud Firestore!");
      }

      setJudgeName("");
      setJudgeEmail("");
      setJudgePasscode("");
      setEditingJudgeId(null);
      setJudgeSearchQuery("");
      await mockDB.syncFromCloud(true);
      fetchData();
    } catch (err: any) {
      alert("Error saving judge: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteJudge = async (id: string) => {
    if (confirm("Are you sure you want to delete this judge? They will be removed from all assigned missions.")) {
      setIsCloudSyncing(true);
      try {
        const allMissions = mockDB.getMissions();
        for (const m of allMissions) {
          if (m.assignedJudgeId === id) {
            await mockDB.updateMissionAsync({
              ...m,
              assignedJudgeId: undefined,
              assignedJudgeName: undefined
            });
          }
        }
        await mockDB.deleteUserAsync(id);
        fetchData();
        alert("Judge deleted from Cloud Firestore.");
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  // Volunteer Management Handlers
  const handleOpenAddVolunteer = () => {
    setVolFormData({
      id: undefined,
      name: "",
      email: "",
      phone: "+91 ",
      department: "Computer Science",
      password: "volunteer",
      volunteerDuty: {
        station: "Gate Entry",
        venueName: "Campus Main Gate Entry",
        shift: "Full Day",
        status: "Active",
        notes: ""
      }
    });
    setVolunteerModalOpen(true);
  };

  const handleOpenEditVolunteer = (vol: DBUser) => {
    setVolFormData({
      ...vol,
      password: "", // Blank so admin can set new password or leave blank to preserve current password
      volunteerDuty: vol.volunteerDuty || {
        station: "Gate Entry",
        venueName: "Campus Main Gate Entry",
        shift: "Full Day",
        status: "Active",
        notes: ""
      }
    });
    setVolunteerModalOpen(true);
  };

  const handleSaveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateFullName(volFormData.name || "");
    if (!nameVal.valid) {
      alert(nameVal.error);
      return;
    }
    const emailVal = validateEmail(volFormData.email || "");
    if (!emailVal.valid) {
      alert(emailVal.error);
      return;
    }
    if (volFormData.department) {
      const deptVal = validateDepartment(volFormData.department);
      if (!deptVal.valid) {
        alert(deptVal.error);
        return;
      }
    }

    setIsCloudSyncing(true);
    try {
      let passToSave = volFormData.password?.trim();
      if (!passToSave && volFormData.id) {
        const existingVol = volunteers.find(v => v.id === volFormData.id) || users.find(u => u.id === volFormData.id);
        passToSave = existingVol?.password || "volunteer123";
      } else if (!passToSave) {
        passToSave = "volunteer123";
      }

      const volPayload = {
        ...volFormData,
        password: passToSave,
        symposiumId: volFormData.symposiumId || activeSymposium?.id || "integra-2026"
      };
      await mockDB.saveVolunteerAsync(volPayload, currentUser?.name || "Admin Office");
      await mockDB.syncFromCloud(true);
      setVolunteerModalOpen(false);
      fetchData();
      alert(`✓ Volunteer profile for ${volFormData.name} saved successfully in Cloud Firestore!`);
    } catch (err: any) {
      alert("Error saving volunteer: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteVolunteer = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove volunteer ${name} from Cloud Firestore?`)) {
      setIsCloudSyncing(true);
      try {
        await mockDB.deleteVolunteerAsync(id, currentUser?.name || "Admin Office");
        await mockDB.syncFromCloud(true);
        fetchData();
        alert(`Volunteer ${name} removed from Cloud Firestore.`);
      } catch (err: any) {
        alert("Error removing volunteer: " + (err.message || err));
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleQuickAssignStation = (volId: string, station: VolunteerDuty["station"], venueOrEventName?: string, eventId?: string) => {
    const vol = volunteers.find(v => v.id === volId);
    if (!vol) return;
    const duty: VolunteerDuty = {
      ...vol.volunteerDuty,
      station,
      venueName: venueOrEventName || (station === "Gate Entry" ? "Campus Main Gate Entry" : station === "Food Counter" ? "Dining Hall Counter" : "Main Desk"),
      eventName: eventId ? venueOrEventName : undefined,
      eventId: eventId,
      shift: vol.volunteerDuty?.shift || "Full Day",
      status: "Active"
    };
    mockDB.assignVolunteerDuty(volId, duty, "Admin Office");
    fetchData();
  };

  const handleExportVolunteersCSV = (isExcel: boolean = false) => {
    const headers = "VolunteerID,Name,Email,Mobile,Department,Station,EventVenue,Shift,Status,AssignedBy,Notes\n";
    const rows = filteredVolunteers.map(v => 
      `"${v.id}","${v.name}","${v.email}","${v.phone || ""}","${v.department || ""}","${v.volunteerDuty?.station || "Unassigned"}","${v.volunteerDuty?.venueName || v.volunteerDuty?.eventName || ""}","${v.volunteerDuty?.shift || "Full Day"}","${v.volunteerDuty?.status || "Active"}","${v.volunteerDuty?.assignedBy || "Admin"}","${(v.volunteerDuty?.notes || "").replace(/"/g, '""')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSymposium?.id || "integra"}_volunteers_roster.csv`;
    link.click();
  };

  const handleUpdatePassword = async (userId: string, newPass: string) => {
    if (!newPass.trim()) return;
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      setIsCloudSyncing(true);
      try {
        await mockDB.updateUserPasswordAsync(userId, newPass.trim(), currentUser?.name || "Administrator");

        // If stall operator, also sync the stall entity password
        if (targetUser.role === "stall_operator" || targetUser.assignedStallId) {
          const allStalls = mockDB.getRefreshmentStalls();
          const stall = allStalls.find(s => s.id === targetUser.assignedStallId || s.assignedOperatorId === targetUser.id || s.operatorUsername?.toLowerCase() === targetUser.email.toLowerCase());
          if (stall) {
            await mockDB.updateRefreshmentStallAsync({
              ...stall,
              operatorPassword: newPass.trim()
            }, currentUser?.name || "Admin");
          }
        }

        await mockDB.syncFromCloud(true);
        fetchData();
        setEditingUserId(null);
        setNewUserPassword("");
        alert(`✓ Passcode for ${targetUser.name} (${targetUser.role}) successfully synchronized to Cloud Firestore!`);
      } catch (err: any) {
        alert("Error updating passcode in Cloud Firestore: " + (err.message || err));
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCloudSyncing(true);
    try {
      const updated: any = {
        id: "sys-settings",
        eventTitle: sysTitle.trim(),
        eventYear: sysYear.trim(),
        eventDateText: sysDateText.trim(),
        countdownTarget: sysTarget.trim(),
        organizerDept: sysDept.trim(),
        hostCollege: sysCollege.trim(),
        hostLocation: sysLocation.trim(),
        tagline: sysTagline.trim(),
        feedbackEnabled: sysFeedbackEnabled,
        scoreboardEnabled: sysScoreboardEnabled,
        maxEventsSelection: Number(sysMaxEventsSelection) || 3,
        heroDescription: sysHeroDescription.trim(),
        aboutText: sysAboutText.trim(),
        contactEmail: sysContactEmail.trim(),
        contactPhone: sysContactPhone.trim(),
        mapCoordinates: sysMapCoordinates.trim()
      };

      mockDB.updateSettings(updated);
      await firebaseService.saveSettings(updated);

      if (activeSymposium) {
        const updatedSym = {
          ...activeSymposium,
          name: sysTitle.trim() || activeSymposium.name,
          year: sysYear.trim() || activeSymposium.year,
          symposiumDate: sysDateText.trim() || activeSymposium.symposiumDate,
          venue: sysCollege.trim() || activeSymposium.venue,
          tagline: sysTagline.trim() || activeSymposium.tagline,
          description: sysHeroDescription.trim() || activeSymposium.description,
          maxEventsPerParticipant: Number(sysMaxEventsSelection) || 3
        };
        mockDB.updateSymposium(updatedSym);
        await firebaseService.saveSymposium(updatedSym);
      }

      await mockDB.syncFromCloud(true);
      fetchData(true);
      alert("✓ Global System Settings saved successfully! Synchronized to Cloud Firestore.");
    } catch (err: any) {
      alert(err?.message || "Failed to save system settings.");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Gallery Management Handlers
  const handleCreateGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    const photoToSave = newGalPhotoData.trim() || newGalUrl.trim();
    if (!photoToSave) {
      alert("Please select and upload an image file first.");
      return;
    }
    mockDB.addGalleryItem({
      id: `gal-${Date.now()}`,
      url: photoToSave,
      tag: newGalTag.trim() || "INTEGRA MEMORY"
    });
    setNewGalPhotoData("");
    setNewGalFileName("");
    setNewGalUrl("");
    setNewGalTag("");
    fetchData();
    alert("New gallery photo uploaded & registered successfully!");
  };

  const handleDeleteGalleryItem = (id: string) => {
    if (confirm("Are you sure you want to delete this gallery photo?")) {
      mockDB.deleteGalleryItem(id);
      fetchData();
    }
  };

  // FAQ Management Handlers
  const handleCreateOrUpdateFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) return;

    if (editingFAQId) {
      mockDB.updateFAQItem({
        id: editingFAQId,
        q: newFAQQuestion.trim(),
        a: newFAQAnswer.trim()
      });
      setEditingFAQId(null);
      alert("FAQ item updated successfully!");
    } else {
      mockDB.addFAQItem({
        id: `faq-${Date.now()}`,
        q: newFAQQuestion.trim(),
        a: newFAQAnswer.trim()
      });
      alert("New FAQ item compiled successfully!");
    }
    setNewFAQQuestion("");
    setNewFAQAnswer("");
    fetchData();
  };

  const handleDeleteFAQ = (id: string) => {
    if (confirm("Are you sure you want to delete this FAQ item?")) {
      mockDB.deleteFAQItem(id);
      fetchData();
    }
  };

  // Feedback Questions Handlers
  const handleAddFeedbackQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    const sys = mockDB.getSettings();
    const updatedQuestions = [...(sys.feedbackQuestions || []), newQuestionText.trim()];
    
    mockDB.updateSettings({
      ...sys,
      feedbackQuestions: updatedQuestions
    });
    
    setNewQuestionText("");
    fetchData();
    alert("New feedback question added successfully!");
  };

  const handleRemoveFeedbackQuestion = (idxToRemove: number) => {
    if (confirm("Are you sure you want to remove this feedback question?")) {
      const sys = mockDB.getSettings();
      const updatedQuestions = (sys.feedbackQuestions || []).filter((_, idx) => idx !== idxToRemove);
      
      mockDB.updateSettings({
        ...sys,
        feedbackQuestions: updatedQuestions
      });
      
      fetchData();
    }
  };

  // Manage Colleges State
  const [colleges, setColleges] = useState<College[]>([]);
  const [colName, setColName] = useState("");
  const [colCode, setColCode] = useState("");
  const [colPoints, setColPoints] = useState(0);
  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const initialSettingsLoadedRef = useRef(false);

  const handleCloudRefresh = async () => {
    setIsCloudSyncing(true);
    try {
      await mockDB.syncFromCloud(true);
      fetchData(false);
    } finally {
      setTimeout(() => setIsCloudSyncing(false), 400);
    }
  };

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    setCurrentUser(curr);
    if (!curr || (curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
    }
    fetchData(true);

    // Real-time Cloud Sync on mount
    mockDB.syncFromCloud().then(() => {
      fetchData(false);
    });

    // Auto-sync when tab receives focus or every 6 seconds in background
    const syncCloudData = () => {
      mockDB.syncFromCloud().then(() => {
        fetchData(false);
      });
    };
    window.addEventListener("focus", syncCloudData);
    const syncTimer = setInterval(syncCloudData, 6000);

    return () => {
      window.removeEventListener("focus", syncCloudData);
      clearInterval(syncTimer);
    };
  }, []);

  const fetchData = (forceSettingsReload: boolean = false) => {
    setSymposiums(mockDB.getSymposiums());
    const active = mockDB.getActiveSymposium();
    setActiveSymposium(active);
    let allActiveUsers = mockDB.getUsers(active.id);
    if (allActiveUsers.filter(u => u.role === "student").length === 0) {
      const allRaw = mockDB.getAllUsersRaw();
      if (allRaw.filter(u => u.role === "student").length > 0) {
        allActiveUsers = allRaw;
      }
    }
    setUsers(allActiveUsers);
    setMissions(mockDB.getMissions(active.id));
    setAnnouncements(mockDB.getAnnouncements(active.id));
    setColleges(mockDB.getColleges());
    setTeams(mockDB.getTeams(active.id));
    setScores(mockDB.getScores(active.id));
    setActivityLogs(mockDB.getActivityLogs(active.id));
    setVolunteers(mockDB.getVolunteers(active.id));
    setCertificates(mockDB.getCertificates(active.id));
    setRefreshmentStalls(mockDB.getRefreshmentStalls(active.id));
    setRefreshmentTxns(mockDB.getRefreshmentTransactions(active.id));
    setRefreshmentOverview(mockDB.getRefreshmentOverview(active.id));
    setRefreshmentAllowanceInput(active.refreshmentAllowance || 20);
    
    // Load Settings form values ONLY on initial load or explicit reload (prevents overwriting user inputs while editing)
    if (!initialSettingsLoadedRef.current || forceSettingsReload) {
      const sys = mockDB.getSettings();
      setSysTitle(sys.eventTitle || active.name || "");
      setSysYear(sys.eventYear || active.year || "");
      setSysDateText(sys.eventDateText || active.symposiumDate || "");
      setSysTarget(sys.countdownTarget || "");
      setSysDept(sys.organizerDept || "");
      setSysCollege(sys.hostCollege || active.venue || "");
      setSysLocation(sys.hostLocation || "");
      setSysTagline(sys.tagline || active.tagline || "");
      setSysFeedbackEnabled(sys.feedbackEnabled || false);
      setSysScoreboardEnabled(sys.scoreboardEnabled !== false);
      setSysMaxMissionsSelection(sys.maxEventsSelection || active.maxEventsPerParticipant || 3);
      setSysHeroDescription(sys.heroDescription || active.description || "");
      setSysAboutText(sys.aboutText || "");
      setSysContactEmail(sys.contactEmail || active.contactEmail || "");
      setSysContactPhone(sys.contactPhone || active.contactPhone || "");
      setSysMapCoordinates(sys.mapCoordinates || "");
      setSysFeedbackQuestions(sys.feedbackQuestions || []);
      setCertCollegeName(sys.collegeName || "ABC ENGINEERING COLLEGE");
      setCertCollegeTagline(sys.collegeTagline || "Excellence Through Innovation");
      setCertCollegeLogoUrl(sys.collegeLogoUrl || "/college-logo.png");
      setCertDeptName(sys.deptName || sys.organizerDept || "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING");
      setCertDeptTagline(sys.deptTagline || "Innovate • Code • Elevate");
      setCertDeptLogoUrl(sys.deptLogoUrl || "/dept-logo.png");
      setCertCoordinatorName(sys.eventCoordinatorName || "Prof. Event Coordinator");
      setCertHodName(sys.hodName || "Dr. Head of Department");
      setCertPrincipalName(sys.principalName || "Rev. Dr. Principal");
      initialSettingsLoadedRef.current = true;
    }

    setGalleryItems(mockDB.getGallery());
    setFaqItems(mockDB.getFAQs());
    setFeedbacks(mockDB.getFeedbacks());
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  // Switch Active Symposium
  const handleSwitchSymposium = (id: string) => {
    mockDB.setActiveSymposiumId(id);
    fetchData(true);
  };

  // Toggle Registration Open/Close
  const handleToggleRegistrationOpen = () => {
    if (!activeSymposium) return;
    const updated = { ...activeSymposium, registrationOpen: !activeSymposium.registrationOpen };
    mockDB.updateSymposium(updated);
    fetchData();
  };

  // Open Edit Symposium Modal
  const handleOpenEditSymposium = (sym: Symposium) => {
    setEditSymData({ ...sym });
    setEditSymposiumModalOpen(true);
  };

  // Save Edited Symposium
  const handleSaveEditSymposium = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSymData) return;

    try {
      mockDB.updateSymposium(editSymData);
      setEditSymposiumModalOpen(false);
      fetchData();
      alert(`Symposium '${editSymData.name} ${editSymData.year}' updated successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to update symposium.");
    }
  };

  // Toggle Publish Results
  const handleTogglePublishResults = () => {
    if (!activeSymposium) return;
    const nextState = !activeSymposium.resultsPublished;
    mockDB.publishResults(activeSymposium.id, nextState);
    fetchData();
    alert(nextState ? "Results published to all Student Portals!" : "Results unpublished.");
  };

  // Unlock Scorecard
  const handleUnlockScore = (scoreId: string) => {
    const curr = mockDB.getCurrentUser();
    mockDB.unlockScore(scoreId, curr?.name || "Admin");
    fetchData();
    alert("Scorecard unlocked. Judge can now edit and re-submit.");
  };

  // Create New Symposium Edition
  const handleCreateNewSymposium = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymData.id.trim() || !newSymData.name.trim() || !newSymData.year.trim()) return;

    try {
      mockDB.createSymposium({
        id: newSymData.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: newSymData.name.trim(),
        theme: newSymData.theme.trim(),
        tagline: newSymData.tagline.trim(),
        year: newSymData.year.trim(),
        academicYear: newSymData.academicYear.trim(),
        symposiumDate: newSymData.symposiumDate.trim(),
        venue: newSymData.venue.trim(),
        regFee: Number(newSymData.regFee) || 200,
        registrationOpen: false,
        contactEmail: "integra@donbosco.ac.in",
        contactPhone: "+91 98765 43210",
        maxParticipants: 500,
        maxEventsPerParticipant: 3,
        status: "upcoming",
        venues: [],
        scheduleSlots: [
          { id: "slot-1", name: "SLOT 1", startTime: "10:00 AM", endTime: "10:50 AM" },
          { id: "slot-2", name: "SLOT 2", startTime: "11:00 AM", endTime: "11:50 AM" },
          { id: "slot-3", name: "SLOT 3", startTime: "12:00 PM", endTime: "12:50 PM" },
          { id: "slot-lunch", name: "LUNCH", startTime: "01:00 PM", endTime: "02:00 PM" },
          { id: "slot-cultural", name: "CULTURAL", startTime: "02:00 PM", endTime: "03:15 PM" },
          { id: "slot-valedictory", name: "VALEDICTORY", startTime: "03:15 PM", endTime: "03:50 PM" }
        ]
      });

      mockDB.setActiveSymposiumId(newSymData.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      setNewSymposiumModalOpen(false);
      fetchData();
      alert(`New symposium edition '${newSymData.name} ${newSymData.year}' created and activated!`);
    } catch (err: any) {
      alert(err.message || "Failed to create symposium.");
    }
  };

  // Clone Previous Symposium
  const handleCloneSymposium = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneSourceId || !newSymData.id.trim() || !newSymData.year.trim()) return;

    try {
      const cloned = mockDB.cloneSymposium(cloneSourceId, {
        id: newSymData.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: newSymData.name.trim(),
        theme: newSymData.theme.trim(),
        tagline: newSymData.tagline.trim(),
        year: newSymData.year.trim(),
        academicYear: newSymData.academicYear.trim(),
        symposiumDate: newSymData.symposiumDate.trim(),
        venue: newSymData.venue.trim(),
        regFee: Number(newSymData.regFee) || 200
      });

      mockDB.setActiveSymposiumId(cloned.id);
      setCloneModalOpen(false);
      fetchData();
      alert(`Symposium successfully cloned into '${cloned.name} ${cloned.year}'! Events and rules are preserved with fresh attendee/score tables.`);
    } catch (err: any) {
      alert(err.message || "Failed to clone symposium.");
    }
  };

  // Offline Payment Verification Action
  const handleOpenVerifyModal = (student: DBUser) => {
    setVerifyModalStudent(student);
    setVerifyPaymentMode("Cash");
    setVerifyRemarks("Verified at Registration Desk");
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalStudent) return;

    const curr = mockDB.getCurrentUser();
    const adminId = curr ? `${curr.name} (${curr.id})` : "Admin Desk";
    const studentToVerify = verifyModalStudent;
    setVerifyModalStudent(null);

    try {
      await mockDB.verifyPayment(studentToVerify.id, adminId, verifyRemarks, verifyPaymentMode);
      fetchData();

      // Send Hall Ticket email to participant after payment verified
      if (studentToVerify.email) {
        const missionsList = mockDB.getMissions();
        const registeredEvents = missionsList
          .filter(m => studentToVerify.registeredEvents?.includes(m.id))
          .map(m => ({ name: m.name, venue: m.venue, duration: m.duration }));

        fetch("/api/send-hall-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: studentToVerify.name,
            email: studentToVerify.email,
            participantId: studentToVerify.participantId || "",
            registrationId: studentToVerify.registrationId || "",
            college: studentToVerify.college || "",
            department: studentToVerify.department || "",
            year: studentToVerify.year || "",
            phone: studentToVerify.phone || "",
            registeredEvents
          })
        }).catch(() => console.warn("Hall Ticket email network error"));
      }

      alert(`Payment verified for ${studentToVerify.name}! Credentials and Food Token unlocked.`);
    } catch (err: any) {
      alert(err?.message || "Failed to verify payment");
    }
  };

  // Offline Payment Rejection Action
  const handleOpenRejectModal = (student: DBUser) => {
    setRejectModalStudent(student);
    setRejectReason("Registration entry fee not received at desk.");
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalStudent) return;

    const curr = mockDB.getCurrentUser();
    const adminId = curr ? `${curr.name} (${curr.id})` : "Admin Desk";
    const studentToReject = rejectModalStudent;
    setRejectModalStudent(null);

    try {
      await mockDB.rejectPayment(studentToReject.id, adminId, rejectReason);
      fetchData();
      alert(`Payment rejected for ${studentToReject.name}.`);
    } catch (err: any) {
      alert(err?.message || "Failed to reject payment");
    }
  };

  const handleClearAllRegistrations = async () => {
    if (confirm("⚠️ WARNING: This will permanently DELETE all student registrations, verified payments, certificates, scores, and reset college points to 0 both locally and in Firebase Cloud Firestore. This action is irreversible. Do you want to proceed?")) {
      await mockDB.clearAllRegistrations();
      fetchData();
      alert("All student registrations and related data cleared successfully from database and cloud!");
    }
  };

  const handleDeleteStudent = async (student: DBUser) => {
    if (confirm(`Are you sure you want to permanently delete registration for "${student.name}" (${student.participantId || student.id})?`)) {
      // Millisecond 0: Optimistic instant removal from memory & React state
      mockDB.deleteStudent(student);
      fetchData();

      // Background cloud purge
      setIsCloudSyncing(true);
      try {
        await mockDB.syncFromCloud(true);
        fetchData();
      } catch (err: any) {
        console.error("Background student deletion cloud error:", err);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    mockDB.addAnnouncement(annTitle, annContent, annCategory);
    setAnnTitle("");
    setAnnContent("");
    fetchData();
    alert("Holographic announcement broadcasted successfully!");
  };

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert("Please select a candidate recipient.");
      return;
    }
    if (!selectedMissionId) {
      alert("Please select the assigned competition / mission event for this Winner / Runner-up certificate.");
      return;
    }

    const student = users.find(u => u.id === selectedStudentId);
    if (!student) return;

    const mission = missions.find(m => m.id === selectedMissionId);
    if (!mission) {
      alert("Please choose a valid event.");
      return;
    }

    mockDB.issueCertificate({
      type: certType,
      recipientName: student.name,
      recipientId: student.participantId || student.id,
      collegeName: student.college,
      missionName: mission.name,
      awardText: certPrizeDetails.trim() || (certType === "Winner" ? "1st Place Winner" : "2nd Place Runner-up")
    });

    // Award bonus Points to student for certificate
    const xpBonus = certType === "Winner" ? 250 : 150;
    student.xp = (student.xp || 0) + xpBonus;
    student.achievements = [...(student.achievements || []), `Earned ${certType} in ${mission.name}`];
    mockDB.updateUser(student);

    alert(`✓ Successfully issued ${certType} (Event: ${mission.name}) Certificate to ${student.name}!`);
    setSelectedStudentId("");
    setSelectedMissionId("");
    setCertPrizeDetails("");
    fetchData();
  };

  const handleAdminCameraScan = (decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;
    let target = decodedText.trim();
    try {
      const parsed = JSON.parse(target);
      target = parsed.participantId || parsed.registrationId || parsed.id || target;
    } catch {}

    const match = users.find(u => 
      u.role === "student" && 
      (u.id === target || u.participantId?.toLowerCase() === target.toLowerCase() || u.registrationId?.toLowerCase() === target.toLowerCase())
    );

    if (!match) {
      setAdminScanMessage({
        success: false,
        text: `No participant found matching scanned QR identifier: ${target}`
      });
      return;
    }

    setAdminScanMessage({
      success: true,
      text: `Found ${match.name} (${match.participantId || match.id}). Opening verification card...`
    });
    setVerifyModalStudent(match);
  };

  const handleIssueBulkParticipation = () => {
    const verified = users.filter(u => u.role === "student" && u.paymentStatus === "Verified");
    if (verified.length === 0) {
      alert("No verified participants found in the system cache to issue participation certificates.");
      return;
    }

    const confirmMsg = `⚡ CONFIRM BULK ISSUANCE:\n\nAre you sure you want to generate and release official Participation Certificates for all ${verified.length} verified participants in ${activeSymposium?.name || "INTEGRA"} ${activeSymposium?.year || "2026"}?\n\nThis will make certificates instantly verifiable and downloadable in their student dashboards.`;
    
    if (confirm(confirmMsg)) {
      setBulkIssuing(true);
      setTimeout(() => {
        const res = mockDB.issueBulkParticipationCertificates(activeSymposium?.id);
        setBulkIssuing(false);
        fetchData();
        alert(`🎉 Bulk Issuance Complete!\n\n• Total Verified Participants: ${res.totalVerified}\n• Newly Generated Certificates: ${res.newlyIssued}\n• Previously Active: ${res.alreadyIssued}\n\nAll verified participants can now access their Participation Certificates.`);
      }, 600);
    }
  };

  const handleDeleteCertificate = (certId: string) => {
    if (confirm("Are you sure you want to revoke and delete this certificate from the ledger? This action cannot be undone.")) {
      mockDB.deleteCertificate(certId);
      fetchData();
      alert("Certificate revoked and deleted successfully.");
    }
  };

  const handleExportCertificatesCSV = (isExcel: boolean = false) => {
    const activeCerts = certificates;
    const headers = "CertificateID,Type,RecipientName,RecipientID,College,EventName,Hash,DateGenerated";
    const rows = activeCerts.map(c => 
      `"${c.id}","${c.type}","${(c.recipientName||"").replace(/"/g, '""')}","${c.recipientId}","${(c.collegeName || "").replace(/"/g, '""')}","${(c.missionName || "").replace(/"/g, '""')}","${c.hash}","${c.dateGenerated}"`
    ).join("\n");

    downloadExportFile(`${activeSymposium?.id || "integra"}_issued_certificates_ledger`, headers, rows, isExcel);
  };

  const handleExportCSV = (isExcel: boolean = false) => {
    const students = users.filter(u => u.role === "student");
    const headers = "ParticipantID,RegistrationNo,Name,Email,Mobile,Gender,College,Department,Year,RegisteredMissions,PaymentStatus,Points";
    const rows = students.map(s => {
      const pId = s.participantId || s.id;
      const regId = s.registrationId || "";
      const missionsStr = (s.registeredEvents || []).join("; ");
      return `"${pId}","${regId}","${(s.name||"").replace(/"/g, '""')}","${(s.email||"").replace(/"/g, '""')}","${s.phone || ""}","${s.gender || ""}","${(s.college||"").replace(/"/g, '""')}","${(s.department||"").replace(/"/g, '""')}","${s.year || ""}","${missionsStr.replace(/"/g, '""')}","${s.paymentStatus}",${s.xp || 0}`;
    }).join("\n");

    downloadExportFile("integra_2026_attendee_roster", headers, rows, isExcel);
  };

  const handleExportFoodCSV = (isExcel: boolean = false) => {
    const students = users.filter(u => u.role === "student" && u.foodStatus?.served);
    const headers = "ParticipantID,RegistrationNo,Name,Email,College,Department,MealServedTime,LoggedBy";
    const rows = students.map(s => 
      `"${s.participantId || s.id}","${s.registrationId || ""}","${(s.name||"").replace(/"/g, '""')}","${s.email}","${(s.college||"").replace(/"/g, '""')}","${(s.department||"").replace(/"/g, '""')}","${s.foodStatus?.servedTime || ""}","${s.foodStatus?.loggedBy || ""}"`
    ).join("\n");

    downloadExportFile("integra_2026_food_distribution_log", headers, rows, isExcel);
  };

  const handleExportScoreboardCSV = (isExcel: boolean = false) => {
    const students = users.filter(u => u.role === "student");
    const headers = "ParticipantID,Name,College,Department,Score_Points,Achievements,Badges";
    const rows = students.map(s => 
      `"${s.participantId || s.id}","${(s.name||"").replace(/"/g, '""')}","${(s.college||"").replace(/"/g, '""')}","${(s.department||"").replace(/"/g, '""')}",${s.xp || 0},"${(s.achievements?.join("; ") || "").replace(/"/g, '""')}","${(s.badges?.join("; ") || "").replace(/"/g, '""')}"`
    ).join("\n");

    downloadExportFile("integra_2026_scoreboard_rankings", headers, rows, isExcel);
  };

  const handleExportFeedbackCSV = (isExcel: boolean = false) => {
    const headers = "Timestamp,CandidateName,College,Comment,OverallRatingLegacy,QuestionsBreakdown\n";
    const rows = feedbacks.map(fb => {
      const legacyRating = fb.rating !== undefined ? fb.rating : "";
      const breakdown = fb.ratings 
        ? Object.entries(fb.ratings).map(([q, r]) => `${q}: ${r}/5`).join(" | ")
        : "";
      return `"${new Date(fb.timestamp).toLocaleString()}","${fb.studentName}","${fb.college}","${fb.comment.replace(/"/g, '""')}","${legacyRating}","${breakdown}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "integra_2026_attendee_feedbacks.csv";
    link.click();
  };

  const handleExportPaymentsCSV = (isExcel: boolean = false) => {
    const headers = "ParticipantID,RegistrationNo,Name,Email,Mobile,College,Department,Year,PaymentStatus,PaymentMode,VerifiedBy,VerifiedAt,Remarks,FoodToken\n";
    const allFoodTokens = mockDB.getFoodTokens();
    const rows = filteredPaymentStudents.map(s => {
      const ft = allFoodTokens.find(f => f.participantId === s.participantId || f.participantId === s.id);
      return `"${s.participantId || s.id}","${s.registrationId || ""}","${s.name}","${s.email}","${s.phone || ""}","${s.college}","${s.department}","${s.year}","${s.paymentStatus}","${s.paymentDetails?.mode || ""}","${s.paymentDetails?.verifiedBy || ""}","${s.paymentDetails?.date || ""}","${(s.paymentDetails?.remarks || "").replace(/"/g, '""')}","${ft?.tokenNumber || ""}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSymposium?.id || "integra"}_payments_report.csv`;
    link.click();
  };

  // ── Refreshment System Admin Handlers ─────────────────────────────────────
  const handleOpenNewStall = () => {
    const newStallId = `stall-${Date.now()}`;
    setEditingStall({
      id: newStallId,
      name: "",
      location: "",
      contactPerson: "",
      contactPhone: "",
      operatorUsername: `stall.${newStallId.slice(-6)}@integra.in`,
      operatorPassword: `stall${Math.floor(100 + Math.random() * 900)}`,
      status: "ACTIVE",
      pricingMode: "ITEM_BASED",
      items: [
        { id: `item-1`, name: "Tea / Coffee", price: 10, category: "BEVERAGE", available: true },
        { id: `item-2`, name: "Snack / Puff", price: 10, category: "SNACK", available: true }
      ]
    });
    setStallModalOpen(true);
  };

  const handleOpenEditStall = (stall: RefreshmentStall) => {
    setEditingStall(JSON.parse(JSON.stringify(stall)));
    setStallModalOpen(true);
  };

  const handleSaveStall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStall || !editingStall.name?.trim() || !editingStall.location?.trim()) {
      alert("Please provide stall name and location.");
      return;
    }

    setIsCloudSyncing(true);
    try {
      const adminName = currentUser ? `${currentUser.name} (${currentUser.role})` : "Admin Desk";
      const existing = refreshmentStalls.find(s => s.id === editingStall.id);

      const opUser = editingStall.operatorUsername?.trim() || editingStall.operatorEmail?.trim() || `stall.${editingStall.id || Date.now()}@integra.in`;
      const opPass = editingStall.operatorPassword?.trim() || "stall123";

      if (existing) {
        await mockDB.updateRefreshmentStallAsync({
          ...editingStall,
          operatorUsername: opUser,
          operatorEmail: opUser,
          operatorPassword: opPass
        } as RefreshmentStall, adminName);
        alert(`✓ Stall '${editingStall.name}' and operator login (${opUser}) updated successfully in Cloud Firestore!`);
      } else {
        const stallId = editingStall.id || `stall-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await mockDB.addRefreshmentStallAsync({
          id: stallId,
          symposiumId: activeSymposium?.id || "integra-2026",
          name: editingStall.name.trim(),
          location: editingStall.location.trim(),
          contactPerson: editingStall.contactPerson?.trim() || "Stall Coordinator",
          contactPhone: editingStall.contactPhone?.trim() || "",
          operatorUsername: opUser,
          operatorEmail: opUser,
          operatorPassword: opPass,
          status: editingStall.status || "ACTIVE",
          pricingMode: editingStall.pricingMode || "ITEM_BASED",
          items: editingStall.items || [],
          totalClaimsCount: 0,
          totalAmountClaimed: 0
        }, adminName);
        alert(`✓ New stall '${editingStall.name}' registered with operator login (${opUser}) in Cloud Firestore!`);
      }

      setStallModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error saving stall: " + (err.message || err));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteStall = async (stallId: string, stallName: string) => {
    if (confirm(`⚠️ Are you sure you want to delete stall '${stallName}' from Cloud Firestore?`)) {
      setIsCloudSyncing(true);
      try {
        const adminName = currentUser ? `${currentUser.name} (${currentUser.role})` : "Admin Desk";
        await mockDB.deleteRefreshmentStallAsync(stallId, adminName);
        fetchData();
        alert(`Stall '${stallName}' deleted from Cloud Firestore.`);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleToggleStallStatus = async (stall: RefreshmentStall) => {
    setIsCloudSyncing(true);
    try {
      const adminName = currentUser ? `${currentUser.name} (${currentUser.role})` : "Admin Desk";
      const newStatus = stall.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await mockDB.updateRefreshmentStallAsync({ ...stall, status: newStatus }, adminName);
      fetchData();
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleAddStallItem = () => {
    if (!newStallItemName.trim() || newStallItemPrice <= 0 || !editingStall) return;
    const newItem: RefreshmentItem = {
      id: `item-${Date.now()}`,
      name: newStallItemName.trim(),
      price: Number(newStallItemPrice),
      category: "SNACK",
      available: true
    };
    setEditingStall({
      ...editingStall,
      items: [...(editingStall.items || []), newItem]
    });
    setNewStallItemName("");
    setNewStallItemPrice(10);
  };

  const handleRemoveStallItem = (itemId: string) => {
    if (!editingStall) return;
    setEditingStall({
      ...editingStall,
      items: (editingStall.items || []).filter(i => i.id !== itemId)
    });
  };

  const handleOpenReverseModal = (txn: RefreshmentTransaction) => {
    setReversalTargetTxn(txn);
    setReversalReason("Mistaken punch / customer request");
    setReversalModalOpen(true);
  };

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTargetTxn) return;
    const adminName = currentUser ? `${currentUser.name} (${currentUser.role})` : "Admin Desk";
    const res = mockDB.reverseRefreshmentTransaction(reversalTargetTxn.id, reversalReason, adminName);
    setReversalModalOpen(false);
    if (res.success) {
      alert(`✓ Transaction ${reversalTargetTxn.id} successfully REVERSED. Balance restored for ${reversalTargetTxn.participantName}.`);
      fetchData();
    } else {
      alert(`Error reversing transaction: ${res.message}`);
    }
  };

  const handleConfirmBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetParticipantId.trim() || adjustAmount === 0) return;
    const adminName = currentUser ? `${currentUser.name} (${currentUser.role})` : "Admin Desk";
    const res = mockDB.adjustParticipantRefreshmentBalance(adjustTargetParticipantId.trim(), adjustAmount, adjustReason, adminName);
    setAdjustBalanceModalOpen(false);
    if (res.success) {
      alert(`✓ Refreshment balance adjusted by ₹${adjustAmount} for participant ${adjustTargetParticipantId}. New Balance: ₹${res.token?.remainingAmount ?? "Updated"}.`);
      fetchData();
    } else {
      alert(`Error adjusting balance: ${res.message}`);
    }
  };

  const handleSaveRefreshmentAllowance = () => {
    if (refreshmentAllowanceInput <= 0) {
      alert("Allowance must be greater than 0.");
      return;
    }
    if (activeSymposium) {
      mockDB.updateSymposium({ ...activeSymposium, refreshmentAllowance: Number(refreshmentAllowanceInput) });
    }
    alert(`✓ Per-Participant Refreshment Allowance updated to ₹${refreshmentAllowanceInput}.00 for ${activeSymposium?.name || "INTEGRA"} ${activeSymposium?.year || "2026"}!`);
    fetchData();
  };

  const handleExportRefreshmentCSV = (isExcel: boolean = false) => {
    const headers = "TransactionID,Date,Time,ParticipantID,ParticipantName,StallID,StallName,ItemDescription,AmountClaimed,RemainingBalance,Status,ReversedBy,ReversalReason\n";
    const rows = filteredRefreshmentTxns.map(t =>
      `"${t.id}","${t.date}","${t.time}","${t.participantId}","${t.participantName}","${t.stallId}","${t.stallName}","${(t.itemDescription || "").replace(/"/g, '""')}",${t.amount},${t.remainingBalance},"${t.status}","${t.reversedBy || ""}","${(t.reversalReason || "").replace(/"/g, '""')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSymposium?.id || "integra"}_refreshment_ledger.csv`;
    link.click();
  };

  // Helper values
  const students = users.filter(u => u.role === "student");
  const pendingStudents = students.filter(s => s.paymentStatus === "Pending");
  const verifiedStudents = students.filter(s => s.paymentStatus === "Verified");
  const rejectedStudents = students.filter(s => s.paymentStatus === "Rejected");
  const uniqueColleges = Array.from(new Set(students.map(s => s.college).filter(Boolean)));
  const totalColleges = uniqueColleges.length;

  // Filtered Refreshment Transactions
  const filteredRefreshmentTxns = refreshmentTxns.filter(t => {
    const matchesStall = stallFilter === "All" || t.stallId === stallFilter;
    const matchesStatus = txnStatusFilter === "All" || t.status === txnStatusFilter;
    const q = txnSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (t.id || "").toLowerCase().includes(q) ||
      (t.participantName || "").toLowerCase().includes(q) ||
      (t.participantId || "").toLowerCase().includes(q) ||
      (t.stallName || "").toLowerCase().includes(q) ||
      (t.itemDescription && t.itemDescription.toLowerCase().includes(q))
    );
    return matchesStall && matchesStatus && matchesQuery;
  });

  const filteredPaymentStudents = students.filter(s => {
    const matchesStatus = paymentFilterStatus === "All" || s.paymentStatus === paymentFilterStatus;
    const matchesCollege = paymentCollegeFilter === "All" || s.college === paymentCollegeFilter;
    const q = paymentSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.participantId && s.participantId.toLowerCase().includes(q)) ||
      (s.registrationId && s.registrationId.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.college && s.college.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q))
    );
    return matchesStatus && matchesCollege && matchesQuery;
  });

  const checkedInStudents = students.filter(s => s.checkInStatus?.checkedIn);

  // Filtered Students Roster
  const filteredStudents = students.filter(s => {
    let matchesStatus = true;
    if (studentFilterStatus === "Verified") matchesStatus = s.paymentStatus === "Verified";
    else if (studentFilterStatus === "Pending") matchesStatus = s.paymentStatus === "Pending";
    else if (studentFilterStatus === "CheckedIn") matchesStatus = !!s.checkInStatus?.checkedIn;

    const matchesCollege = studentCollegeFilter === "All" || s.college === studentCollegeFilter;
    const matchesEvent = studentEventFilter === "All" || (s.registeredEvents && s.registeredEvents.includes(studentEventFilter));

    const q = studentSearchQuery.trim().toLowerCase() || searchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.participantId && s.participantId.toLowerCase().includes(q)) ||
      (s.registrationId && s.registrationId.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.college && s.college.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q))
    );
    return matchesStatus && matchesCollege && matchesEvent && matchesQuery;
  });

  // Filtered Teams Roster
  const filteredTeams = teams.filter(t => {
    const matchesStatus = teamsFilterStatus === "All" || t.status === teamsFilterStatus;
    const matchesEvent = teamsEventFilter === "All" || t.eventId === teamsEventFilter;
    const q = teamsSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (t.teamName && t.teamName.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.leaderName && t.leaderName.toLowerCase().includes(q)) ||
      (t.leaderId && t.leaderId.toLowerCase().includes(q)) ||
      (t.eventName && t.eventName.toLowerCase().includes(q)) ||
      (t.members && t.members.some((m: any) => {
        const str = typeof m === "string" ? m : `${m.name || ""} ${m.studentId || m.id || ""}`;
        return str.toLowerCase().includes(q);
      }))
    );
    return matchesStatus && matchesEvent && matchesQuery;
  });

  // Filtered Scores & Results
  const filteredScores = scores.filter(sc => {
    const matchesStatus = scoresFilterStatus === "All" || (scoresFilterStatus === "Locked" ? sc.isLocked : !sc.isLocked);
    const matchesEvent = scoresEventFilter === "All" || sc.missionId === scoresEventFilter;
    const q = scoresSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (sc.studentName && sc.studentName.toLowerCase().includes(q)) ||
      (sc.collegeName && sc.collegeName.toLowerCase().includes(q)) ||
      (sc.submittedBy && sc.submittedBy.toLowerCase().includes(q)) ||
      (sc.remarks && sc.remarks.toLowerCase().includes(q)) ||
      (sc.missionId && sc.missionId.toLowerCase().includes(q))
    );
    return matchesStatus && matchesEvent && matchesQuery;
  });

  // Filtered Activity Logs
  const filteredActivityLogs = activityLogs.filter(log => {
    const matchesAction = auditActionFilter === "All" || (log.action && log.action.toUpperCase().includes(auditActionFilter.toUpperCase()));
    const q = auditSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      (log.userId && log.userId.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
    return matchesAction && matchesQuery;
  });

  // Filtered Missions / Events
  const filteredMissions = missions.filter(m => {
    const matchesCategory = eventCategoryFilter === "All" || 
      (m.category && m.category.toLowerCase().includes(eventCategoryFilter.toLowerCase())) ||
      (m.category && m.category.trim().toLowerCase() === eventCategoryFilter.trim().toLowerCase());
    const q = missionSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q)) ||
      (m.venue && m.venue.toLowerCase().includes(q)) ||
      (m.coordinator && m.coordinator.toLowerCase().includes(q)) ||
      (m.assignedJudgeName && m.assignedJudgeName.toLowerCase().includes(q)) ||
      (m.slot && m.slot.toLowerCase().includes(q))
    );
    return matchesCategory && matchesQuery;
  });

  // Filtered Coordinators & Judges (Strictly users assigned coordinator or judge role)
  const coordinatorsList = users
    .filter(u => (u.role === "coordinator" || u.role === "admin" || u.roles?.includes("coordinator") || u.roles?.includes("admin")) && u.role !== "super_admin" && u.email !== "integra@dbcyelagiri.edu.in")
    .filter((u, idx, arr) => idx === arr.findIndex(x => (x.email || x.id).toLowerCase().trim() === (u.email || u.id).toLowerCase().trim()));

  const filteredCoordinators = coordinatorsList.filter(c => {
    const q = coordSearchQuery.trim().toLowerCase();
    return !q || (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.department && c.department.toLowerCase().includes(q))
    );
  });

  const judgesList = users
    .filter(u => (u.role === "judge" || u.roles?.includes("judge")) && u.role !== "admin" && u.role !== "super_admin")
    .filter((u, idx, arr) => idx === arr.findIndex(x => (x.email || x.id).toLowerCase().trim() === (u.email || u.id).toLowerCase().trim()));

  const filteredJudges = judgesList.filter(j => {
    const q = judgeSearchQuery.trim().toLowerCase();
    return !q || (
      (j.name && j.name.toLowerCase().includes(q)) ||
      (j.email && j.email.toLowerCase().includes(q)) ||
      (j.department && j.department.toLowerCase().includes(q))
    );
  });

  // Volunteer metrics & filters
  const gateVolunteers = volunteers.filter(v => v.volunteerDuty?.station === "Gate Entry");
  const foodVolunteers = volunteers.filter(v => v.volunteerDuty?.station === "Food Counter");
  const eventVolunteers = volunteers.filter(v => v.volunteerDuty?.station === "Event Venue");
  const regVolunteers = volunteers.filter(v => v.volunteerDuty?.station === "Registration Desk");

  const filteredVolunteers = volunteers.filter(v => {
    const matchesStation = volStationFilter === "All" || v.volunteerDuty?.station === volStationFilter;
    const q = volSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q)) ||
      (v.department && v.department.toLowerCase().includes(q)) ||
      (v.volunteerDuty?.venueName && v.volunteerDuty.venueName.toLowerCase().includes(q)) ||
      (v.volunteerDuty?.eventName && v.volunteerDuty.eventName.toLowerCase().includes(q)) ||
      (v.volunteerDuty?.notes && v.volunteerDuty.notes.toLowerCase().includes(q))
    );
    return matchesStation && matchesQuery;
  });

  // Compute mock chart data based on registered missions
  const missionChartData = missions.map(m => {
    const count = students.filter(s => s.registeredEvents?.includes(m.id)).length;
    return { name: m.name, count };
  });

  if (!mounted || !currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING SECURITY CREDENTIALS...</p>
          <p className="text-slate-500 text-[10px]">Access restricted to authorized Admin & System Controllers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-purple-50000 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-blue-600 transition-colors">
                    {sysTitle || "INTEGRA"} {sysYear || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-blue-100 text-blue-900 border border-blue-300 font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    OPERATIONS ADMIN
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-700 font-mono font-semibold mt-0.5">
                  INTER-COLLEGE TECHNICAL SYMPOSIUM
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end font-mono">


            <button 
              onClick={handleCloudRefresh} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 font-bold cursor-pointer shadow-xs transition-colors"
              title="Sync with Cloud Firestore"
            >
              <RefreshCw size={14} className={isCloudSyncing ? "animate-spin text-blue-600" : ""} />
            </button>
            
            <button 
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold shadow-xs px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 min-w-0 max-w-full">
        
        {/* Navigation Sidebar (Collapsible Accordion Dropdowns + Smooth Scroll) */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 space-y-3 sm:space-y-4 min-w-0 lg:sticky lg:top-20">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200 flex flex-col items-center text-center shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-2 shadow-xs">
              <Shield className="text-blue-600" size={22} />
            </div>
            <h2 className="text-xs sm:text-sm font-heading font-extrabold text-slate-900 text-center">ADMIN CONTROL UNIT</h2>
            <span className="text-[9.5px] text-blue-700 font-mono mt-0.5 font-bold uppercase tracking-wider">LEVEL 1 HOST ACCESS</span>
          </div>

          {/* Responsive Navigation Tabs (Collapsible Accordions with Smooth Independent Scroll) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xl font-mono text-xs font-bold space-y-2.5 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-1">
            
            {/* STANDALONE SEPARATE TAB: EXECUTIVE DASHBOARD */}
            <div className="rounded-xl overflow-hidden bg-slate-900 border-2 border-blue-600 shadow-md">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`w-full p-3 text-xs font-extrabold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "dashboard" || activeTab === "overview"
                    ? "bg-blue-600 text-white shadow-inner font-black"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={17} className="text-white" />
                  <span>Dashboard</span>
                </div>
                <span className="text-[9.5px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-widest border border-white/30">
                  PRIMARY
                </span>
              </button>
            </div>

            {/* CATEGORY 1: PARTICIPANTS & STUDENTS */}
            <div className="rounded-xl overflow-hidden bg-slate-50/60 border border-sky-500/30 shadow-xs">
              <button
                type="button"
                onClick={() => toggleSidebarSection("participants")}
                className="w-full px-3 py-2.5 text-[11px] uppercase tracking-wider text-blue-900 font-extrabold flex items-center justify-between cursor-pointer hover:bg-blue-50 border border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-blue-900 font-extrabold" />
                  <span>Participants & Students</span>
                </div>
                <ChevronDown size={14} className={`text-blue-900 font-extrabold transition-transform duration-200 ${openSidebarSections.participants ? "rotate-180" : ""}`} />
              </button>

              {openSidebarSections.participants && (
                <div className="p-1.5 space-y-1 border-t border-sky-500/15 animate-in fade-in duration-150">
                  {[
                    { id: "students", fullLabel: `Participant Directory (${students.length})`, icon: <Users size={14} className="text-blue-900 font-extrabold" /> },
                    { id: "verifications", fullLabel: `Payment Desk (${pendingStudents.length})`, icon: <Check size={14} className="text-emerald-800 font-extrabold" /> },
                    { id: "teams", fullLabel: `Teams Roster (${teams.length})`, icon: <Users size={14} className="text-indigo-400" /> },
                    { id: "scoring_results", fullLabel: "Judging & Results", icon: <Award size={14} className="text-orange-500" /> },
                    { id: "scoreboard", fullLabel: "Manage Scoreboard", icon: <Award size={14} className="text-yellow-400" /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === tab.id 
                          ? "bg-sky-600/25 text-blue-900 font-bold border border-sky-500/50 shadow-inner font-bold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                      }`}
                    >
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="truncate">{tab.fullLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORY 2: STAFF & SYSTEM USERS */}
            <div className="rounded-xl overflow-hidden bg-slate-50/60 border border-purple-300 shadow-xs">
              <button
                type="button"
                onClick={() => toggleSidebarSection("staff")}
                className="w-full px-3 py-2.5 text-[11px] uppercase tracking-wider text-blue-600 font-extrabold flex items-center justify-between cursor-pointer hover:bg-indigo-50 border border-indigo-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-blue-600" />
                  <span>Staff & System Roles</span>
                </div>
                <ChevronDown size={14} className={`text-blue-600 transition-transform duration-200 ${openSidebarSections.staff ? "rotate-180" : ""}`} />
              </button>

              {openSidebarSections.staff && (
                <div className="p-1.5 space-y-1 border-t border-purple-500/15 animate-in fade-in duration-150">
                  {[
                    { id: "staff_roles", fullLabel: `Staff Users & Roles (${users.filter(u => u.role !== "student").length})`, icon: <Shield size={14} className="text-blue-600" /> },
                    { id: "coordinators", fullLabel: "Event Coordinators", icon: <Users size={14} className="text-blue-400" /> },
                    { id: "judges", fullLabel: "Judges Evaluators", icon: <Shield size={14} className="text-orange-500" /> },
                    { id: "volunteers", fullLabel: `Host Volunteers (${volunteers.length})`, icon: <UserCheck size={14} className="text-emerald-800 font-extrabold" /> },
                    { id: "passwords", fullLabel: "Password Manager", icon: <Key size={14} className="text-blue-600" /> },
                    { id: "audit_logs", fullLabel: `Activity Logs (${activityLogs.length})`, icon: <FileText size={14} className="text-slate-600" /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === tab.id 
                          ? "bg-blue-600/25 text-blue-700 border border-purple-500/50 shadow-inner font-bold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                      }`}
                    >
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="truncate">{tab.fullLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORY 3: EVENT OPERATIONS & STALLS */}
            <div className="rounded-xl overflow-hidden bg-slate-50/60 border border-rose-500/30 shadow-xs">
              <button
                type="button"
                onClick={() => toggleSidebarSection("operations")}
                className="w-full px-3 py-2.5 text-[11px] uppercase tracking-wider text-rose-400 font-extrabold flex items-center justify-between cursor-pointer hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Cpu size={13} className="text-rose-400" />
                  <span>Operations & Stalls</span>
                </div>
                <ChevronDown size={14} className={`text-rose-400 transition-transform duration-200 ${openSidebarSections.operations ? "rotate-180" : ""}`} />
              </button>

              {openSidebarSections.operations && (
                <div className="p-1.5 space-y-1 border-t border-rose-500/15 animate-in fade-in duration-150">
                  {[
                    { id: "missions", fullLabel: "Manage Events", icon: <Cpu size={14} className="text-rose-400" /> },
                      
                    { id: "colleges", fullLabel: "Manage Colleges", icon: <School size={14} className="text-teal-400" /> },
                    { id: "broadcast", fullLabel: "Neural Broadcast", icon: <Volume2 size={14} className="text-blue-900 font-extrabold" /> },
                    { id: "gallery", fullLabel: "Manage Gallery", icon: <ImageIcon size={14} className="text-pink-400" /> },
                    { id: "faqs", fullLabel: "Manage FAQs", icon: <HelpCircle size={14} className="text-blue-900 font-extrabold" /> },
                    { id: "feedback", fullLabel: "Feedback Control", icon: <FileText size={14} className="text-slate-600" /> },
                    { id: "analytics", fullLabel: "Analytics Room", icon: <BarChart2 size={14} className="text-emerald-800 font-extrabold" /> },
                    { id: "reports", fullLabel: "Reports Room", icon: <FileText size={14} className="text-blue-600" /> },
                    { id: "settings", fullLabel: "System Settings", icon: <Settings size={14} className="text-slate-600" /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === tab.id 
                          ? "bg-rose-600/25 text-rose-300 border border-rose-500/50 shadow-inner font-bold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                      }`}
                    >
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="truncate">{tab.fullLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* Dashboard panel body */}
        <div className="flex-1 min-w-0 max-w-full space-y-3 sm:space-y-6">
          
          {/* TOP STATS COUNTERS - Compact Mobile & Desktop */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-3 font-mono">
            {[
              { label: "Attendees", count: students.length, color: "text-blue-900 font-extrabold" },
              { label: "Events", count: missions.length, color: "text-blue-600" },
              { label: "Teams", count: teams.length, color: "text-emerald-800 font-extrabold" },
              { label: "Pending", count: pendingStudents.length, color: "text-orange-500" },
              { label: "Revenue", count: `₹${verifiedStudents.length * (activeSymposium?.regFee || 200)}`, color: "text-emerald-700" }
            ].map((st, idx) => (
              <div key={idx} className="bg-white border border-purple-200 p-2 sm:p-3 rounded-xl flex flex-col justify-center text-center shadow-md">
                <span className="text-[7.5px] sm:text-[9px] text-slate-600 font-mono uppercase truncate font-bold">{st.label}</span>
                <span className={`text-xs sm:text-lg font-mono font-bold mt-0.5 ${st.color}`}>{st.count}</span>
              </div>
            ))}
          </div>

                                        {/* TAB: EXECUTIVE DASHBOARD OVERVIEW - ULTRA-ENHANCED VISUAL SUITE */}
          {(activeTab === "dashboard" || activeTab === "overview") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Ultra Hero Header Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-blue-500/30">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-10 -top-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-extrabold px-3 py-1 rounded-full border border-emerald-400/40 uppercase tracking-wider flex items-center gap-2 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Operations Suite
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 text-[11px] font-mono font-extrabold px-3 py-1 rounded-full border border-blue-400/40 uppercase tracking-wider">
                        ⚡ Real-Time Engine Active
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white" style={{ color: "#ffffff", textShadow: "0 0 12px rgba(255, 255, 255, 0.6)" }}>
                      {sysTitle || "INTEGRA"} {sysYear || "2026"} Executive Control Center
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-mono font-semibold max-w-2xl">
                      Real-time telemetry, student registrations, payment verification desk, event load gauges, and institutional standings.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap font-mono shrink-0">
                    <button
                      onClick={() => setActiveTab("verifications")}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer font-extrabold border border-emerald-400/30"
                    >
                      <CheckCircle2 size={16} /> Verify Payments ({pendingStudents.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("missions")}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer font-extrabold border border-blue-400/30"
                    >
                      <PlusCircle size={16} /> Manage Events
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Metric Cards Grid - High Contrast Glassmorphism */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 font-mono">
                <div className="bg-white border-2 border-blue-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Registered</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                      <Users size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{students.length}</div>
                  <div className="text-[11px] text-blue-700 font-extrabold mt-1">Student Delegates</div>
                </div>

                <div className="bg-white border-2 border-emerald-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Verified</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-800">{verifiedStudents.length}</div>
                  <div className="text-[11px] text-emerald-800 font-extrabold mt-1">Confirmed Paid</div>
                </div>

                <div className="bg-white border-2 border-amber-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Pending</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-800">{pendingStudents.length}</div>
                  <div className="text-[11px] text-amber-900 font-extrabold mt-1">Awaiting Review</div>
                </div>

                <div className="bg-white border-2 border-purple-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Events</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                      <Cpu size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-900">{missions.length}</div>
                  <div className="text-[11px] text-purple-800 font-extrabold mt-1">Tech & Non-Tech</div>
                </div>

                <div className="bg-white border-2 border-teal-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Colleges</span>
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
                      <School size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-teal-900">{colleges.length}</div>
                  <div className="text-[11px] text-teal-900 font-extrabold mt-1">Institutions</div>
                </div>

                <div className="bg-white border-2 border-indigo-200 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all group">
                  <div className="flex justify-between items-center text-slate-500 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Revenue</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-900">₹{verifiedStudents.length * (activeSymposium?.regFee || 200)}</div>
                  <div className="text-[11px] text-indigo-800 font-extrabold mt-1">Fee Collected</div>
                </div>
              </div>

              {/* RICH VISUAL SUITE ROW 1: PAYMENT DONUT METER & EVENT CATEGORY GRADIENT BARS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
                
                {/* Visual Conic Donut Meter */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5 flex flex-col justify-between">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <PieChart size={18} className="text-indigo-600" /> Payment Desk Breakdown
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Live registration verification status</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-200 uppercase">RATIO</span>
                  </div>

                  {/* Enhanced Conic Gradient Ring */}
                  <div className="flex flex-col items-center justify-center my-3 relative">
                    <div
                      className="w-40 h-40 rounded-full flex items-center justify-center relative shadow-lg"
                      style={{
                        background: `conic-gradient(#10b981 0% ${Math.round((verifiedStudents.length / Math.max(1, students.length)) * 100)}%, #f59e0b ${Math.round((verifiedStudents.length / Math.max(1, students.length)) * 100)}% ${Math.round(((verifiedStudents.length + pendingStudents.length) / Math.max(1, students.length)) * 100)}%, #e2e8f0 ${Math.round(((verifiedStudents.length + pendingStudents.length) / Math.max(1, students.length)) * 100)}% 100%)`
                      }}
                    >
                      <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner border border-slate-100">
                        <span className="text-2xl font-black text-slate-900">
                          {Math.round((verifiedStudents.length / Math.max(1, students.length)) * 100)}%
                        </span>
                        <span className="text-[9.5px] text-emerald-800 font-extrabold uppercase tracking-widest mt-0.5">Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend Counters */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 font-bold">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                      <div>
                        <div className="text-[10px] text-emerald-900 uppercase">Paid & Verified</div>
                        <div className="text-sm font-black text-emerald-900">{verifiedStudents.length}</div>
                      </div>
                    </div>
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                      <div>
                        <div className="text-[10px] text-amber-900 uppercase">Pending Review</div>
                        <div className="text-sm font-black text-amber-900">{pendingStudents.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Registration Volume Bars */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <BarChart2 size={18} className="text-blue-600" /> Event Registration Breakdown
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Candidate distribution across all technical & non-technical events</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("missions")}
                      className="text-xs text-blue-600 hover:text-blue-800 font-extrabold hover:underline flex items-center gap-1"
                    >
                      Manage Events <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {missions.map((m, idx) => {
                      const count = students.filter(s => s.registeredEvents?.includes(m.id)).length;
                      const maxReg = Math.max(1, ...missions.map(x => students.filter(s => s.registeredEvents?.includes(x.id)).length));
                      const pct = Math.round((count / maxReg) * 100);
                      const barGradients = [
                        "from-blue-600 via-indigo-600 to-purple-600",
                        "from-emerald-600 via-teal-600 to-sky-600",
                        "from-purple-600 via-pink-600 to-rose-600",
                        "from-amber-600 via-orange-600 to-red-600",
                        "from-indigo-600 via-blue-600 to-cyan-600"
                      ];
                      const gradient = barGradients[idx % barGradients.length];

                      return (
                        <div key={m.id} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-900 font-extrabold truncate max-w-[280px] flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                              {m.name}
                              <span className="text-[9.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold border border-slate-200">
                                {m.category || "General"}
                              </span>
                            </span>
                            <span className="text-blue-900 font-black">{count} Delegates</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                            <div
                              className={`bg-gradient-to-r ${gradient} h-2 rounded-full transition-all duration-500 shadow-sm`}
                              style={{ width: `${Math.max(6, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RICH VISUAL SUITE ROW 2: TOP COLLEGES 3D PODIUM & VENUE LOAD TELEMETRY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
                
                {/* 3D Medal Podium Standings Card */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Trophy size={18} className="text-amber-500" /> College Championship Standings
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Leading institutional delegations ranking</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("colleges")}
                      className="text-xs text-teal-600 hover:text-teal-800 font-extrabold hover:underline"
                    >
                      View All Colleges →
                    </button>
                  </div>

                  {/* Top 3 Medal Podium Cards */}
                  <div className="grid grid-cols-3 gap-2.5 text-center py-2">
                    {colleges.slice(0, 3).map((col, idx) => {
                      const count = students.filter(s => s.college === col.name).length;
                      const medals = ["🥇 1ST PLACE", "🥈 2ND PLACE", "🥉 3RD PLACE"];
                      const bgStyles = [
                        "bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-300 text-amber-900 shadow-sm",
                        "bg-gradient-to-b from-slate-50 to-slate-100/60 border-slate-300 text-slate-900 shadow-sm",
                        "bg-gradient-to-b from-orange-50 to-orange-100/60 border-orange-300 text-orange-950 shadow-sm"
                      ];

                      return (
                        <div key={col.id} className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between items-center ${bgStyles[idx]} hover:scale-[1.02] transition-transform`}>
                          <span className="text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-white/90 rounded-full border border-slate-200/80 shadow-xs">
                            {medals[idx]}
                          </span>
                          <span className="font-extrabold text-xs mt-3 line-clamp-2 text-slate-900">{col.name}</span>
                          <div className="mt-3">
                            <span className="text-2xl font-black text-slate-900">{count}</span>
                            <div className="text-[9px] uppercase font-bold text-slate-600">Delegates</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* College List Table */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {colleges.slice(3, 6).map((col, idx) => {
                      const count = students.filter(s => s.college === col.name).length;
                      return (
                        <div key={col.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
                          <span className="truncate max-w-[240px] text-slate-900 font-extrabold">{idx + 4}. {col.name}</span>
                          <span className="bg-teal-100 text-teal-900 border border-teal-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
                            {count} Delegates
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Venue & Capacity Telemetry Load Gauges */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Building2 size={18} className="text-purple-600" /> Venue & Hospitality Load Gauges
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Real-time venue capacity & dining claims</p>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-purple-300">
                      TELEMETRY
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Lab A Capacity */}
                    <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-extrabold">🏛️ Lab A (AI & ML Center)</span>
                        <span className="text-blue-900 font-black">78% Capacity</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-2.5 rounded-full w-[78%]" />
                      </div>
                    </div>

                    {/* Main Auditorium Capacity */}
                    <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-extrabold">🎤 Main Auditorium & Seminar Hall</span>
                        <span className="text-purple-900 font-black">92% Capacity</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-purple-600 h-2.5 rounded-full w-[92%]" />
                      </div>
                    </div>

                    {/* Organizer Refreshment Desks Claims */}
                    <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-extrabold">☕ Organizer Refreshment Desks & Food Tokens</span>
                        <span className="text-emerald-900 font-black">{refreshmentTxns.length} Claims</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-emerald-600 h-2.5 rounded-full w-[65%]" />
                      </div>
                    </div>

                    {/* Main Gate Check-Ins */}
                    <div className="space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-extrabold">🛂 Campus Gate Entry Check-Ins</span>
                        <span className="text-amber-900 font-black">
                          {Math.round((students.filter(s => s.checkInStatus?.checkedIn).length / Math.max(1, students.length)) * 100)}% Checked In
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2.5 rounded-full"
                          style={{ width: `${Math.max(5, Math.round((students.filter(s => s.checkInStatus?.checkedIn).length / Math.max(1, students.length)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Live Activity Stream */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4 font-mono">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity size={18} className="text-indigo-600" /> Live Operations Activity Stream
                  </h3>
                  <button
                    onClick={() => setActiveTab("audit_logs")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline"
                  >
                    View All Logs ({activityLogs.length}) →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {activityLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-blue-100 text-blue-900 font-extrabold px-2.5 py-0.5 rounded-md text-[10px] border border-blue-200">{log.action}</span>
                        <span className="text-slate-900 font-extrabold">{log.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}







          {/* TAB: Symposium Editions & Multi-Year Cloning */}
          {activeTab === "editions" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-6 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="text-blue-600" size={18} /> Multi-Year Symposium Edition Manager
                  </h3>
                  <p className="text-xs text-slate-600 font-mono">
                    Create new symposium editions, edit existing symposium configuration, or clone structures for future years.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewSymData({
                        id: `integra-${new Date().getFullYear() + 1}`,
                        name: "INTEGRA",
                        theme: "Powered by AI",
                        tagline: "INTER-COLLEGE TECHNICAL SYMPOSIUM",
                        year: String(new Date().getFullYear() + 1),
                        academicYear: `AY${String(new Date().getFullYear() + 1).slice(-2)}-${String(new Date().getFullYear() + 2).slice(-2)}`,
                        symposiumDate: "September 10, " + (new Date().getFullYear() + 1),
                        venue: "Don Bosco College (Co-Ed), Yelagiri Hills",
                        regFee: 200
                      });
                      setNewSymposiumModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-500/20"
                  >
                    <PlusCircle size={14} />
                    <span>Create New Edition</span>
                  </button>
                  <button
                    onClick={() => {
                      setCloneSourceId(activeSymposium?.id || symposiums[0]?.id || "");
                      setNewSymData({
                        id: `integra-${new Date().getFullYear() + 1}`,
                        name: activeSymposium?.name || "INTEGRA",
                        theme: activeSymposium?.theme || "Powered by AI",
                        tagline: activeSymposium?.tagline || "INTER-COLLEGE TECHNICAL SYMPOSIUM",
                        year: String(new Date().getFullYear() + 1),
                        academicYear: `AY${String(new Date().getFullYear() + 1).slice(-2)}-${String(new Date().getFullYear() + 2).slice(-2)}`,
                        symposiumDate: "September 10, " + (new Date().getFullYear() + 1),
                        venue: activeSymposium?.venue || "Don Bosco College (Co-Ed), Yelagiri Hills",
                        regFee: activeSymposium?.regFee || 200
                      });
                      setCloneModalOpen(true);
                    }}
                    className="bg-blue-50 border border-blue-200 text-blue-900 font-bold border border-sky-500/30 hover:bg-sky-100 px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Clone Structure</span>
                  </button>
                </div>
              </div>

              {/* List of Symposium Editions */}
              <div className="grid md:grid-cols-2 gap-4">
                {symposiums.map(sym => {
                  const isActive = activeSymposium?.id === sym.id;
                  return (
                    <div 
                      key={sym.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isActive 
                          ? "bg-indigo-50 border border-indigo-200 border-purple-500/40 shadow-sm ring-2 ring-[#7C3AED]/20" 
                          : "bg-slate-50/70 border border-slate-200 hover:border-slate-300 text-slate-900 font-bold"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-black text-sm text-slate-900">{sym.name} {sym.year}</h4>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-semibold">
                              {sym.academicYear}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold font-medium">{sym.tagline}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditSymposium(sym)}
                            className="text-[10px] font-mono font-bold bg-slate-50/80 border border-slate-300 text-slate-900 font-bold hover:bg-slate-50/60 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Edit this symposium configuration"
                          >
                            <Edit3 size={11} className="text-blue-600" />
                            <span>Edit</span>
                          </button>
                          {isActive ? (
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-lg flex items-center gap-1">
                              <CheckCircle2 size={11} /> ACTIVE
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSwitchSymposium(sym.id)}
                              className="text-[10px] font-mono font-bold bg-slate-100 text-slate-900 font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              SWITCH
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 font-mono pt-3 border-t border-slate-200">
                        <div>ID: <span className="font-bold text-slate-900">{sym.id}</span></div>
                        <div>Date: <span className="text-slate-800 font-semibold">{sym.symposiumDate}</span></div>
                        <div>Entry Fee: <span className="text-emerald-700 font-bold">₹{sym.regFee || 200}</span></div>
                        <div>Venue: <span className="text-slate-800 font-semibold truncate block">{sym.venue}</span></div>
                        <div>Registrations: <span className={sym.registrationOpen ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>{sym.registrationOpen ? "Open" : "Closed"}</span></div>
                        <div>Results: <span className={sym.resultsPublished ? "text-purple-700 font-bold" : "text-slate-700 font-semibold"}>{sym.resultsPublished ? "Published" : "Draft"}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: Scoring & Results Publisher */}
          {activeTab === "verifications" && (
            <div className="bg-white border border-purple-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-2xl text-slate-900">
              
              {/* Header & Actions */}
              <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Check className="text-emerald-800 font-extrabold" size={18} /> Offline Payment Verification Desk
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Verify offline attendee payments to unlock Hall Tickets, AI Passports, and issue Digital Food Tokens.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setAdminCameraScannerOpen(!adminCameraScannerOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0 ${
                      adminCameraScannerOpen
                        ? "bg-rose-100 text-rose-900 font-bold border border-red-500/40"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {adminCameraScannerOpen ? <CameraOff size={13} /> : <Camera size={13} />}
                    <span>{adminCameraScannerOpen ? "Close Camera" : "Open Camera Scanner"}</span>
                  </button>

                  <button
                    onClick={() => handleExportPaymentsCSV(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    title="Export filtered payment records to CSV"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Embedded Live Camera Scanner for Admin Payment Desk */}
              {adminCameraScannerOpen && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-purple-300 space-y-3">
                  <CameraQRScanner
                    onScan={handleAdminCameraScan}
                    title="Live Payment Desk Camera Scanner"
                    themeColor="#A855F7"
                    placeholder="Hold attendee's Registration Pass QR code in front of camera..."
                    autoStart={true}
                  />
                </div>
              )}

              {/* Scan message banner */}
              {adminScanMessage && (
                <div className={`p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                  adminScanMessage.success ? "bg-emerald-50 border border-emerald-200 border-emerald-500/50 text-emerald-200" : "bg-rose-50 border border-rose-200 border-red-500/50 text-red-200"
                }`}>
                  <span>{adminScanMessage.text}</span>
                  <button onClick={() => setAdminScanMessage(null)} className="text-slate-600 hover:text-blue-700 cursor-pointer font-bold">✕</button>
                </div>
              )}

              {/* Financial & Status KPI Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs font-mono">
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-300">
                  <span className="text-[8.5px] sm:text-[9.5px] text-slate-600 uppercase font-bold block">Total Attendees</span>
                  <span className="text-sm sm:text-lg font-extrabold text-slate-900 mt-0.5 block">{students.length} Registered</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs">
                  <span className="text-[8.5px] sm:text-[9.5px] text-amber-900 uppercase font-extrabold block">Pending</span>
                  <span className="text-sm sm:text-lg font-black text-amber-700 mt-0.5 block">{pendingStudents.length} (₹{pendingStudents.length * (activeSymposium?.regFee || 200)})</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300 shadow-xs">
                  <span className="text-[8.5px] sm:text-[9.5px] text-emerald-900 uppercase font-extrabold block">Verified</span>
                  <span className="text-sm sm:text-lg font-black text-emerald-700 mt-0.5 block">{verifiedStudents.length} (₹{verifiedStudents.length * (activeSymposium?.regFee || 200)})</span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border-2 border-rose-300 shadow-xs">
                  <span className="text-[8.5px] sm:text-[9.5px] text-rose-900 uppercase font-extrabold block">Rejected</span>
                  <span className="text-sm sm:text-lg font-black text-rose-700 mt-0.5 block">{rejectedStudents.length} Entries</span>
                </div>
              </div>

              {/* Filter & Search Bar Controls */}
              <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                {/* Status Toggle Pills */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 overflow-x-auto no-scrollbar max-w-full">
                    {[
                      { id: "Pending", label: `Pending (${pendingStudents.length})` },
                      { id: "Verified", label: `Verified (${verifiedStudents.length})` },
                      { id: "Rejected", label: `Rejected (${rejectedStudents.length})` },
                      { id: "All", label: `All (${students.length})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setPaymentFilterStatus(tab.id as any)}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                          paymentFilterStatus === tab.id
                            ? tab.id === "Verified" ? "bg-emerald-600 text-white shadow-xs"
                              : tab.id === "Rejected" ? "bg-red-600 text-white shadow-xs"
                              : tab.id === "Pending" ? "bg-orange-600 text-white shadow-xs"
                              : "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-blue-700 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* College filter */}
                  {uniqueColleges.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">College:</span>
                      <select
                        value={paymentCollegeFilter}
                        onChange={(e) => setPaymentCollegeFilter(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-bold font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      >
                        <option value="All">All Colleges ({uniqueColleges.length})</option>
                        {uniqueColleges.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Instant Search input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search by participant name, ID (e.g. INT26-0045), Reg No, email, mobile..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-12 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  {paymentSearchQuery && (
                    <button
                      onClick={() => setPaymentSearchQuery("")}
                      className="absolute right-3 top-2 text-slate-600 hover:text-blue-700 text-xs font-mono font-bold cursor-pointer"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Results Info Bar */}
              <div className="flex justify-between items-center text-xs font-mono text-slate-600 px-1">
                <span className="text-slate-800 font-bold">Showing <strong className="text-blue-900 font-extrabold text-sm">{filteredPaymentStudents.length}</strong> matching attendee records</span>
                {(paymentSearchQuery || paymentFilterStatus !== "All" || paymentCollegeFilter !== "All") && (
                  <button
                    onClick={() => {
                      setPaymentSearchQuery("");
                      setPaymentFilterStatus("All");
                      setPaymentCollegeFilter("All");
                    }}
                    className="text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
              
              {/* Attendee Payment Records List */}
              {filteredPaymentStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-600 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <p className="text-sm font-semibold text-slate-900 font-bold">No payment records found matching your filters</p>
                  <p className="text-[10px] text-slate-600 font-mono">Try adjusting your search query or switching the status filter tab.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredPaymentStudents.map(student => (
                    <div 
                      key={student.id} 
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-xs shadow-xl ${
                        student.paymentStatus === "Verified"
                          ? "bg-white border-2 border-emerald-200 shadow-sm"
                          : student.paymentStatus === "Rejected"
                          ? "bg-white border-2 border-rose-200 shadow-sm"
                          : "bg-white border-2 border-orange-200 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-slate-900 text-base font-extrabold">{student.name}</strong>
                            <span className="text-[10px] font-mono text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-300 font-bold">
                              {student.participantId || student.id}
                            </span>
                            {student.registrationId && (
                              <span className="text-[10px] font-mono text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300 font-bold">
                                {student.registrationId}
                              </span>
                            )}
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              student.paymentStatus === "Verified" ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold" :
                              student.paymentStatus === "Rejected" ? "bg-rose-100 text-rose-900 border border-rose-300 font-bold" :
                              "bg-orange-100 text-orange-900 border border-orange-300 font-bold"
                            }`}>
                              {student.paymentStatus === "Verified" ? "✓ VERIFIED" :
                               student.paymentStatus === "Rejected" ? "✕ REJECTED" :
                               "⏳ PENDING"}
                            </span>
                          </div>

                          <p className="text-slate-700 text-[11px] leading-relaxed font-sans">
                            {student.college} • {student.department} ({student.year})
                          </p>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600 pt-0.5 flex-wrap">
                            <span>📧 {student.email}</span>
                            {student.phone && <span>📱 {student.phone}</span>}
                            <span className="text-blue-600 font-bold">
                              Events ({student.registeredEvents?.length || 0}): {student.registeredEvents?.map(evId => {
                            const found = missions.find(m => m.id === evId);
                            return found ? found.name : evId;
                          }).join(", ") || "General Access"}
                            </span>
                          </div>

                          {/* Verification Details if verified */}
                          {student.paymentStatus === "Verified" && student.paymentDetails && (
                            <div className="pt-2 mt-1 border-t border-slate-200 flex items-center gap-3 text-[10px] font-mono text-emerald-800 font-extrabold flex-wrap">
                              <span>Mode: <strong className="text-slate-900 font-bold">{student.paymentDetails.mode || "Cash"}</strong></span>
                              <span>Desk: <strong className="text-slate-900 font-bold">{student.paymentDetails.verifiedBy}</strong></span>
                              <span>Time: {student.paymentDetails.date ? new Date(student.paymentDetails.date).toLocaleTimeString() : "Verified"}</span>
                              {student.paymentDetails.remarks && (
                                <span className="text-slate-600 italic">&ldquo;{student.paymentDetails.remarks}&rdquo;</span>
                              )}
                            </div>
                          )}

                          {/* Rejection Details if rejected */}
                          {student.paymentStatus === "Rejected" && student.paymentDetails && (
                            <div className="pt-2 mt-1 border-t border-slate-200 text-[10px] font-mono text-rose-900 font-extrabold">
                              Reason: <strong className="text-slate-900 font-bold">{student.paymentDetails.remarks || "Fee not received"}</strong> (by {student.paymentDetails.verifiedBy})
                            </div>
                          )}
                        </div>
                        
                        {/* Action buttons based on status */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          {student.paymentStatus === "Pending" && (
                            <>
                              <button
                                onClick={() => handleOpenVerifyModal(student)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold font-mono text-[10px] shadow-sm shadow-emerald-600/30"
                              >
                                APPROVE & VERIFY
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(student)}
                                className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold font-mono text-[10px]"
                              >
                                REJECT
                              </button>
                            </>
                          )}

                          {student.paymentStatus === "Verified" && (
                            <button
                              onClick={() => handleOpenVerifyModal(student)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-mono text-[10px] font-bold"
                              title="Update payment mode or remarks"
                            >
                              Edit Details
                            </button>
                          )}

                          {student.paymentStatus === "Rejected" && (
                            <button
                              onClick={() => handleOpenVerifyModal(student)}
                              className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-900 text-emerald-700 border border-emerald-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-mono text-[10px] font-bold"
                            >
                              Re-verify Entry
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-extrabold border border-red-500/30 transition-all cursor-pointer"
                            title="Delete this registration permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Staff & System Users (Role Permissions & Account Switcher) */}
          {activeTab === "staff_roles" && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-slate-100/90 border border-purple-300 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
                      <Shield className="text-blue-600" size={20} />
                      <span>Staff & System User Directory</span>
                      <span className="text-xs bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-500/40 px-2 py-0.5 rounded-full font-mono">
                        {users.filter(u => u.role !== "student").length} Staff Members
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-1">
                      Manage administrator, coordinator, judge, volunteer, and stall accounts. Assign role permissions or switch accounts to test portals.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <button
                      onClick={() => {
                        setEditingStaffId(null);
                        setStaffFormData({
                          name: "",
                          email: "",
                          password: "",
                          role: "coordinator",
                          department: "Computer Science",
                          phone: ""
                        });
                        const formElem = document.getElementById("staff-form-section");
                        formElem?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                    >
                      <PlusCircle size={14} />
                      <span>+ Register New Staff</span>
                    </button>
                  </div>
                </div>

                {/* Role Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "All", label: "All Staff Roles", count: users.filter(u => u.role !== "student").length, color: "text-blue-700 border-purple-500/40" },
                    { id: "admin", label: "Admins", count: users.filter(u => u.role === "admin" || u.role === "super_admin").length, color: "text-blue-600 border-purple-300" },
                    { id: "coordinator", label: "Coordinators", count: users.filter(u => u.role === "coordinator").length, color: "text-blue-400 border-blue-500/30" },
                    { id: "judge", label: "Judges", count: users.filter(u => u.role === "judge").length, color: "text-orange-500 border-orange-200" },
                    { id: "volunteer", label: "Volunteers", count: users.filter(u => u.role === "volunteer").length, color: "text-emerald-800 font-extrabold border-emerald-500/30" },
                    { id: "stall_operator", label: "Stall Operators", count: users.filter(u => u.role === "stall_operator").length, color: "text-rose-400 border-rose-500/30" }
                  ].map(pill => (
                    <button
                      key={pill.id}
                      onClick={() => setStaffRoleFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        staffRoleFilter === pill.id
                          ? "bg-blue-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                          : `bg-slate-50 text-slate-700 ${pill.color} hover:bg-slate-100`
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        staffRoleFilter === pill.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {pill.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={15} />
                  <input
                    type="text"
                    placeholder="Search staff & users by name, email, phone, department, or role..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {staffSearchQuery && (
                    <button
                      onClick={() => setStaffSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-blue-700 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Main Split Grid: Staff List & Registration Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff Users Directory (2 Cols) */}
                <div className="lg:col-span-2 space-y-2.5">
                  <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between px-1">
                    <span>Click any staff member to view comprehensive details & manage permissions</span>
                    <span className="text-blue-600 font-bold">
                      {users.filter(u => staffRoleFilter === "All" ? u.role !== "student" : (staffRoleFilter === "admin" ? u.role === "admin" || u.role === "super_admin" : u.role === staffRoleFilter)).length} Profiles
                    </span>
                  </div>

                  {/* Scrollable Staff List Container */}
                  <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1.5 scrollbar-thin">
                    {Array.from(
                      users
                        .filter(u => {
                          if (staffRoleFilter === "All") return u.role !== "student";
                          if (staffRoleFilter === "admin") return u.role === "admin" || u.role === "super_admin" || (Array.isArray(u.roles) && (u.roles.includes("admin") || u.roles.includes("super_admin")));
                          return u.role === staffRoleFilter || (Array.isArray(u.roles) && u.roles.includes(staffRoleFilter as any));
                        })
                        .reduce((map, u) => {
                          const emailKey = (u.email || "").toLowerCase().trim() || u.id;
                          if (!map.has(emailKey)) {
                            map.set(emailKey, u);
                          } else {
                            const existing = map.get(emailKey)!;
                            const mergedRoles = Array.from(new Set([...(existing.roles || [existing.role]), ...(u.roles || [u.role])]));
                            map.set(emailKey, { ...existing, ...u, roles: mergedRoles });
                          }
                          return map;
                        }, new Map<string, DBUser>())
                        .values()
                    )
                      .filter(u => {
                        if (staffRoleFilter === "All") return u.role !== "student";
                        if (staffRoleFilter === "admin") return u.role === "admin" || u.role === "super_admin";
                        return u.role === staffRoleFilter;
                      })
                      .filter(u => {
                        const q = staffSearchQuery.trim().toLowerCase();
                        return !q || (
                          (u.name && u.name.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.phone && u.phone.includes(q)) ||
                          (u.department && u.department.toLowerCase().includes(q)) ||
                          (u.role && u.role.toLowerCase().includes(q))
                        );
                      })
                      .map(u => {
                        const isCurrent = currentUser?.id === u.id;
                        let roleBadgeColor = "bg-slate-100 text-slate-700 border-slate-300";
                        if (u.role === "admin" || u.role === "super_admin") {
                          roleBadgeColor = "bg-indigo-50 border border-indigo-200 text-blue-700 border-purple-500/40";
                        } else if (u.role === "coordinator") {
                          roleBadgeColor = "bg-blue-950/90 text-blue-300 border-blue-500/40";
                        } else if (u.role === "judge") {
                          roleBadgeColor = "bg-amber-50 border border-amber-200 text-orange-600 border-amber-500/40";
                        } else if (u.role === "volunteer") {
                          roleBadgeColor = "bg-emerald-50 border border-emerald-200 text-emerald-700 border-emerald-500/40";
                        } else if (u.role === "stall_operator") {
                          roleBadgeColor = "bg-rose-50 border border-rose-200 text-rose-300 border-rose-500/40";
                        } else if (u.role === "student") {
                          roleBadgeColor = "bg-blue-50 border border-blue-200 text-blue-900 font-bold border-sky-500/40";
                        }

                        const initials = u.name 
                          ? u.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()
                          : "U";

                        return (
                          <div
                            key={u.id}
                            onClick={() => setInspectingUser(u)}
                            className={`p-3.5 sm:p-4 bg-slate-100/90 border rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-between gap-3 group ${
                              isCurrent
                                ? "border-purple-500/70 bg-indigo-50 border border-indigo-200 hover:border-purple-400"
                                : "border-slate-200 hover:border-purple-500/50 hover:bg-slate-850"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="text-slate-900 font-extrabold text-sm sm:text-base truncate group-hover:text-blue-700 transition-colors">
                                    {u.name}
                                  </strong>
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${roleBadgeColor}`}>
                                    {u.role}
                                  </span>
                                  {Array.isArray(u.roles) && u.roles.length > 1 && (
                                    <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                      +{u.roles.length - 1} ROLES
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                      ACTIVE SESSION
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-600 text-xs font-mono truncate mt-0.5 flex items-center gap-2">
                                  <span>📧 {u.email}</span>
                                  {u.department && <span className="hidden sm:inline text-slate-700 font-semibold">• {u.department}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingUser(u);
                                }}
                                className="text-[11px] font-mono text-blue-700 font-bold bg-indigo-50 border border-indigo-200 border border-purple-300 hover:bg-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              >
                                <span>Manage Roles & Details</span>
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {users.filter(u => staffRoleFilter === "All" ? u.role !== "student" : (staffRoleFilter === "admin" ? u.role === "admin" || u.role === "super_admin" : u.role === staffRoleFilter)).length === 0 && (
                      <div className="p-12 text-center text-xs text-slate-700 font-semibold italic bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 font-mono">
                        No staff users found in this category. Use the registration form to create a new profile.
                      </div>
                    )}
                  </div>
                </div>

                {/* Create / Edit Staff Profile Form */}
                <div id="staff-form-section" className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xl">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                      <UserCog className="text-blue-600" size={18} />
                      <span>{editingStaffId ? "Update Staff Profile" : "Register New Staff Profile"}</span>
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Assign official permissions for administrative, judging, or coordination duties.
                    </p>
                  </div>

                  <form onSubmit={handleSaveStaffUser} className="space-y-3.5 text-xs font-mono">
                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Staff Full Name *</label>
                      <input
                        type="text"
                        value={staffFormData.name}
                        onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                        placeholder="Enter Name"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address (Login ID) *</label>
                      <input
                        type="email"
                        value={staffFormData.email}
                        onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                        placeholder="Enter Email Address"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Mobile / Phone Number *</label>
                      <input
                        type="text"
                        value={staffFormData.phone}
                        onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Login Passcode / Password *</label>
                      <input
                        type="text"
                        value={staffFormData.password}
                        onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                        placeholder="Enter Passcode"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Department / Unit</label>
                      <input
                        type="text"
                        value={staffFormData.department}
                        onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                        placeholder="e.g. Computer Science"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/30 cursor-pointer uppercase text-xs flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={14} />
                        <span>{editingStaffId ? "Update Profile" : "Save & Register User"}</span>
                      </button>
                      {editingStaffId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaffId(null);
                            setStaffFormData({
                              name: "",
                              email: "",
                              password: "",
                              role: "coordinator",
                              department: "Computer Science",
                              phone: ""
                            });
                          }}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Students Roster List */}
          {activeTab === "students" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="text-blue-900 font-extrabold" size={18} /> Participant & Student Delegate Directory ({students.length})
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Filter by status, college, registered events, or search by participant ID, name, email, or phone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllRegistrations}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Trash size={13} />
                    <span>Clear All</span>
                  </button>
                  <button
                    onClick={() => handleExportCSV(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer shadow-sm"
                  >
                    <Download size={13} />
                    <span>Export Students CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Pills & Counters */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "All", label: "All Records", count: students.length, color: "text-slate-700 bg-slate-100" },
                  { id: "Verified", label: "Verified Paid", count: verifiedStudents.length, color: "text-emerald-700 bg-emerald-50" },
                  { id: "Pending", label: "Pending Payment", count: pendingStudents.length, color: "text-amber-700 bg-amber-50" },
                  { id: "CheckedIn", label: "Checked In at Campus", count: checkedInStudents.length, color: "text-sky-700 bg-sky-50" }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setStudentFilterStatus(pill.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      studentFilterStatus === pill.id
                        ? "bg-sky-600 text-white border-[#0284C7] shadow-xs"
                        : `${pill.color} border-slate-200 hover:border-slate-300`
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      studentFilterStatus === pill.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search & Secondary Filter Dropdowns */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-1 relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name, ID, registration no, email, phone, college, dept..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={studentCollegeFilter}
                    onChange={(e) => setStudentCollegeFilter(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  >
                    <option value="All">All Institutions ({uniqueColleges.length} Colleges)</option>
                    {uniqueColleges.map((col, idx) => (
                      <option key={idx} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={studentEventFilter}
                    onChange={(e) => setStudentEventFilter(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  >
                    <option value="All">All Events / Missions ({missions.length} Events)</option>
                    {missions.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.venue})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Roster List */}
              {filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700">No student records match your filter criteria.</p>
                  <p className="text-[11px] text-slate-600 font-mono">Try adjusting your search query, status pill, or institution dropdown.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredStudents.map(student => (
                    <div 
                      key={student.id} 
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 text-slate-900 font-bold transition-all text-xs shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-slate-900 text-base font-extrabold">{student.name}</strong>
                          <span className="text-[10px] font-mono text-blue-900 font-extrabold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-bold">
                            {student.participantId || student.id}
                          </span>
                          {student.registrationId && (
                            <span className="text-[10px] font-mono text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300 font-bold">
                              {student.registrationId}
                            </span>
                          )}
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            student.paymentStatus === "Verified" ? "bg-emerald-100 text-emerald-800" :
                            student.paymentStatus === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {student.paymentStatus}
                          </span>
                          {student.checkInStatus?.checkedIn && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                              ✓ CHECKED IN
                            </span>
                          )}
                        </div>

                        <p className="text-slate-600 text-[11px] font-medium">
                          {student.college} • {student.department} ({student.year})
                        </p>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-700 font-semibold pt-0.5 flex-wrap">
                          <span>📧 {student.email}</span>
                          {student.phone && <span>📱 {student.phone}</span>}
                          <span className="text-blue-600 font-bold">
                            Events ({student.registeredEvents?.length || 0}): {student.registeredEvents?.map(evId => {
                            const found = missions.find(m => m.id === evId);
                            return found ? found.name : evId;
                          }).join(", ") || "General Access"}
                          </span>
                        </div>
                      </div>

                      {/* Points Points and Override */}
                      <div className="flex items-center gap-3 shrink-0">
                        {editingStudentPointsId === student.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <input
                              type="number"
                              value={overridePointsValue}
                              onChange={(e) => setOverridePointsValue(parseInt(e.target.value) || 0)}
                              className="bg-slate-50/60 border border-slate-300 rounded-lg p-1 text-slate-900 font-bold text-xs w-20 text-center font-mono font-bold focus:ring-2 focus:ring-[#0284C7]"
                            />
                            <button
                              onClick={() => handleOverrideScore(student.id, overridePointsValue)}
                              className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold font-mono cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStudentPointsId(null)}
                              className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-bold font-mono text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200" title="Student Score Points earned from event participation and wins">
                              {student.xp || 0} Points
                            </span>
                            <button
                              onClick={() => { setEditingStudentPointsId(student.id); setOverridePointsValue(student.xp || 0); }}
                              className="bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-300 border border-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all"
                              title="Update student score points"
                            >
                              Edit Points
                            </button>
                            <button
                              onClick={async () => {
                                const missionsList = mockDB.getMissions();
                                await pdfHelper.downloadHallTicket(student, missionsList);
                              }}
                              className="bg-sky-500/20 hover:bg-sky-500/30 text-blue-900 font-bold border border-sky-500/40 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                              title="Download A5 Participant Hall Ticket PDF"
                            >
                              <Download size={11} />
                              <span>Hall Ticket</span>
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer transition-all"
                              title="Delete this student record"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2.5: Teams Roster List */}
          {activeTab === "teams" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="text-blue-600" size={18} /> Registered Teams Roster ({teams.length})
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    View team events, leader assignments, member counts, team codes, and team status.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => handleExportTeamsCSV(false)}
                    className="bg-slate-100 hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-300"
                    title="Export Registered Teams as CSV"
                  >
                    <Download size={13} />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportTeamsCSV(true)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500/50"
                    title="Export Registered Teams as Excel Spreadsheet (.xls)"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "All", label: "All Teams", count: teams.length },
                  { id: "Complete", label: "Complete Squads", count: teams.filter(t => t.status === "Complete" || t.members.length > 1).length },
                  { id: "Waiting for Members", label: "Forming Squads", count: teams.filter(t => t.status === "Waiting for Members" || t.members.length <= 1).length }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setTeamsFilterStatus(pill.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      teamsFilterStatus === pill.id
                        ? "bg-blue-600 text-white border-[#7C3AED] shadow-xs"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      teamsFilterStatus === pill.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search & Event Dropdown */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search by team name, team ID, leader name, leader ID, or member..."
                    value={teamsSearchQuery}
                    onChange={(e) => setTeamsSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {teamsSearchQuery && (
                    <button
                      onClick={() => setTeamsSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={teamsEventFilter}
                    onChange={(e) => setTeamsEventFilter(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="All">All Team Events</option>
                    {missions.filter(m => m.type === "Team" || m.maxTeamSize > 1).map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.venue})</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredTeams.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  No teams registered match your filter criteria.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredTeams.map(t => (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-900 font-bold hover:border-purple-300 transition-all flex flex-col justify-between space-y-3 text-xs shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-blue-600 bg-indigo-50 border border-indigo-200 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                            {t.eventName || t.eventId}
                          </span>
                          <h4 className="text-sm font-heading font-extrabold text-slate-900 mt-1">{t.teamName}</h4>
                        </div>
                        <span className="text-[10px] font-mono text-blue-900 font-extrabold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-bold">
                          ID: {t.id}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-2 font-mono pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span>Team Leader: <strong className="text-white font-bold">{t.leaderName}</strong> <span className="text-slate-600 text-[10px]">({t.leaderId})</span></span>
                          <span className="text-[10px] font-bold text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded border border-emerald-500/40">
                            {t.members.length} {t.members.length === 1 ? "Member" : "Members"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-600 font-bold uppercase block mb-1">Squad Members:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {t.members && t.members.length > 0 ? (
                              t.members.map((m: any, idx: number) => {
                                const isString = typeof m === "string";
                                const mName = isString ? m : (m.name || m.studentId || `Member ${idx + 1}`);
                                const mId = isString ? "" : (m.studentId || m.id || "");
                                const isLeader = (isString ? m === t.leaderId : m.studentId === t.leaderId || m.id === t.leaderId);

                                return (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold flex items-center gap-1 border ${
                                      isLeader
                                        ? "bg-indigo-50 border border-indigo-200 text-purple-200 border-purple-500/50"
                                        : "bg-slate-100 text-slate-900 font-bold border-slate-300"
                                    }`}
                                  >
                                    <span>{mName}</span>
                                    {mId && mId !== mName && <span className="text-slate-600 text-[9.5px]">({mId})</span>}
                                    {isLeader && <span title="Team Leader">👑</span>}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-700 font-semibold text-[10.5px] italic">No members assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Organizer Refreshment Desks Management & Financial Ledger */}
          

          {/* TAB 2.6: Judging & Results */}
          {activeTab === "scoring_results" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Award className="text-blue-600" size={18} /> Evaluation Scorecards & Results Review ({scores.length})
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Review scorecards submitted by judges, lock evaluations, and prepare final standings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const updated = !activeSymposium?.resultsPublished;
                      mockDB.publishResults(activeSymposium?.id || "integra-2026", updated);
                      fetchData();
                      alert(`Symposium results have been ${updated ? "PUBLISHED" : "UNPUBLISHED (DRAFT)"}!`);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                      activeSymposium?.resultsPublished
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-indigo-50 border border-indigo-200 hover:bg-purple-900/70 text-blue-700 border border-purple-500/40"
                    }`}
                  >
                    {activeSymposium?.resultsPublished ? "🟢 Results Published Live" : "📢 Publish All Results"}
                  </button>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "All", label: "All Evaluations", count: scores.length },
                  { id: "Locked", label: "Locked Final", count: scores.filter(s => s.isLocked).length },
                  { id: "Unlocked", label: "Editable Draft", count: scores.filter(s => !s.isLocked).length }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setScoresFilterStatus(pill.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      scoresFilterStatus === pill.id
                        ? "bg-blue-600 text-white border-[#7C3AED] shadow-xs"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      scoresFilterStatus === pill.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search & Event Dropdown */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search scorecards by student name, college, evaluator, or remarks..."
                    value={scoresSearchQuery}
                    onChange={(e) => setScoresSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {scoresSearchQuery && (
                    <button
                      onClick={() => setScoresSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={scoresEventFilter}
                    onChange={(e) => setScoresEventFilter(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="All">All Evaluated Events ({missions.length} Events)</option>
                    {missions.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredScores.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  No evaluation scorecards match your filter criteria.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredScores.map(score => (
                    <div 
                      key={score.id}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-900 font-bold hover:border-purple-300 transition-all flex flex-col justify-between space-y-3 text-xs shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-extrabold text-sm">{score.studentName}</strong>
                            <span className="text-[10px] font-mono text-blue-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded border border-purple-300 font-bold">
                              {score.missionId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 font-semibold">{score.collegeName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-heading font-black text-blue-600">{score.totalScore}</span>
                          <span className="text-[10px] text-slate-600 font-mono block">POINTS</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Evaluator / Judge:</span>
                          <strong className="text-slate-900 font-extrabold">{score.submittedBy}</strong>
                        </div>
                        {score.remarks && (
                          <div className="text-[11px] text-slate-700 font-semibold italic pt-1 border-t border-slate-200">
                            &ldquo;{score.remarks}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          score.isLocked ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {score.isLocked ? "🔒 Locked" : "✏️ Draft"}
                        </span>

                        <button
                          onClick={() => {
                            mockDB.lockScore(score.id, !score.isLocked);
                            fetchData();
                          }}
                          className="bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          {score.isLocked ? "Unlock Score" : "Lock Score"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2.7: Activity Audit Logs */}
          {activeTab === "audit_logs" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="text-blue-900 font-extrabold" size={18} /> System Activity & Audit Trail ({activityLogs.length})
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Real-time transaction history tracking payments, volunteer assignments, scoring, and role updates.
                  </p>
                </div>
              </div>

              {/* Action Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "All", label: "All Logs" },
                  { id: "PAYMENT", label: "Payment Logs" },
                  { id: "VOLUNTEER", label: "Volunteer Logs" },
                  { id: "TEAM", label: "Team Logs" },
                  { id: "SCORE", label: "Scoring Logs" },
                  { id: "SYMPOSIUM", label: "Symposium Logs" }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setAuditActionFilter(pill.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      auditActionFilter === pill.id
                        ? "bg-sky-600 text-white border-[#0284C7] shadow-xs"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{pill.label}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Search activity logs by action, user name, user ID, or detail..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
                {auditSearchQuery && (
                  <button
                    onClick={() => setAuditSearchQuery("")}
                    className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredActivityLogs.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  No activity logs recorded matching this filter.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredActivityLogs.map(log => (
                    <div 
                      key={log.id} 
                      className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 font-bold text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-900 font-bold px-2 py-0.5 rounded font-bold border border-slate-200">
                            {log.action}
                          </span>
                          <strong className="text-slate-900 font-extrabold">{log.userName || "System"}</strong>
                          <span className="text-[10px] text-slate-600">({log.userId || "sys"})</span>
                        </div>
                        <p className="text-slate-600 text-[11px] font-sans font-medium">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2.5: Manage Events */}
          {activeTab === "missions" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-4 sm:p-6 rounded-2xl space-y-6 shadow-xs">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Cpu className="text-blue-600" size={18} /> Manage Symposium Events & Competitions
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Configure competition parameters, rules, criteria, venues, time slots, logos, coordinators, and judges.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!showCreateEventForm && !editingMissionId ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleCancelEditMission();
                        setShowCreateEventForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-mono font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-600/30 transition-all flex items-center gap-2"
                    >
                      <PlusCircle size={16} />
                      <span>+ Create New Event</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleCancelEditMission();
                        setShowCreateEventForm(false);
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-mono font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <span>Close Form</span>
                      <span>✕</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Add / Edit Mission Form - ONLY DISPLAYED WHEN CREATE NEW EVENT BUTTON OR EDIT BUTTON IS CLICKED */}
              {(showCreateEventForm || editingMissionId) && (
              <form onSubmit={handleCreateMission} className={`p-4 sm:p-5 rounded-2xl space-y-4 text-xs border transition-all ${
                editingMissionId ? "bg-slate-100 border-2 border-purple-500 shadow-2xl shadow-purple-500/20" : "bg-white border border-purple-300 shadow-xl"
              }`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    {editingMissionId ? (
                      <>
                        <Edit3 className="text-blue-600" size={16} />
                        <span>Edit Event Blueprint: <span className="text-blue-600 underline">{missionName}</span></span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="text-blue-600" size={16} />
                        <span>Initialize New Competition / Event</span>
                      </>
                    )}
                  </h4>
                  {editingMissionId && (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                      EDIT MODE
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Name *</label>
                    <input
                      type="text"
                      value={missionName}
                      onChange={(e) => setMissionName(e.target.value)}
                      placeholder="e.g. Prompt Masters"
                      required
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Category / Domain *</label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={missionCategory}
                        onChange={(e) => setMissionCategory(e.target.value)}
                        placeholder="e.g. Technical / Non-Technical / Gaming"
                        required
                        className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                      />
                      <div className="flex flex-wrap gap-1">
                        {["Technical", "Non-Technical", "Gaming", "Cultural", "AI & ML", "Web / App"].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setMissionCategory(cat)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                              missionCategory === cat
                                ? "bg-blue-600 text-white border-purple-400"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 font-bold"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Logo / Emblem Upload & Live Preview */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-purple-300 text-slate-900 font-bold space-y-2">
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                    Event Logo / Emblem (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 border border-purple-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {missionLogoUrl ? (
                        <img src={missionLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-600 font-mono text-xs font-bold">LOGO</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 400, 0.88);
                              setMissionLogoUrl(compressed);
                            } catch (err) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                setMissionLogoUrl(evt.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="block w-full text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-[#6D28D9] cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono">
                        <span>Upload custom event icon/logo (.png, .jpg, .svg)</span>
                        {missionLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setMissionLogoUrl("")}
                            className="text-red-600 hover:underline font-bold cursor-pointer"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Type *</label>
                    <select
                      value={missionType}
                      onChange={(e) => setMissionType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>

                  {missionType === "Team" ? (
                    <>
                      <div>
                        <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Min Team Size</label>
                        <input
                          type="number"
                          value={missionMinTeamSize}
                          onChange={(e) => setMissionMinTeamSize(parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Max Team Size</label>
                        <input
                          type="number"
                          value={missionMaxTeamSize}
                          onChange={(e) => setMissionMaxTeamSize(parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Max Teams Limit</label>
                        <input
                          type="number"
                          value={missionMaxTeams}
                          onChange={(e) => setMissionMaxTeams(parseInt(e.target.value) || 10)}
                          min={1}
                          className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Max Participants</label>
                      <input
                        type="number"
                        value={missionMaxCapacity}
                        onChange={(e) => setMissionMaxCapacity(parseInt(e.target.value) || 50)}
                        min={1}
                        className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Registration Status</label>
                    <select
                      value={missionStatus}
                      onChange={(e) => setMissionStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Date</label>
                    <input
                      type="date"
                      value={missionEventDate}
                      onChange={(e) => setMissionEventDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Difficulty</label>
                    <select
                      value={missionDifficulty}
                      onChange={(e) => setMissionDifficulty(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Duration</label>
                    <input
                      type="text"
                      value={missionDuration}
                      onChange={(e) => setMissionDuration(e.target.value)}
                      placeholder="e.g. 2 Hours"
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Venue Location *</label>
                    <input
                      type="text"
                      value={missionVenue}
                      onChange={(e) => setMissionVenue(e.target.value)}
                      placeholder="e.g. Lab 1 (PG Block)"
                      required
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Time Slot</label>
                    <input
                      type="text"
                      value={missionSlot}
                      onChange={(e) => setMissionSlot(e.target.value)}
                      placeholder="e.g. SLOT 1 (10:00 AM - 10:50 AM)"
                      className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lead Staff Coordinator with Dropdown selection */}
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Lead Staff Coordinator *</span>
                      {coordinatorsList.length > 0 && (
                        <span className="text-[10px] text-blue-600 font-mono font-normal">
                          {coordinatorsList.length} Coordinator{coordinatorsList.length > 1 ? "s" : ""} Available
                        </span>
                      )}
                    </label>
                    <div className="space-y-1.5">
                      {coordinatorsList.length > 0 && (
                        <select
                          value={
                            coordinatorsList.some(c => c.name === missionCoordinator || c.email === missionCoordinator || c.id === missionCoordinator)
                              ? (coordinatorsList.find(c => c.name === missionCoordinator || c.email === missionCoordinator || c.id === missionCoordinator)?.id || "")
                              : (missionCoordinator ? "custom" : "")
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "custom" || val === "") {
                              if (val === "") {
                                setMissionCoordinator("");
                                setMissionPhone("");
                              }
                            } else {
                              const selected = coordinatorsList.find(u => u.id === val || u.email === val);
                              if (selected) {
                                setMissionCoordinator(selected.name);
                                if (selected.phone) setMissionPhone(selected.phone);
                              }
                            }
                          }}
                          className="w-full bg-slate-50 border border-purple-500/40 hover:border-purple-500 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all cursor-pointer"
                        >
                          <option value="">-- Choose from Registered Coordinators ({coordinatorsList.length}) --</option>
                          {coordinatorsList.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.department ? `(${c.department})` : ""} — {c.email}
                            </option>
                          ))}
                          <option value="custom">✏️ Enter Custom / Other Coordinator Name...</option>
                        </select>
                      )}
                      <input
                        type="text"
                        value={missionCoordinator}
                        onChange={(e) => setMissionCoordinator(e.target.value)}
                        placeholder="e.g. Prof. Rajesh Kumar (or select from dropdown above)"
                        required
                        className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Coordinator Phone & Judge Evaluator */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Coordinator Contact Phone</label>
                      <input
                        type="text"
                        value={missionPhone}
                        onChange={(e) => setMissionPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Judge Evaluator (Optional)</span>
                        {judgesList.length > 0 && (
                          <span className="text-[10px] text-blue-600 font-mono font-normal">
                            {judgesList.length} Judge{judgesList.length > 1 ? "s" : ""} Available
                          </span>
                        )}
                      </label>
                      <select
                        value={missionAssignedJudgeId}
                        onChange={(e) => setMissionAssignedJudgeId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- No Judge Assigned (Unassigned) --</option>
                        {judgesList.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.name} {j.department ? `(${j.department})` : ""} — {j.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Rules (One per line)</label>
                  <textarea
                    rows={6}
                    value={missionRulesInput}
                    onChange={(e) => setMissionRulesInput(e.target.value)}
                    placeholder="Rule 1&#10;Rule 2&#10;Rule 3..."
                    className="w-full bg-slate-50 border border-slate-300 hover:border-slate-600 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-400 font-mono focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-y"
                  />
                </div>



                <div className="flex gap-2.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer font-mono uppercase text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    <span>{editingMissionId ? "Update Event Blueprint" : "Save & Publish Event Blueprint"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCancelEditMission();
                      setShowCreateEventForm(false);
                    }}
                    className="px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-xl transition-all cursor-pointer font-mono uppercase text-xs"
                  >
                    Cancel / Close
                  </button>
                </div>
              </form>
              )}

              {/* Active Missions List with Search & Filters */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-xs font-heading font-bold text-blue-700">
                    Currently Active System Blueprints ({filteredMissions.length} of {missions.length})
                  </h4>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {["All", "Technical", "Non-Technical", "Gaming", "Cultural"].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setMissionCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          eventCategoryFilter === cat
                            ? "bg-blue-600 text-white border-[#7C3AED] shadow-xs"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mission Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={15} />
                  <input
                    type="text"
                    placeholder="Search missions by name, category, venue, coordinator, judge..."
                    value={missionSearchQuery}
                    onChange={(e) => setMissionSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {missionSearchQuery && (
                    <button
                      onClick={() => setMissionSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {filteredMissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    No missions match your filter criteria.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredMissions.map(m => {
                      const coordsList = users.filter(u => u.role === "coordinator" || u.role === "admin" || u.role === "super_admin" || u.roles?.includes("coordinator") || u.roles?.includes("admin")).filter((u, idx, arr) => idx === arr.findIndex(x => (x.email || x.id).toLowerCase().trim() === (u.email || u.id).toLowerCase().trim()));
                      const judgesList = users.filter(u => (u.role === "judge" || u.roles?.includes("judge")) && u.role !== "admin" && u.role !== "super_admin").filter((u, idx, arr) => idx === arr.findIndex(x => (x.email || x.id).toLowerCase().trim() === (u.email || u.id).toLowerCase().trim()));
                      
                      return (
                        <div key={m.id} className="p-4 bg-slate-50/70 border border-slate-200 text-slate-900 font-bold hover:border-purple-500/40 rounded-2xl flex flex-col justify-between text-xs space-y-3.5 shadow-xs transition-all">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex gap-2.5 items-start">
                              {m.logoUrl ? (
                                <img
                                  src={m.logoUrl}
                                  alt={m.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-purple-300 shrink-0 mt-0.5 shadow-2xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 border border-purple-500/40 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 font-mono text-[10px] font-bold shadow-2xs">
                                  AI
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <strong className="text-slate-900 font-extrabold text-sm">{m.name}</strong>
                                  <span className="text-[10px] uppercase px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-blue-700 rounded-md font-mono font-bold border border-purple-300">
                                    {m.category || "Technical"}
                                  </span>
                                  <span className="text-[10px] uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono font-bold">
                                    {m.difficulty}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 font-mono">{m.venue} • {m.duration} • <span className="text-purple-700 font-bold">{m.slot || "Slot 1"}</span></p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenEditMission(m);
                                  window.scrollTo({ top: 400, behavior: "smooth" });
                                }}
                                className="p-1.5 px-2 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-blue-600 text-blue-600 hover:text-blue-700 border border-purple-300 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold shadow-2xs"
                                title="Edit Event Blueprint & Logo"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMission(m.id)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-blue-700 border border-red-200 transition-all cursor-pointer shadow-2xs"
                                title="Delete Mission Blueprint"
                              >
                                <Trash size={13} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="border-t border-slate-200 pt-3 space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-700 font-semibold">Coordinator:</span>
                              <select
                                value={coordsList.find(c => c.name === m.coordinator)?.email || ""}
                                onChange={(e) => handleAssignStaff(m.id, e.target.value, m.assignedJudgeId || "")}
                                className="bg-slate-50/70 border border-slate-200 text-slate-900 font-bold rounded-lg p-1.5 text-xs font-bold max-w-[160px] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] cursor-pointer"
                              >
                                <option value="">Unassigned</option>
                                {coordsList.map(c => (
                                  <option key={c.id} value={c.email}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Multi-Judge On-Spot Evaluator Panel (2-3 Judges Per Event) */}
                            <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-slate-700 font-semibold flex items-center gap-1">
                                  <Award size={13} className="text-amber-600" />
                                  <span>Judges Panel ({(m.assignedJudgeIds?.length || (m.assignedJudgeId ? 1 : 0))}/3):</span>
                                </span>
                                
                                <select
                                  value=""
                                  onChange={async (e) => {
                                    const selectedId = e.target.value;
                                    if (!selectedId) return;
                                    const currentIds = m.assignedJudgeIds || (m.assignedJudgeId ? [m.assignedJudgeId] : []);
                                    if (currentIds.includes(selectedId)) return;
                                    if (currentIds.length >= 3) {
                                      alert("Maximum 3 Judges can be assigned per event.");
                                      return;
                                    }
                                    const judgeUser = users.find(u => u.id === selectedId);
                                    const newIds = [...currentIds, selectedId];
                                    const currentNames = m.assignedJudgeNames || (m.assignedJudgeName ? [m.assignedJudgeName] : []);
                                    const newNames = [...currentNames, judgeUser?.name || "Judge"];
                                    
                                    const updatedMission: Mission = {
                                      ...m,
                                      assignedJudgeId: newIds[0],
                                      assignedJudgeName: newNames[0],
                                      assignedJudgeIds: newIds,
                                      assignedJudgeNames: newNames
                                    };
                                    setIsCloudSyncing(true);
                                    try {
                                      await mockDB.updateMissionAsync(updatedMission);
                                      await mockDB.syncFromCloud(true);
                                      fetchData();
                                    } finally {
                                      setIsCloudSyncing(false);
                                    }
                                  }}
                                  className="bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-bold rounded-lg p-1 text-[11px] focus:outline-none cursor-pointer"
                                >
                                  <option value="">+ Assign Judge (On-Spot)...</option>
                                  {judgesList.map(j => (
                                    <option key={j.id} value={j.id}>
                                      {(m.assignedJudgeIds || []).includes(j.id) ? `✓ ${j.name} (Assigned)` : `+ ${j.name}`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {(Array.isArray(m.assignedJudgeIds)
                                  ? m.assignedJudgeIds.map(jId => {
                                      const jObj = users.find(u => u.id === jId);
                                      return { id: jId, name: jObj?.name || "Judge" };
                                    })
                                  : (m.assignedJudgeId ? [{ id: m.assignedJudgeId, name: m.assignedJudgeName || "Judge" }] : [])
                                ).map(judge => (
                                  <span key={judge.id} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-lg shadow-2xs">
                                    <span>⚖️ {judge.name}</span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const currentIds = m.assignedJudgeIds || (m.assignedJudgeId ? [m.assignedJudgeId] : []);
                                        const newIds = currentIds.filter(id => id !== judge.id);
                                        const currentNames = m.assignedJudgeNames || (m.assignedJudgeName ? [m.assignedJudgeName] : []);
                                        const newNames = currentNames.filter(n => n !== judge.name);
                                        const updatedMission: Mission = {
                                          ...m,
                                          assignedJudgeId: newIds[0] || undefined,
                                          assignedJudgeName: newNames[0] || undefined,
                                          assignedJudgeIds: newIds,
                                          assignedJudgeNames: newNames
                                        };
                                        setIsCloudSyncing(true);
                                        try {
                                          await mockDB.updateMissionAsync(updatedMission);
                                          await mockDB.syncFromCloud(true);
                                          fetchData();
                                        } finally {
                                          setIsCloudSyncing(false);
                                        }
                                      }}
                                      className="text-rose-600 hover:text-rose-800 font-bold ml-1 cursor-pointer"
                                      title="Unassign Judge"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                                {(!m.assignedJudgeId && (!m.assignedJudgeIds || m.assignedJudgeIds.length === 0)) && (
                                  <span className="text-[11px] text-slate-500 font-mono italic">No judges assigned (Click '+ Assign Judge' on-spot)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Scoreboard Manager */}

          {activeTab === "scoreboard" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-6 shadow-xs">
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Trophy className="text-blue-600" size={18} /> Symposium Scoreboard & Standings Control
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Manage participant standings, live points override, and leaderboard visibility.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetAllScores}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Reset All Scores
                  </button>
                  <button
                    onClick={() => handleExportCSV(false)}
                    className="bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-300 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Status & Toggle Controls */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <strong className="text-slate-900 font-extrabold text-sm">Public Leaderboard Status</strong>
                    <p className="text-[11px] text-slate-700 font-semibold mt-1">
                      {sysScoreboardEnabled ? "🟢 LIVE: Rankings are visible and updating in real-time" : "🔴 FROZEN: Leaderboard is locked. Standings overlay is active"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = !sysScoreboardEnabled;
                      setSysScoreboardEnabled(updated);
                      mockDB.updateSettings({
                        id: "sys-settings",
                        eventTitle: sysTitle,
                        eventYear: sysYear,
                        eventDateText: sysDateText,
                        countdownTarget: sysTarget,
                        organizerDept: sysDept,
                        hostCollege: sysCollege,
                        hostLocation: sysLocation,
                        tagline: sysTagline,
                        feedbackEnabled: sysFeedbackEnabled,
                        scoreboardEnabled: updated,
                        maxEventsSelection: Number(sysMaxEventsSelection) || 3,
                        heroDescription: sysHeroDescription,
                        aboutText: sysAboutText,
                        contactEmail: sysContactEmail,
                        contactPhone: sysContactPhone,
                        mapCoordinates: sysMapCoordinates
                      });
                      alert(`Symposium live scoreboard has been ${updated ? "ENABLED" : "DISABLED (STANDINGS FROZEN)"}!`);
                    }}
                    className={`px-3.5 py-2 rounded-xl font-bold font-mono transition-all text-xs cursor-pointer ${
                      sysScoreboardEnabled 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs" 
                        : "bg-red-500 text-white hover:bg-red-600 shadow-xs"
                    }`}
                  >
                    {sysScoreboardEnabled ? "Freeze Standings" : "Release Live"}
                  </button>
                </div>

                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <strong className="text-slate-900 font-extrabold text-sm">Total Registered Candidates</strong>
                    <p className="text-[11px] text-slate-700 font-semibold mt-1">Currently compiling leaderboard ranks for verified students</p>
                  </div>
                  <span className="text-2xl font-black text-blue-600 font-heading">{students.length} Students</span>
                </div>
              </div>

              {/* Ranks Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-xs font-heading font-bold text-blue-700">Current Standings & Score Points Console</h4>
                  <div className="relative w-64 text-xs">
                    <input
                      type="text"
                      placeholder="Search candidates by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-600" />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 text-xs shadow-md">
                  <div className="grid grid-cols-12 bg-slate-50/60 p-3.5 font-mono text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <div className="col-span-1 text-center">RANK</div>
                    <div className="col-span-4">CANDIDATE / INSTITUTION</div>
                    <div className="col-span-3">REGISTRATION ID</div>
                    <div className="col-span-4 text-right">SCORE POINTS & ACTIONS</div>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto scrollbar-thin">
                    {filteredStudents
                      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                      .map((student, index) => (
                        <div key={student.id} className="grid grid-cols-12 p-3.5 items-center hover:bg-indigo-50 border border-indigo-200/30 transition-colors">
                          <div className="col-span-1 text-center font-black text-slate-700 font-mono text-sm">
                            #{index + 1}
                          </div>
                          <div className="col-span-4">
                            <div className="font-extrabold text-slate-900 text-sm">{student.name}</div>
                            <div className="text-[11px] text-slate-600 font-mono mt-0.5">{student.college}</div>
                          </div>
                          <div className="col-span-3 font-mono font-bold text-slate-700">
                            {student.registrationId || student.participantId || "N/A"}
                          </div>
                          <div className="col-span-4 flex justify-end">
                            {editingStudentPointsId === student.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={overridePointsValue}
                                  onChange={(e) => setOverridePointsValue(parseInt(e.target.value) || 0)}
                                  className="bg-slate-50 border border-purple-500/40 rounded-lg p-1.5 text-slate-900 font-bold text-xs w-20 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] text-center font-mono font-bold"
                                />
                                <button
                                  onClick={() => handleOverrideScore(student.id, overridePointsValue)}
                                  className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingStudentPointsId(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-blue-600 font-bold font-mono text-sm">{student.xp || 0} Points</span>
                                <button
                                  onClick={() => { setEditingStudentPointsId(student.id); setOverridePointsValue(student.xp || 0); }}
                                  className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900/70 text-blue-700 border border-purple-500/40 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                                >
                                  Override
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {filteredStudents.length === 0 && (
                      <div className="p-8 text-center text-slate-600 font-mono italic">
                        No participants found in current filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Manage Coordinators */}
          {activeTab === "coordinators" && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Coordinator Form */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="text-blue-600" size={18} />
                    {editingCoordinatorId ? "Modify Coordinator" : "Register Coordinator"}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Add staff members to manage events & candidate check-ins.</p>
                </div>
                
                <form onSubmit={handleCreateOrUpdateCoordinator} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Coordinator Name *</label>
                    <input
                      type="text"
                      value={coordName}
                      onChange={(e) => setCoordName(e.target.value)}
                      placeholder="e.g. Prof. Alan Grace"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      value={coordEmail}
                      onChange={(e) => setCoordEmail(e.target.value)}
                      placeholder="Enter Email Address"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Passcode / Password</label>
                    <input
                      type="text"
                      value={coordPasscode}
                      onChange={(e) => setCoordPasscode(e.target.value)}
                      placeholder="Enter Passcode"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer font-mono uppercase text-xs"
                    >
                      {editingCoordinatorId ? "Save Profile" : "Create Profile"}
                    </button>
                    {editingCoordinatorId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCoordinatorId(null);
                          setCoordName("");
                          setCoordEmail("");
                          setCoordPasscode("");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Coordinator List */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Registered Event Coordinators ({filteredCoordinators.length} of {coordinatorsList.length})
                  </h3>
                </div>

                {/* Coordinator Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={15} />
                  <input
                    type="text"
                    placeholder="Search coordinators by name, email, department..."
                    value={coordSearchQuery}
                    onChange={(e) => setCoordSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {coordSearchQuery && (
                    <button
                      onClick={() => setCoordSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredCoordinators.map(c => (
                    <div key={c.id} className="p-3.5 bg-slate-50/70 border border-slate-200 hover:border-purple-300 rounded-xl flex justify-between items-center text-xs transition-all shadow-xs">
                      <div>
                        <strong className="text-slate-900 font-extrabold text-sm sm:text-base block">{c.name}</strong>
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">{c.email}{c.department ? ` • ${c.department}` : ""}{c.phone ? ` • ${c.phone}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCoordinatorId(c.id);
                            setCoordName(c.name);
                            setCoordEmail(c.email);
                            setCoordPasscode(c.password || "");
                          }}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900/70 text-blue-700 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoordinator(c.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredCoordinators.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No coordinators found matching your query.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Manage Volunteers */}
          {activeTab === "volunteers" && (
            <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-6 shadow-xs">
              
              {/* Header & Actions */}
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={18} /> Host Student Volunteer Roster (Organizing Department)
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Department of Computer Science student crew assigned to Gate Check-in, Food Counters, Venue QR Verification, and Helpdesk.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportVolunteersCSV(false)}
                    className="bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-300 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Export volunteer duty roster to CSV"
                  >
                    <Download size={13} />
                    <span>Export Roster CSV</span>
                  </button>
                  <button
                    onClick={handleOpenAddVolunteer}
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-500/20"
                  >
                    <PlusCircle size={14} />
                    <span>Register New Volunteer</span>
                  </button>
                </div>
              </div>

              {/* Station Metrics (4 Official Volunteer Roles) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 border border-sky-500/30">
                  <span className="text-[10px] text-blue-900 font-extrabold uppercase font-bold block">1. Registration</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {volunteers.filter(v => v.volunteerDuty?.station === "Registration" || v.volunteerDuty?.station === "Gate Entry" || v.volunteerDuty?.station === "Registration Desk").length} Crew
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">Gate Check-in & Passes</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 border border-purple-300">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">2. Venue Pass Verification</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {volunteers.filter(v => v.volunteerDuty?.station === "Event Venue Pass Verification" || v.volunteerDuty?.station === "Event Venue").length} Crew
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">Hall & Lab QR Scanners</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 border border-orange-200">
                  <span className="text-[10px] text-orange-500 uppercase font-bold block">3. Food Counters</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {volunteers.filter(v => v.volunteerDuty?.station === "Food Counters" || v.volunteerDuty?.station === "Food Counter").length} Crew
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">Refreshments & Dining</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-800 font-extrabold uppercase font-bold block">4. Helpdesk</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {volunteers.filter(v => v.volunteerDuty?.station === "Helpdesk" || v.volunteerDuty?.station === "Helpdesk & Logistics").length} Crew
                  </span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">Student Support & Guidance</span>
                </div>
              </div>

              {/* Search & Station Filter Controls */}
              <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
                {/* Station Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "All", label: `All Stations (${volunteers.length})` },
                    { id: "Registration", label: "Registration" },
                    { id: "Event Venue Pass Verification", label: "Event Venue Pass Verification" },
                    { id: "Food Counters", label: "Food Counters" },
                    { id: "Helpdesk", label: "Helpdesk" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setVolStationFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        volStationFilter === tab.id
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search volunteer by name, department, phone, email, assigned event/venue, or notes..."
                    value={volSearchQuery}
                    onChange={(e) => setVolSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {volSearchQuery && (
                    <button
                      onClick={() => setVolSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 text-xs font-mono font-bold"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>

              {/* Volunteer Roster Cards */}
              {filteredVolunteers.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">No volunteers found matching your filters</p>
                  <p className="text-[11px] text-slate-600 font-mono">Click &quot;Register New Volunteer&quot; to assign duties to team members.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredVolunteers.map(vol => {
                    const duty = vol.volunteerDuty;
                    const stationColor = 
                      duty?.station === "Registration" || duty?.station === "Gate Entry" ? "bg-blue-50 border border-blue-200 text-blue-900 font-bold border-sky-500/40" :
                      duty?.station === "Event Venue Pass Verification" || duty?.station === "Event Venue" ? "bg-indigo-50 border border-indigo-200 text-blue-700 border-purple-500/40" :
                      duty?.station === "Food Counters" || duty?.station === "Food Counter" ? "bg-amber-50 border border-amber-200 text-orange-600 border-amber-500/40" :
                      duty?.station === "Helpdesk" || duty?.station === "Helpdesk & Logistics" ? "bg-emerald-50 border border-emerald-200 text-emerald-700 border-emerald-500/40" :
                      "bg-indigo-950/90 text-indigo-300 border-indigo-500/40";

                    return (
                      <div 
                        key={vol.id}
                        className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 text-slate-900 font-bold transition-all shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          {/* Top row: Name & Station Badge */}
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-heading font-extrabold text-sm text-slate-900">{vol.name}</h4>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${stationColor}`}>
                                  {duty?.station || "General"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 font-semibold font-medium">{vol.department} • {vol.phone || "No Phone"}</p>
                            </div>

                            <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {duty?.status || "Active"}
                            </span>
                          </div>

                          {/* Duty Details Card */}
                          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono shadow-inner">
                            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold">
                              <MapPin size={13} className="text-blue-600" />
                              <span>{duty?.venueName || duty?.eventName || "Assigned Duty Station"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                              <Clock size={12} className="text-slate-600" />
                              <span>{duty?.shift || "Full Day Shift"}</span>
                            </div>

                            {duty?.notes && (
                              <p className="text-slate-700 font-semibold italic text-[11px] pt-1 border-t border-slate-200">
                                &ldquo;{duty.notes}&rdquo;
                              </p>
                            )}

                            <div className="text-[10px] text-slate-600 pt-1 flex justify-between items-center">
                              <span>Assigned by: {duty?.assignedBy || "Admin"}</span>
                              <span>Duty: <span className="text-slate-700 font-bold">{vol.volunteerDuty?.eventName || "General Gate & Helpdesk"}</span></span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
                          {/* Quick station reassign dropdown */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-slate-600">Reassign:</span>
                            <select
                              value={duty?.station || "Gate Entry"}
                              onChange={(e) => handleQuickAssignStation(vol.id, e.target.value as any)}
                              className="bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 font-bold font-mono font-bold cursor-pointer"
                            >
                              <option value="Registration">Registration</option>
                              <option value="Event Venue Pass Verification">Event Venue Pass Verification</option>
                              <option value="Food Counters">Food Counters</option>
                              <option value="Helpdesk">Helpdesk</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditVolunteer(vol)}
                              className="bg-indigo-50 border border-indigo-200 hover:bg-blue-600 text-blue-700 hover:text-blue-700 border border-purple-500/40 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                            >
                              Edit Duty
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVolunteer(vol.id, vol.name)}
                              className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/40 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                              title="Delete volunteer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: Manage Judges */}
          {activeTab === "judges" && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Judge Form */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={18} />
                    {editingJudgeId ? "Modify Judge Profile" : "Register Judge Evaluator"}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Assign external & internal domain experts to score AI events.</p>
                </div>
                
                <form onSubmit={handleCreateOrUpdateJudge} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Judge Name *</label>
                    <input
                      type="text"
                      value={judgeName}
                      onChange={(e) => setJudgeName(e.target.value)}
                      placeholder="Enter Name"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      value={judgeEmail}
                      onChange={(e) => setJudgeEmail(e.target.value)}
                      placeholder="Enter Email Address"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-700 font-semibold font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Passcode / Password</label>
                    <input
                      type="text"
                      value={judgePasscode}
                      onChange={(e) => setJudgePasscode(e.target.value)}
                      placeholder="Enter Passcode"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer font-mono uppercase text-xs"
                    >
                      {editingJudgeId ? "Save Profile" : "Register Judge"}
                    </button>
                    {editingJudgeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJudgeId(null);
                          setJudgeName("");
                          setJudgeEmail("");
                          setJudgePasscode("");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Judge List */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Registered Judge Evaluators ({filteredJudges.length} of {judgesList.length})
                  </h3>
                </div>

                {/* Judge Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-600" size={15} />
                  <input
                    type="text"
                    placeholder="Search judges by name, email, department..."
                    value={judgeSearchQuery}
                    onChange={(e) => setJudgeSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  {judgeSearchQuery && (
                    <button
                      onClick={() => setJudgeSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredJudges.map(j => (
                    <div key={j.id} className="p-3.5 bg-slate-50/70 border border-slate-200 hover:border-purple-300 rounded-xl flex justify-between items-center text-xs transition-all shadow-xs">
                      <div>
                        <strong className="text-slate-900 font-extrabold text-sm sm:text-base block">{j.name}</strong>
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">{j.email}{j.department ? ` • ${j.department}` : ""}{j.phone ? ` • ${j.phone}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingJudgeId(j.id);
                            setJudgeName(j.name);
                            setJudgeEmail(j.email);
                            setJudgePasscode(j.password || "");
                          }}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900/70 text-blue-700 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteJudge(j.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredJudges.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No judges found matching your query.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: Manage Colleges */}
          {activeTab === "colleges" && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* College Form */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={18} />
                    {editingCollegeId ? "Modify College" : "Register College"}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Manage recognized institutions for symposium participation.</p>
                </div>
                
                <form onSubmit={handleCreateOrUpdateCollege} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">College / University Name *</label>
                    <input
                      type="text"
                      value={colName}
                      onChange={(e) => setColName(e.target.value)}
                      placeholder="e.g. VIT Vellore"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Short Code *</label>
                    <input
                      type="text"
                      value={colCode}
                      onChange={(e) => setColCode(e.target.value)}
                      placeholder="e.g. VITVLR"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono uppercase focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-center text-xs uppercase font-mono tracking-wider"
                  >
                    {editingCollegeId ? "Apply Modifications" : "Save College Profile"}
                  </button>

                  {editingCollegeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCollegeId(null);
                        setColName("");
                        setColCode("");
                        setColPoints(0);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 py-2 rounded-xl text-center cursor-pointer text-xs font-bold font-mono"
                    >
                      Cancel Editing
                    </button>
                  )}
                </form>
              </div>

              {/* College List */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Recognized College Profiles ({colleges.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin text-xs">
                  {colleges.map((col) => (
                    <div key={col.id} className="p-4 bg-slate-50/70 border border-slate-200 hover:border-purple-300 rounded-xl flex justify-between items-center text-xs transition-all shadow-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-slate-900 font-extrabold text-sm sm:text-base">{col.name}</strong>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-300 rounded-md">{col.code}</span>
                        </div>
                        <span className="text-slate-600 font-mono text-xs">
                          Registered Students: <strong className="text-blue-600">{users.filter(u => u.role === "student" && u.college === col.name).length} Students</strong>
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteCollege(col.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Analytics Room */}
          {activeTab === "analytics" && (
            <div className="bg-slate-100/90 border border-slate-200 p-6 sm:p-7 rounded-2xl space-y-6 shadow-xl backdrop-blur-md">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={18} /> Competition & Registration Analytics
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">Real-time candidate registrations, event density, and campus check-in metrics.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* List count table representation */}
                <div className="space-y-4">
                  <h4 className="text-xs font-heading font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <Cpu size={14} className="text-blue-600" /> Event Registration Density
                  </h4>
                  <div className="space-y-3">
                    {missionChartData.length === 0 ? (
                      <div className="p-6 text-center text-slate-600 font-mono text-xs border border-dashed border-slate-200 rounded-xl">
                        No events configured for this symposium yet.
                      </div>
                    ) : (
                      missionChartData.map((data, idx) => (
                        <div key={idx} className="flex flex-col text-xs space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
                          <div className="flex justify-between font-mono items-center">
                            <span className="font-bold text-slate-900 font-bold">{data.name}</span>
                            <span className="text-blue-600 font-bold">{data.count} Registered</span>
                          </div>
                          <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${students.length ? (data.count / students.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Additional analytics details */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-heading font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Shield size={14} className="text-blue-600" /> Gate Check-in Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-center font-mono">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 border border-emerald-500/30 rounded-xl shadow-md">
                        <span className="block text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider font-mono">Entered Campus</span>
                        <strong className="text-3xl text-emerald-700 block mt-1.5 font-heading font-black">
                          {students.filter(s => s.checkInStatus?.checkedIn).length}
                        </strong>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 border border-orange-200 rounded-xl shadow-md">
                        <span className="block text-[10px] text-orange-500 font-bold uppercase tracking-wider font-mono">Pending Gate Entry</span>
                        <strong className="text-3xl text-orange-600 block mt-1.5 font-heading font-black">
                          {students.filter(s => !s.checkInStatus?.checkedIn).length}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/80 pt-3 flex items-start gap-2">
                    <span className="text-orange-500 text-sm shrink-0">💡</span>
                    <span><strong className="text-slate-900 font-extrabold">Live Campus Status:</strong> Gate check-in volunteers are equipped with the mobile QR scanner to validate participant passports upon entry.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Announcement Broadcaster */}
          {activeTab === "broadcast" && (
            <div className="bg-slate-100/90 border border-slate-200 p-6 sm:p-7 rounded-2xl space-y-5 shadow-xl backdrop-blur-md">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell className="text-blue-600" size={18} /> Live Announcement Broadcaster
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">Transmit immediate alert banners to all participant portals and public boards.</p>
              </div>
              
              <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Broadcast Title *</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Schedule Update: Quiz Arena Venue Shifted to Lab C"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Alert Category</label>
                    <select
                      value={annCategory}
                      onChange={(e) => setAnnCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none cursor-pointer"
                    >
                      <option value="General">General Announcement</option>
                      <option value="Mission">Event / Mission Specific</option>
                      <option value="Schedule">Schedule / Timeline</option>
                      <option value="Emergency">Emergency Notification</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Broadcast Message Content *</label>
                  <textarea
                    rows={4}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Write detailed broadcast message..."
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-sans focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/30 cursor-pointer text-center text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Volume2 size={15} />
                  <span>Transmit Live Broadcast</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4.5: Reports Room */}
          {activeTab === "reports" && (
            <div className="bg-slate-100/90 border border-slate-200 p-6 sm:p-7 rounded-2xl space-y-6 shadow-xl backdrop-blur-md">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                  <Download className="text-blue-600" size={18} /> Official Symposium Reports Center
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">Export structured CSV spreadsheets tracking registrations, meals, leaderboard rankings, and student feedback.</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Participant roster card */}
                <div className="bg-slate-50 border border-sky-500/30 hover:border-sky-400/60 rounded-2xl p-5 flex flex-col justify-between text-xs space-y-4 shadow-lg transition-all">
                  <div>
                    <h4 className="font-heading font-bold text-blue-900 font-extrabold text-sm mb-1">Attendee Roster</h4>
                    <p className="text-slate-600 text-xs">Full database of registered students, college, payment status, and events.</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleExportCSV(false)}
                      className="flex-1 bg-sky-700 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={() => handleExportCSV(true)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </div>

                {/* Food distribution card */}
                <div className="bg-slate-50 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-5 flex flex-col justify-between text-xs space-y-4 shadow-lg transition-all">
                  <div>
                    <h4 className="font-heading font-bold text-emerald-800 font-extrabold text-sm mb-1">Catering Logs</h4>
                    <p className="text-slate-600 text-xs">Student meals served records, timestamp stamps, and server verification logs.</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleExportFoodCSV(false)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={() => handleExportFoodCSV(true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </div>

                {/* Scoreboard rankings card */}
                <div className="bg-slate-50 border border-purple-300 hover:border-purple-400/60 rounded-2xl p-5 flex flex-col justify-between text-xs space-y-4 shadow-lg transition-all">
                  <div>
                    <h4 className="font-heading font-bold text-blue-700 text-sm mb-1">Leaderboard & Ranks</h4>
                    <p className="text-slate-600 text-xs">Breakdown of student evaluation points, leaderboard scores, and certificates.</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleExportScoreboardCSV(false)}
                      className="flex-1 bg-purple-700 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={() => handleExportScoreboardCSV(true)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </div>

                {/* Attendee Feedback report card */}
                <div className="bg-slate-50 border border-pink-500/30 hover:border-pink-400/60 rounded-2xl p-5 flex flex-col justify-between text-xs space-y-4 shadow-lg transition-all">
                  <div>
                    <h4 className="font-heading font-bold text-pink-400 text-sm mb-1">Attendee Feedback</h4>
                    <p className="text-slate-600 text-xs">Testimonials, rating metrics, comments, and answers to configured questions.</p>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleExportFeedbackCSV(false)}
                      className="flex-1 bg-pink-700 hover:bg-pink-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={() => handleExportFeedbackCSV(true)}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-center cursor-pointer text-[11px] tracking-wider flex items-center justify-center gap-1 shadow-md"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4.7: Password Manager */}
          {activeTab === "passwords" && (
            <div className="bg-white border border-purple-200 p-6 rounded-3xl space-y-6 shadow-xl">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                  <Key className="text-blue-600" size={18} /> Role Passwords & Credentials Console
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">Manage and update passwords for Event Admin, Coordinators, Judges, Volunteers, Food Staff, and Students.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                {/* Search Bar */}
                <div className="relative w-full md:w-72 font-mono">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-700 font-semibold" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={passManagerSearch}
                    onChange={(e) => setPassManagerSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold"
                  />
                </div>

                {/* Role Tabs */}
                <div className="flex flex-wrap gap-1.5 self-start md:self-auto font-mono">
                  {[
                    { id: "all", label: "ALL" },
                    { id: "admin", label: "ADMIN" },
                    { id: "coordinator", label: "COORDINATOR" },
                    { id: "judge", label: "JUDGE" },
                    { id: "volunteer", label: "VOLUNTEER" },
                    { id: "food_coordinator", label: "FOOD STAFF" },
                    { id: "stall_operator", label: "STALL OPERATORS" },
                    { id: "student", label: "STUDENT" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPassManagerRoleFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        passManagerRoleFilter === tab.id
                          ? "bg-blue-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-blue-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto text-xs border border-slate-200 rounded-2xl bg-slate-50 shadow-xl">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="text-[10px] text-slate-600 font-mono font-bold uppercase bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Name & Stall</th>
                      <th className="py-3 px-4">Email Address / Username</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Security Passcode</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {users
                      .filter(u => {
                        // EXCLUDE SYSTEM CONTROLLER / SUPER ADMIN FROM EVENT ADMIN PASSWORD MANAGER
                        if (u.role === "super_admin" || u.name?.toLowerCase().includes("system controller") || u.email === "superadmin@integra.ac.in" || u.id === "super-admin-root") {
                          return false;
                        }
                        const matchesSearch = u.name.toLowerCase().includes(passManagerSearch.toLowerCase()) || 
                                              u.email.toLowerCase().includes(passManagerSearch.toLowerCase()) ||
                                              (u.assignedStallName || "").toLowerCase().includes(passManagerSearch.toLowerCase());
                        const matchesRole = passManagerRoleFilter === "all" || u.role === passManagerRoleFilter;
                        return matchesSearch && matchesRole;
                      })
                      .map(u => (
                      <tr key={u.id} className="hover:bg-indigo-50 border border-indigo-200 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 font-sans block text-sm">{u.name}</span>
                          {u.assignedStallName && (
                            <span className="text-[10px] text-blue-700 font-mono flex items-center gap-1 mt-0.5">
                              🏪 {u.assignedStallName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${
                            u.role === "admin" ? "bg-indigo-50 border border-indigo-200 text-blue-700 border-purple-500/40" :
                            u.role === "coordinator" ? "bg-blue-50 border border-blue-200 text-blue-900 font-bold border-sky-500/40" :
                            u.role === "judge" ? "bg-emerald-50 border border-emerald-200 text-emerald-700 border-emerald-500/40" :
                            u.role === "volunteer" ? "bg-amber-50 border border-amber-200 text-orange-600 border-amber-500/40" :
                            u.role === "food_coordinator" ? "bg-pink-950 text-pink-300 border-pink-500/40" :
                            u.role === "stall_operator" ? "bg-cyan-950 text-blue-800 border-cyan-500/40 font-black" :
                            "bg-slate-100 text-slate-700 border-slate-300"
                          }`}>
                            {u.role === "food_coordinator" ? "FOOD MANAGER" : u.role === "stall_operator" ? "STALL OPERATOR" : u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {editingUserId === u.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                placeholder="New passcode..."
                                className="bg-white border border-purple-500 rounded-xl p-1.5 text-slate-900 font-bold text-xs w-36 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
                                  let res = "";
                                  for (let i = 0; i < 12; i++) {
                                    res += chars.charAt(Math.floor(Math.random() * chars.length));
                                  }
                                  setNewUserPassword(res);
                                }}
                                title="Generate Strong Random Passcode"
                                className="px-2 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded text-[10px] font-mono font-bold cursor-pointer"
                              >
                                🎲 Strong
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded font-bold text-blue-700">
                                {visiblePasswordMap[u.id] ? (u.password || "••••••••") : "••••••••"}
                              </code>
                              <button
                                type="button"
                                onClick={() => setVisiblePasswordMap(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer transition-colors"
                                title={visiblePasswordMap[u.id] ? "Hide Password" : "Reveal Password"}
                              >
                                {visiblePasswordMap[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingUserId === u.id ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdatePassword(u.id, newUserPassword)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl cursor-pointer text-xs font-mono font-bold shadow-md shadow-purple-600/30"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingUserId(null); setNewUserPassword(""); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingUserId(u.id); setNewUserPassword(u.password || "student123"); }}
                              className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900 text-blue-700 border border-purple-500/40 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-mono font-bold transition-all"
                            >
                              Edit Passcode
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Manage Gallery */}
          {activeTab === "gallery" && (
            <div className="grid md:grid-cols-3 gap-6 text-xs">
              {/* Photo Form */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="text-blue-600" size={18} /> Add Gallery Photo
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Upload highlight images from symposium events and awards.</p>
                </div>
                
                <form onSubmit={handleCreateGalleryItem} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Select Photo to Upload *</label>
                    {newGalPhotoData ? (
                      <div className="relative group rounded-xl overflow-hidden border border-purple-500/40 bg-indigo-50 border border-indigo-200 p-2 text-center">
                        <img
                          src={newGalPhotoData}
                          alt="Upload Preview"
                          className="w-full h-36 object-cover rounded-lg shadow-xs"
                        />
                        <div className="mt-2 flex items-center justify-between px-1">
                          <span className="text-[10px] font-mono text-slate-600 truncate max-w-[160px] font-bold">{newGalFileName || "gallery_photo.jpg"}</span>
                          <button
                            type="button"
                            onClick={() => { setNewGalPhotoData(""); setNewGalFileName(""); }}
                            className="text-red-500 hover:text-red-700 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            Remove ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-purple-500/40 hover:border-[#7C3AED] rounded-xl p-4 text-center bg-indigo-50 border border-indigo-200/30 hover:bg-indigo-50 border border-indigo-200/60 transition-all cursor-pointer relative">
                        <input
                          type="file"
                          accept="image/*"
                          required
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewGalFileName(file.name);
                              const reader = new FileReader();
                              reader.onload = (re) => {
                                const rawData = re.target?.result as string;
                                try {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement("canvas");
                                    const MAX_DIM = 800;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > height) {
                                      if (width > MAX_DIM) {
                                        height *= MAX_DIM / width;
                                        width = MAX_DIM;
                                      }
                                    } else {
                                      if (height > MAX_DIM) {
                                        width *= MAX_DIM / height;
                                        height = MAX_DIM;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext("2d");
                                    ctx?.drawImage(img, 0, 0, width, height);
                                    const compressed = canvas.toDataURL("image/jpeg", 0.75);
                                    setNewGalPhotoData(compressed);
                                  };
                                  img.onerror = () => {
                                    setNewGalPhotoData(rawData);
                                  };
                                  img.src = rawData;
                                } catch {
                                  setNewGalPhotoData(rawData);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none py-2">
                          <ImageIcon className="text-blue-600" size={28} />
                          <span className="font-bold text-slate-900 font-bold text-xs">Click to Browse & Upload Photo</span>
                          <span className="text-[10px] text-slate-600 font-mono">PNG, JPG, WebP (auto-optimized)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Photo Tag / Label</label>
                    <input
                      type="text"
                      value={newGalTag}
                      onChange={(e) => setNewGalTag(e.target.value)}
                      placeholder="e.g. INTEGRA MEMORY #2026"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newGalPhotoData}
                    className={`w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs font-mono uppercase flex items-center justify-center gap-2 ${
                      !newGalPhotoData ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>Upload Photo to Showcase</span>
                    <Sparkles size={14} />
                  </button>
                </form>
              </div>

              {/* Photo Grid */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Gallery Showcase Photos ({galleryItems.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                  {galleryItems.map(item => (
                    <div key={item.id} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                      <img
                        src={item.url}
                        alt={item.tag}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-100/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5">
                        <span className="text-xs font-mono font-extrabold text-slate-900">{item.tag}</span>
                        <button
                          onClick={() => handleDeleteGalleryItem(item.id)}
                          className="self-end bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {galleryItems.length === 0 && (
                    <div className="col-span-2 p-8 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No gallery photos registered in the system cache.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Manage FAQs */}
          {activeTab === "faqs" && (
            <div className="grid md:grid-cols-3 gap-6 text-xs">
              {/* FAQ Form */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="text-blue-600" size={18} />
                    {editingFAQId ? "Modify FAQ Question" : "Create FAQ Question"}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Help participants with registration, rules, and accommodation answers.</p>
                </div>
                
                <form onSubmit={handleCreateOrUpdateFAQ} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Question Text *</label>
                    <input
                      type="text"
                      value={newFAQQuestion}
                      onChange={(e) => setNewFAQQuestion(e.target.value)}
                      placeholder="e.g. Can I register on the spot?"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Answer Description *</label>
                    <textarea
                      rows={4}
                      value={newFAQAnswer}
                      onChange={(e) => setNewFAQAnswer(e.target.value)}
                      placeholder="e.g. Yes, spot registration is open from 8:30 AM at the Main Entrance..."
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs font-mono uppercase"
                    >
                      {editingFAQId ? "Save Changes" : "Publish FAQ"}
                    </button>
                    {editingFAQId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFAQId(null);
                          setNewFAQQuestion("");
                          setNewFAQAnswer("");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* FAQ List */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900">
                    Frequently Asked Queries ({faqItems.length})
                  </h3>
                </div>
                
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                  {faqItems.map(faq => (
                    <div key={faq.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-purple-300 text-xs flex justify-between items-start gap-4 transition-all shadow-xs">
                      <div className="space-y-1">
                        <strong className="text-slate-900 font-extrabold text-sm block">Q: {faq.q}</strong>
                        <p className="text-slate-600 leading-relaxed text-xs">A: {faq.a}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingFAQId(faq.id);
                            setNewFAQQuestion(faq.q);
                            setNewFAQAnswer(faq.a);
                          }}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900/70 text-blue-700 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFAQ(faq.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {faqItems.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-700 font-semibold italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No FAQs registered in the system cache.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Feedback Control */}
          {activeTab === "feedback" && (
            <div className="grid md:grid-cols-3 gap-6 text-xs">
              {/* Left Column: Manage Feedback Questions */}
              <div className="bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-4 h-fit shadow-xs">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="text-blue-600" size={18} /> Manage Feedback Questions
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">Customize survey questions asked in student portals.</p>
                </div>
                
                <form onSubmit={handleAddFeedbackQuestion} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Question Text *</label>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="e.g. Rate the laboratory support?"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-xs font-mono uppercase"
                  >
                    Add Question
                  </button>
                </form>

                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <span className="text-[10px] text-slate-600 font-mono font-bold uppercase block">Active Survey Questions ({sysFeedbackQuestions.length})</span>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {sysFeedbackQuestions.map((q, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs">
                        <span className="text-xs text-slate-900 font-bold font-medium leading-tight">{q}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeedbackQuestion(idx)}
                          className="text-red-500 hover:text-red-700 px-1 font-bold cursor-pointer"
                          title="Remove Question"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {sysFeedbackQuestions.length === 0 && (
                      <p className="text-xs text-slate-700 font-semibold italic">No questions configured. Student portal will fall back to overall rating.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Feedback Logs */}
              <div className="md:col-span-2 bg-slate-100/90 border border-slate-200 backdrop-blur-md p-6 rounded-2xl space-y-6 shadow-xs">
                <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-heading font-extrabold text-slate-900">INTEGRA Attendee Feedback Logs</h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">Rating cards and testimonials submitted dynamically from student consoles.</p>
                  </div>
                  
                  {/* Stats block */}
                  <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-amber-800 font-mono font-bold uppercase block">Average Rating</span>
                    <span className="text-xl font-bold font-mono text-amber-600">
                      {feedbacks.length > 0
                        ? (feedbacks.reduce((acc, curr) => {
                            if (typeof curr.rating === "number" && !curr.ratings) {
                              return acc + curr.rating;
                            } else if (curr.ratings && typeof curr.ratings === "object") {
                              const ratingsArray = Object.values(curr.ratings) as number[];
                              if (ratingsArray.length > 0) {
                                return acc + (ratingsArray.reduce((s, r) => s + r, 0) / ratingsArray.length);
                              }
                            }
                            return acc + 5;
                          }, 0) / feedbacks.length).toFixed(1)
                        : "0.0"} / 5.0 ★
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/60 p-4 rounded-xl border border-slate-200 text-xs">
                  {/* Search Bar */}
                  <div className="relative w-full md:w-72">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-600" />
                    <input
                      type="text"
                      placeholder="Search comments or student name..."
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>

                  {/* Actions */}
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to clear all feedback submissions?")) {
                        await mockDB.clearFeedbacks();
                        fetchData();
                        alert("Feedback database cleared successfully!");
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Clear Feedbacks
                  </button>
                </div>

                {/* Feedback Cards */}
                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                  {feedbacks
                    .filter(fb => 
                      fb.comment.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                      fb.studentName.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                      fb.college.toLowerCase().includes(feedbackSearch.toLowerCase())
                    )
                    .map(fb => (
                      <div key={fb.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2 text-xs shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-slate-900 font-extrabold text-sm block">{fb.studentName}</strong>
                            <span className="text-xs text-slate-600 font-mono block">{fb.college}</span>
                          </div>
                          <span className="text-[11px] text-slate-600 font-mono">{fb.timestamp}</span>
                        </div>

                        {/* Star breakdown per question if configured */}
                        {fb.ratings && typeof fb.ratings === "object" ? (
                          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5 text-slate-900 font-bold">
                            {Object.entries(fb.ratings).map(([questionText, ratingVal]: any, qIdx) => (
                              <div key={qIdx} className="flex justify-between items-center text-xs">
                                <span className="text-slate-700 font-medium">{questionText}</span>
                                <div className="flex text-[#FFB800] gap-0.5 text-sm">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i}>{i < ratingVal ? "★" : "☆"}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-700 font-bold">Overall Rating:</span>
                            <div className="flex text-[#FFB800] gap-0.5 text-sm">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i}>{i < fb.rating ? "★" : "☆"}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-slate-700 italic bg-slate-50/70 p-3 rounded-xl border border-slate-200 leading-relaxed font-sans mt-1">
                          &ldquo;{fb.comment}&rdquo;
                        </p>
                      </div>
                    ))}
                  {feedbacks.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-700 font-semibold italic font-mono bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                      No attendee feedback submissions detected in storage.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4.8: System Settings */}
          {activeTab === "settings" && (
            <div className="bg-slate-100/90 border border-slate-200 p-6 sm:p-7 rounded-2xl space-y-6 shadow-xl backdrop-blur-md">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2">
                  <Settings className="text-blue-600" size={18} /> Global Symposium Parameters & Countdown
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">Configure metadata, dates, countdown timers, host departments, and landing page content.</p>
              </div>

              <form onSubmit={handleUpdateSettings} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Title / Brand *</label>
                    <input
                      type="text"
                      value={sysTitle}
                      onChange={(e) => setSysTitle(e.target.value)}
                      placeholder="e.g. INTEGRA 2026"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Academic Year *</label>
                    <input
                      type="text"
                      value={sysYear}
                      onChange={(e) => setSysYear(e.target.value)}
                      placeholder="e.g. 2026"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Date Text *</label>
                    <input
                      type="text"
                      value={sysDateText}
                      onChange={(e) => setSysDateText(e.target.value)}
                      placeholder="e.g. September 11, 2026"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Countdown Target (ISO-8601) *</label>
                    <input
                      type="text"
                      value={sysTarget}
                      onChange={(e) => setSysTarget(e.target.value)}
                      placeholder="e.g. 2026-09-11T09:00:00"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host Department *</label>
                    <input
                      type="text"
                      value={sysDept}
                      onChange={(e) => setSysDept(e.target.value)}
                      placeholder="e.g. PG & Research Department of Computer Science"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host College / Institution *</label>
                    <input
                      type="text"
                      value={sysCollege}
                      onChange={(e) => setSysCollege(e.target.value)}
                      placeholder="e.g. Don Bosco College (Co-Ed)"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host Campus Location *</label>
                    <input
                      type="text"
                      value={sysLocation}
                      onChange={(e) => setSysLocation(e.target.value)}
                      placeholder="e.g. Yelagiri Hills"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Event Tagline / Subtitle *</label>
                    <input
                      type="text"
                      value={sysTagline}
                      onChange={(e) => setSysTagline(e.target.value)}
                      placeholder="e.g. INTER-COLLEGIATE TECHNICAL SYMPOSIUM"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Maximum Events Allowed per Student</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={sysMaxEventsSelection || ""}
                      onChange={(e) => setSysMaxMissionsSelection(e.target.value === "" ? ("" as any) : Number(e.target.value))}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Landing Page Customizations */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h4 className="text-xs font-heading font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <Globe size={14} className="text-blue-600" /> Landing Page Customization
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Hero Section Description Text</label>
                      <textarea
                        rows={3}
                        value={sysHeroDescription}
                        onChange={(e) => setSysHeroDescription(e.target.value)}
                        placeholder="Hero paragraph..."
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-sans focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">About Section Description Text</label>
                      <textarea
                        rows={4}
                        value={sysAboutText}
                        onChange={(e) => setSysAboutText(e.target.value)}
                        placeholder="Detailed About text..."
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-sans focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Contact Email Address</label>
                      <input
                        type="email"
                        value={sysContactEmail}
                        onChange={(e) => setSysContactEmail(e.target.value)}
                        placeholder="e.g. contact@integra.in"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Contact Phone Number</label>
                      <input
                        type="text"
                        value={sysContactPhone}
                        onChange={(e) => setSysContactPhone(e.target.value)}
                        placeholder="e.g. +91 99999 88888"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Campus Map Coordinates</label>
                      <input
                        type="text"
                        value={sysMapCoordinates}
                        onChange={(e) => setSysMapCoordinates(e.target.value)}
                        placeholder="e.g. 12.5768° N, 78.6366° E"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 my-4">
                  <label className="flex items-start gap-3 text-xs font-mono text-slate-900 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sysFeedbackEnabled}
                      onChange={(e) => setSysFeedbackEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-purple-600 focus:ring-0 cursor-pointer mt-0.5 accent-purple-600"
                    />
                    <div>
                      <span className="block font-extrabold text-slate-900">Enable Student Feedback Portal</span>
                      <span className="text-[11px] text-slate-600 font-sans block mt-0.5">Allows participants to submit event feedback from their dashboard at the end of the symposium.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 text-xs font-mono text-slate-900 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sysScoreboardEnabled}
                      onChange={(e) => setSysScoreboardEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-purple-600 focus:ring-0 cursor-pointer mt-0.5 accent-purple-600"
                    />
                    <div>
                      <span className="block font-extrabold text-slate-900">Enable Scoreboard Standings</span>
                      <span className="text-[11px] text-slate-600 font-sans block mt-0.5">Controls whether the live scoreboard and rankings leaderboard are active and visible.</span>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/30 cursor-pointer text-center text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save size={15} />
                  <span>Save Global System Parameters</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* MODAL 1: Payment Verification Modal */}
      {verifyModalStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={18} /> Confirm Offline Payment
              </h3>
              <button 
                onClick={() => setVerifyModalStudent(null)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1">
              <div className="font-extrabold text-slate-900 text-sm">{verifyModalStudent.name}</div>
              <div className="text-slate-600 font-mono text-[11px]">ID: {verifyModalStudent.participantId || verifyModalStudent.id} • {verifyModalStudent.college}</div>
              <div className="text-emerald-700 font-mono font-bold text-xs pt-1">
                Required Entry Fee: ₹{activeSymposium?.regFee || 200}
              </div>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Payment Method *</label>
                <select
                  value={verifyPaymentMode}
                  onChange={(e) => setVerifyPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cash">💵 Physical Cash at Registration Desk</option>
                  <option value="UPI Transfer">📱 Direct UPI Transfer at Desk</option>
                  <option value="Bank Transfer">🏦 Institutional Bank Transfer / NEFT</option>
                  <option value="Other Offline Payment">🧾 Other Offline Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Desk Remarks / Notes</label>
                <input
                  type="text"
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                  placeholder="e.g. Receipt #4092, Verified by desk team"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalStudent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Approve & Issue Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Payment Rejection Modal */}
      {rejectModalStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-bold text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={18} /> Reject Registration Entry
              </h3>
              <button 
                onClick={() => setRejectModalStudent(null)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1">
              <div className="font-extrabold text-slate-900 text-sm">{rejectModalStudent.name}</div>
              <div className="text-slate-600 font-mono text-[11px]">ID: {rejectModalStudent.participantId || rejectModalStudent.id} • {rejectModalStudent.college}</div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Rejection Reason *</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this entry is rejected (e.g. Fee not paid, Duplicate entry, Invalid college credentials)..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalStudent(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-red-600/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create New Symposium Modal */}
      {newSymposiumModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <PlusCircle className="text-blue-600" size={18} /> Initialize New Symposium Edition
              </h3>
              <button 
                onClick={() => setNewSymposiumModalOpen(false)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSymposium} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium ID (Unique) *</label>
                  <input
                    type="text"
                    value={newSymData.id}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="e.g. integra-2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Name *</label>
                  <input
                    type="text"
                    value={newSymData.name}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. INTEGRA"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Edition Year *</label>
                  <input
                    type="text"
                    value={newSymData.year}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="e.g. 2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Academic Year *</label>
                  <input
                    type="text"
                    value={newSymData.academicYear}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, academicYear: e.target.value }))}
                    placeholder="e.g. AY27-28"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Tagline / Subtitle *</label>
                <input
                  type="text"
                  value={newSymData.tagline}
                  onChange={(e) => setNewSymData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. INTER-COLLEGE TECHNICAL SYMPOSIUM"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Date *</label>
                  <input
                    type="text"
                    value={newSymData.symposiumDate}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, symposiumDate: e.target.value }))}
                    placeholder="e.g. September 10, 2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Registration Fee (₹) *</label>
                  <input
                    type="number"
                    value={newSymData.regFee}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, regFee: Number(e.target.value) }))}
                    placeholder="150"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host Venue *</label>
                <input
                  type="text"
                  value={newSymData.venue}
                  onChange={(e) => setNewSymData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="e.g. Don Bosco College (Co-Ed), Yelagiri Hills"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewSymposiumModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-500/20"
                >
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Clone Previous Symposium Modal */}
      {cloneModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Copy className="text-blue-900 font-extrabold" size={18} /> Deep Clone Previous Symposium Structure
              </h3>
              <button 
                onClick={() => setCloneModalOpen(false)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-slate-700 text-[11px] leading-relaxed">
              💡 <strong>Clone Engine:</strong> Duplicates all event blueprints, rules, venues, schedule slots, and evaluation criteria into a new edition, while resetting participants, payments, teams, and scores to 0.
            </div>

            <form onSubmit={handleCloneSymposium} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Source Edition to Clone From *</label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-medium focus:ring-2 focus:ring-[#0284C7]"
                >
                  {symposiums.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.year} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Target ID *</label>
                  <input
                    type="text"
                    value={newSymData.id}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="e.g. integra-2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Year *</label>
                  <input
                    type="text"
                    value={newSymData.year}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="e.g. 2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Academic Year *</label>
                  <input
                    type="text"
                    value={newSymData.academicYear}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, academicYear: e.target.value }))}
                    placeholder="e.g. AY27-28"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">New Date *</label>
                  <input
                    type="text"
                    value={newSymData.symposiumDate}
                    onChange={(e) => setNewSymData(prev => ({ ...prev, symposiumDate: e.target.value }))}
                    placeholder="e.g. September 10, 2027"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCloneModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 shadow-md text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-sky-500/20"
                >
                  Execute Clone & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit Symposium Configuration Modal */}
      {editSymposiumModalOpen && editSymData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Edit className="text-blue-600" size={18} /> Edit Symposium Configuration: {editSymData.name} ({editSymData.id})
              </h3>
              <button 
                onClick={() => setEditSymposiumModalOpen(false)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSymposium} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Title / Name *</label>
                  <input
                    type="text"
                    value={editSymData.name}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    placeholder="e.g. INTEGRA"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Theme / Sub-header</label>
                  <input
                    type="text"
                    value={editSymData.theme || ""}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, theme: e.target.value }) : null)}
                    placeholder="e.g. Powered by AI"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Tagline / Official Subtitle *</label>
                <input
                  type="text"
                  value={editSymData.tagline || ""}
                  onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, tagline: e.target.value }) : null)}
                  placeholder="e.g. INTER-COLLEGE TECHNICAL SYMPOSIUM"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Edition Year *</label>
                  <input
                    type="text"
                    value={editSymData.year}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, year: e.target.value }) : null)}
                    placeholder="e.g. 2026"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Academic Year *</label>
                  <input
                    type="text"
                    value={editSymData.academicYear}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, academicYear: e.target.value }) : null)}
                    placeholder="e.g. AY26-27"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Entry Fee (₹) *</label>
                  <input
                    type="number"
                    value={editSymData.regFee || 200}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, regFee: Number(e.target.value) }) : null)}
                    placeholder="150"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Symposium Date *</label>
                  <input
                    type="text"
                    value={editSymData.symposiumDate}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, symposiumDate: e.target.value }) : null)}
                    placeholder="e.g. September 11, 2026"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Max Events Per Attendee *</label>
                  <input
                    type="number"
                    value={editSymData.maxEventsPerParticipant || 3}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, maxEventsPerParticipant: Number(e.target.value) }) : null)}
                    min={1}
                    max={8}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Host Venue & Location *</label>
                <input
                  type="text"
                  value={editSymData.venue}
                  onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, venue: e.target.value }) : null)}
                  placeholder="e.g. Don Bosco College (Co-Ed), Yelagiri Hills"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={editSymData.contactEmail || ""}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, contactEmail: e.target.value }) : null)}
                    placeholder="e.g. integra@donbosco.ac.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    value={editSymData.contactPhone || ""}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, contactPhone: e.target.value }) : null)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSymData.registrationOpen}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, registrationOpen: e.target.checked }) : null)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-[#7C3AED]"
                  />
                  <span className="font-mono text-[11px] font-extrabold text-slate-900">Registration Open</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSymData.resultsPublished || false}
                    onChange={(e) => setEditSymData(prev => prev ? ({ ...prev, resultsPublished: e.target.checked }) : null)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-[#7C3AED]"
                  />
                  <span className="font-mono text-[11px] font-extrabold text-slate-900">Results Published to Portals</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSymposiumModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Add / Edit Volunteer Modal */}
      {volunteerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl border border-slate-300 text-slate-900 font-bold max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="text-blue-600" size={18} />
                {volFormData.id ? `Modify Volunteer: ${volFormData.name}` : "Register New Volunteer"}
              </h3>
              <button 
                onClick={() => setVolunteerModalOpen(false)} 
                className="text-slate-600 hover:text-slate-600 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVolunteer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Volunteer Full Name *</label>
                  <input
                    type="text"
                    value={volFormData.name || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Department / Class *</label>
                  <input
                    type="text"
                    value={volFormData.department || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. III B.Sc Computer Science"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={volFormData.email || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. rahul@donbosco.ac.in"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Mobile / WhatsApp No. *</label>
                  <input
                    type="text"
                    value={volFormData.phone || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    {volFormData.id ? "New Volunteer Password (leave blank to keep current)" : "Volunteer Portal Password *"}
                  </label>
                  <input
                    type="text"
                    value={volFormData.password || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={volFormData.id ? "Leave blank to keep existing passcode" : "Enter Passcode (e.g. volunteer123)"}
                    required={!volFormData.id}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-mono font-bold focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Shift / Working Hours *</label>
                  <select
                    value={volFormData.volunteerDuty?.shift || "Full Day"}
                    onChange={(e) => setVolFormData(prev => ({
                      ...prev,
                      volunteerDuty: { ...prev.volunteerDuty!, shift: e.target.value as any }
                    }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  >
                    <option value="Full Day">Full Day (08:30 AM - 05:30 PM)</option>
                    <option value="Morning Shift (08:30 AM - 01:30 PM)">Morning Shift (08:30 AM - 01:30 PM)</option>
                    <option value="Afternoon Shift (01:30 PM - 05:30 PM)">Afternoon Shift (01:30 PM - 05:30 PM)</option>
                  </select>
                </div>
              </div>

              {/* Station Duty Category (4 Standard Stations) */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl border border-purple-500/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-blue-700 font-mono text-[10px] font-bold uppercase mb-1.5">Duty Station / Area *</label>
                    <select
                      value={volFormData.volunteerDuty?.station || "Registration"}
                      onChange={(e) => {
                        const station = e.target.value as any;
                        let venueDefault = "Campus Main Gate Entry";
                        if (station === "Food Counters") venueDefault = "Dining Hall - Counter 1 (Buffet)";
                        if (station === "Event Venue Pass Verification") venueDefault = "Event Seminar Hall / Lab Entrance";
                        if (station === "Helpdesk") venueDefault = "Helpdesk - Campus Foyer";

                        setVolFormData(prev => ({
                          ...prev,
                          volunteerDuty: {
                            ...prev.volunteerDuty!,
                            station,
                            venueName: venueDefault,
                            eventId: undefined,
                            eventName: undefined
                          }
                        }));
                      }}
                      className="w-full bg-slate-50 border border-purple-500/40 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500 outline-none font-bold cursor-pointer"
                    >
                      <option value="Registration">🎫 Registration</option>
                      <option value="Event Venue Pass Verification">🏷️ Event Venue Pass Verification</option>
                      <option value="Food Counters">☕ Food Counters</option>
                      <option value="Helpdesk">ℹ️ Helpdesk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-700 font-mono text-[10px] font-bold uppercase mb-1.5">Specific Counter / Location *</label>
                    <input
                      type="text"
                      value={volFormData.volunteerDuty?.venueName || ""}
                      onChange={(e) => setVolFormData(prev => ({
                        ...prev,
                        volunteerDuty: { ...prev.volunteerDuty!, venueName: e.target.value }
                      }))}
                      placeholder="e.g. Main Gate Desk / Dining Counter 1"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-blue-700 font-mono text-[10px] font-bold uppercase mb-1.5">Duty Instructions / Notes</label>
                  <input
                    type="text"
                    value={volFormData.volunteerDuty?.notes || ""}
                    onChange={(e) => setVolFormData(prev => ({
                      ...prev,
                      volunteerDuty: { ...prev.volunteerDuty!, notes: e.target.value }
                    }))}
                    placeholder="e.g. Verify food token QR codes and distribute snack packets."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVolunteerModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-700 text-slate-900 font-bold border border-slate-300 font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-purple-600/30 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {volFormData.id ? "Save Volunteer Profile" : "Register Volunteer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Create / Edit Refreshment Stall ─────────────────────────── */}
      {stallModalOpen && editingStall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-purple-500/40 max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto font-sans text-slate-900 font-bold">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Store className="text-blue-600" size={18} />
                {refreshmentStalls.some(s => s.id === editingStall.id) ? `Edit Stall: ${editingStall.name}` : "Create New Refreshment Stall"}
              </h3>
              <button
                onClick={() => setStallModalOpen(false)}
                className="text-slate-600 hover:text-blue-700 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStall} className="space-y-3 font-mono text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Stall Name *</label>
                  <input
                    type="text"
                    value={editingStall.name || ""}
                    onChange={(e) => setEditingStall({ ...editingStall, name: e.target.value })}
                    placeholder="e.g. Snacks Hub / Juice Corner"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Campus Location *</label>
                  <input
                    type="text"
                    value={editingStall.location || ""}
                    onChange={(e) => setEditingStall({ ...editingStall, location: e.target.value })}
                    placeholder="e.g. Main Courtyard / Canteen Block"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Contact Coordinator</label>
                  <input
                    type="text"
                    value={editingStall.contactPerson || ""}
                    onChange={(e) => setEditingStall({ ...editingStall, contactPerson: e.target.value })}
                    placeholder="e.g. John Doe (Staff)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingStall.contactPhone || ""}
                    onChange={(e) => setEditingStall({ ...editingStall, contactPhone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Stall Status</label>
                  <select
                    value={editingStall.status || "ACTIVE"}
                    onChange={(e) => setEditingStall({ ...editingStall, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Open for Claims)</option>
                    <option value="INACTIVE">INACTIVE (Closed / Paused)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Pricing Mode</label>
                  <select
                    value={editingStall.pricingMode || "ITEM_BASED"}
                    onChange={(e) => setEditingStall({ ...editingStall, pricingMode: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="ITEM_BASED">Item-Based Pricing (Menu Buttons)</option>
                    <option value="MANUAL">Manual Amount Entry</option>
                  </select>
                </div>
              </div>

              {/* Operator Credentials Section */}
              <div className="bg-slate-50 border border-purple-300 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-blue-600" />
                  <span className="font-bold text-blue-700 uppercase text-[10.5px]">
                    Stall Operator Login Credentials (For /stall Portal)
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Operator Username / Login Email *</label>
                    <input
                      type="text"
                      value={editingStall.operatorUsername || editingStall.operatorEmail || ""}
                      onChange={(e) => setEditingStall({ ...editingStall, operatorUsername: e.target.value, operatorEmail: e.target.value })}
                      placeholder="e.g. stall.snacks@integra.in"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Operator Passcode / Password *</label>
                    <input
                      type="text"
                      value={editingStall.operatorPassword || ""}
                      onChange={(e) => setEditingStall({ ...editingStall, operatorPassword: e.target.value })}
                      placeholder="e.g. snacks123"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-emerald-800 font-extrabold font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 leading-normal">
                  💡 The stall vendor or student volunteer can sign into <span className="text-blue-700 font-bold">/stall</span> or <span className="text-blue-700 font-bold">/login</span> using this username and password to process  tokens.
                </p>
              </div>

              {/* Menu Items Editor */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">
                    Stall Menu Items & Prices ({editingStall.items?.length || 0})
                  </span>
                </div>

                {/* Existing Items */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {editingStall.items?.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-extrabold text-slate-900">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-800 font-extrabold font-black">₹{item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStallItem(item.id)}
                          className="text-rose-900 font-extrabold hover:text-rose-900 font-bold p-1 cursor-pointer font-bold"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Item Row */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="New Item Name (e.g. Samosa)"
                    value={newStallItemName}
                    onChange={(e) => setNewStallItemName(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl p-2 text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl px-2">
                    <span className="text-slate-600 text-xs mr-1">₹</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newStallItemPrice}
                      onChange={(e) => setNewStallItemPrice(Number(e.target.value))}
                      className="w-12 text-emerald-800 font-extrabold font-black text-xs outline-none bg-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStallItem}
                    className="bg-indigo-50 border border-indigo-200 hover:bg-purple-900 text-blue-700 border border-purple-500/50 px-3 py-2 rounded-xl font-bold cursor-pointer transition-all"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStallModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-600/30"
                >
                  Save Stall Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Reverse Refreshment Transaction ─────────────────────────── */}
      {reversalModalOpen && reversalTargetTxn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-500/50 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs font-sans text-slate-900 font-bold">
            <div className="flex justify-between items-center border-b border-red-500/30 pb-3">
              <h3 className="font-heading font-black text-sm text-rose-900 font-extrabold flex items-center gap-2">
                <RotateCcw className="text-rose-900 font-extrabold" size={18} />
                CONFIRM TRANSACTION REVERSAL
              </h3>
              <button
                onClick={() => setReversalModalOpen(false)}
                className="text-slate-600 hover:text-blue-700 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="space-y-3 font-mono text-xs">
              <div className="bg-rose-50 border border-rose-200 border border-red-500/40 p-3.5 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Transaction ID:</span>
                  <span className="font-bold text-blue-700">{reversalTargetTxn.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Participant:</span>
                  <span className="font-bold text-blue-900 font-bold">{reversalTargetTxn.participantName} ({reversalTargetTxn.participantId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Stall:</span>
                  <span className="font-extrabold text-slate-900">{reversalTargetTxn.stallName}</span>
                </div>
                <div className="flex justify-between border-t border-red-500/30 pt-1.5 mt-1">
                  <span className="text-rose-900 font-bold">Amount to Restore:</span>
                  <span className="text-emerald-800 font-extrabold font-black text-sm">+₹{reversalTargetTxn.amount}.00</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-700 font-sans leading-relaxed">
                Reversing this claim will <strong>restore ₹{reversalTargetTxn.amount}.00</strong> to the participant&apos;s available refreshment token balance. The transaction record will be preserved and flagged as <code>REVERSED</code> for auditing.
              </div>

              <div>
                <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">Reason for Reversal *</label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Duplicate punch / Participant cancelled order"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-red-600/30"
                >
                  Confirm Reversal (+₹{reversalTargetTxn.amount})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Manual Refreshment Balance Adjustment ───────────────────── */}
      {adjustBalanceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-purple-500/50 max-w-md w-full p-6 shadow-2xl space-y-4 text-xs font-sans text-slate-900 font-bold">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="text-blue-600" size={18} />
                MANUAL BALANCE ADJUSTMENT
              </h3>
              <button
                onClick={() => setAdjustBalanceModalOpen(false)}
                className="text-slate-600 hover:text-blue-700 font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBalanceAdjustment} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">
                  Participant ID / Reg No / Email *
                </label>
                <input
                  type="text"
                  value={adjustTargetParticipantId}
                  onChange={(e) => setAdjustTargetParticipantId(e.target.value)}
                  placeholder="e.g. INT26-0001 or email..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">
                  Adjustment Amount (₹) *
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="e.g. 10 (or -10 to deduct)"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-emerald-800 font-extrabold font-black text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-[10px] text-slate-600 mt-0.5 block">
                  Positive values add to available balance; negative values reduce balance.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 text-[10px] font-bold uppercase mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Special volunteer allowance / Special event bonus"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustBalanceModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md shadow-purple-600/30"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: Staff / User Details & Role Assignment Inspector ───────────────────── */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-purple-500/40 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl font-mono text-xs text-slate-900 font-bold max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 border border-purple-500/40 text-blue-700 font-bold flex items-center justify-center text-sm shadow-md">
                  {inspectingUser.name 
                    ? inspectingUser.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase()
                    : "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-heading font-extrabold text-slate-900 tracking-wide">{inspectingUser.name}</h3>
                    <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase">
                      {inspectingUser.role}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5">ID: <code className="text-slate-700">{inspectingUser.id}</code></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="text-slate-600 hover:text-blue-700 text-sm font-bold cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* User Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold block">Email Address (Login ID)</span>
                <div className="text-slate-900 font-extrabold text-xs truncate select-all">{inspectingUser.email}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold block">Mobile / Phone</span>
                <div className="text-slate-900 font-extrabold text-xs">{inspectingUser.phone || "—"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold block">Department / Unit</span>
                <div className="text-slate-900 font-extrabold text-xs">{inspectingUser.department || "Computer Science"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold block">Login Passcode</span>
                <div className="text-emerald-800 font-extrabold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                  {inspectingUser.password || "staff123"}
                </div>
              </div>
            </div>

            {/* Interactive Role Assignment Checkboxes */}
            <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-purple-300">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">
                  Granted System Roles (Assign Roles)
                </span>
                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                  {((Array.isArray(inspectingUser.roles) && inspectingUser.roles.length > 0) ? inspectingUser.roles : [inspectingUser.role || "coordinator"]).length} Roles Active
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Click any role to grant or revoke it. When this staff member logs in with their email and passcode, they can switch between these assigned roles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { role: "admin" as const, label: "🚀 Operations Admin", desc: "Full host console" },
                  { role: "coordinator" as const, label: "🎯 Event Coordinator", desc: "Event leads & candidate attendance" },
                  { role: "judge" as const, label: "⚖️ Judge Evaluator", desc: "Scoring & criteria points" },
                  { role: "volunteer" as const, label: "🦺 Host Student Volunteer", desc: "Organizing Dept Student Crew" },
                  { role: "stall_operator" as const, label: "☕ Stall Operator", desc: "Refreshments & food tokens" },
                  { role: "student" as const, label: "🎓 Student Delegate", desc: "Participant dashboard" }
                ].map(item => {
                  const userRoles = Array.isArray(inspectingUser.roles) && inspectingUser.roles.length > 0 
                    ? inspectingUser.roles 
                    : [inspectingUser.role || "coordinator"];
                  const isChecked = userRoles.includes(item.role);

                  return (
                    <div
                      key={item.role}
                      onClick={() => handleToggleRoleForInspectingUser(item.role)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
                        isChecked
                          ? "bg-blue-600 border-2 border-blue-600 text-white shadow-sm font-extrabold"
                          : "bg-slate-50 border border-slate-300 text-slate-900 hover:border-blue-400 font-bold"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? "bg-blue-600 border-purple-400 text-white" : "border-slate-300 bg-slate-50"
                      }`}>
                        {isChecked && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs block truncate">{item.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duty details if volunteer */}
            {inspectingUser.volunteerDuty && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">Assigned Volunteer Duty</span>
                <div className="text-slate-700">Station: <strong className="text-slate-900 font-extrabold">{inspectingUser.volunteerDuty.station}</strong></div>
                {inspectingUser.volunteerDuty.venueName && <div className="text-slate-700">Venue: <strong className="text-slate-900 font-extrabold">{inspectingUser.volunteerDuty.venueName}</strong></div>}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const targetId = inspectingUser.id;
                  setInspectingUser(null);
                  handleDeleteStaffUser(targetId);
                }}
                className="bg-rose-50 border border-rose-200 hover:bg-red-900 text-rose-900 font-bold border border-red-500/30 font-bold px-3.5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                title="Delete this profile"
              >
                <Trash size={13} />
                <span>Delete Profile</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingUser;
                    setInspectingUser(null);
                    setEditingStaffId(target.id);
                    setStaffFormData({
                      name: target.name,
                      email: target.email,
                      password: target.password || "staff123",
                      role: target.role,
                      department: target.department || "Computer Science",
                      phone: target.phone || ""
                    });
                    const formElem = document.getElementById("staff-form-section");
                    formElem?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  <span>Edit Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingUser(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-purple-600/30"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



